# ForgeHost — Minecraft Hosting Platform (Node.js)

A working clone of a NetherHost-style site: marketing landing page, accounts,
Stripe billing, and **real** server provisioning via the Pterodactyl panel.

This is not a mockup — plug in real Pterodactyl and Stripe credentials and
clicking "Deploy Free Server" actually creates a container on your node.

## Stack

- **Backend:** Node.js, Express, better-sqlite3, JWT auth (httpOnly cookie)
- **Frontend:** plain HTML/CSS/JS (no build step) — easy to re-skin
- **Billing:** Stripe Checkout (subscriptions) + webhooks
- **Provisioning:** Pterodactyl Application API

## Why Pterodactyl

NetherHost's "NetherPanel" screenshot (console, file manager, live stats) is
the standard look of [Pterodactyl](https://pterodactyl.io/), which is what
almost every Minecraft host in this space actually runs. This project doesn't
reimplement a game-server daemon — that's a multi-month project on its own —
it assumes you already have (or will stand up) a Pterodactyl panel + at least
one Wings node, and this website becomes the storefront in front of it.
If you don't have a panel yet, install Pterodactyl first: https://pterodactyl.io/panel/getting_started.html

## Setup

```bash
npm install
cp .env.example .env
# fill in .env — see below
npm run dev
```

Visit `http://localhost:3000`.

### 1. Pterodactyl

1. In your panel admin, create an **Application API key** (Admin → API → Application API).
2. Find your **Nest ID** and **Egg ID** for the Minecraft egg you want to use (Admin → Nests).
3. Find your **Location ID** (Admin → Locations) and make sure it has at least one node with free allocations (IP:port pairs) — `PTERO_LOCATION_ID_NA` in `.env`.
4. Set `PTERODACTYL_PANEL_URL` and `PTERODACTYL_APP_API_KEY` in `.env`.

`server/lib/pterodactyl.js` handles the rest: creating a panel account for
each website user on first purchase, finding a free allocation, and creating
the server with the right RAM/disk/CPU limits from `server/plans.js`.

### 2. Stripe

1. Create two recurring Prices in the Stripe dashboard (e.g. $5.99/mo and
   $11.99/mo) and put their Price IDs in `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`.
2. Add your secret key to `STRIPE_SECRET_KEY`.
3. Run `stripe listen --forward-to localhost:3000/api/webhook` locally (Stripe CLI)
   and copy the printed webhook secret into `STRIPE_WEBHOOK_SECRET`. In production,
   add a webhook endpoint in the Stripe dashboard pointing at
   `https://yourdomain.com/api/webhook` listening for `checkout.session.completed`,
   `invoice.payment_failed`, and `customer.subscription.deleted`.

### 3. Edit pricing

Everything about plans — RAM, disk, CPU, price, which egg/nest/location it
provisions on — lives in one place: `server/plans.js`. Nothing else needs
touching to change specs or add a new tier.

## How provisioning actually works

- **Free plan:** `POST /api/servers/deploy-free` provisions immediately,
  no Stripe involved. Capped at one per account (`has_used_free_plan` in the
  `users` table) so it can't be farmed.
- **Paid plans:** `POST /api/checkout` creates a Stripe Checkout subscription
  session. Stripe's `checkout.session.completed` webhook is what actually
  triggers `pterodactyl.createServer(...)` — the server only gets created
  *after* payment is confirmed, not when the user clicks "buy."
- **Cancellations / failed payments:** the `customer.subscription.deleted`
  and `invoice.payment_failed` webhooks call `pterodactyl.suspendServer(...)`,
  which matches what the FAQ on the reference site promises (suspend, not
  delete, so the world is safe).
- The dashboard doesn't reimplement Pterodactyl's console/file manager — it
  links straight to `PTERODACTYL_PANEL_URL/server/{identifier}`, same as most
  real hosts do, so console output, backups, and file management stay in the
  panel you already trust.

## Project layout

```
server/
  index.js          Express app + route wiring
  db.js             SQLite schema (users, servers, orders)
  plans.js          Single source of truth for pricing/specs
  lib/
    pterodactyl.js  Application API client (create/suspend/delete servers)
    stripe.js       Stripe client
  middleware/auth.js
  routes/
    auth.js         register/login/logout/me
    plans.js        public GET /api/plans
    checkout.js      creates Stripe Checkout sessions
    webhook.js       Stripe webhook -> provisioning
    servers.js       list servers, free-plan deploy
public/
  index.html, pricing.html, login.html, register.html, dashboard.html
  css/style.css
  js/  boot-animation.js, plans.js, auth.js, dashboard.js
```

## Things to add before going to production

- Rate limiting on `/api/auth/*` and `/api/servers/deploy-free`
- Email verification (free-tier abuse is the main cost risk for any host)
- Swap SQLite for Postgres/MySQL once you need more than one app server
- A real logo/brand instead of the placeholder "ForgeHost" name and colors
- HTTPS + `secure` cookies in production (`NODE_ENV=production` already
  flips the cookie flag)
