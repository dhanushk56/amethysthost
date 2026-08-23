const express = require('express');
const stripe = require('../lib/stripe');
const db = require('../db');
const plans = require('../plans');
const pterodactyl = require('../lib/pterodactyl');

const router = express.Router();

// IMPORTANT: this route must receive the raw request body (see server/index.js),
// not JSON — Stripe signs the raw bytes and verification fails otherwise.
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        break; // ignore anything we don't act on
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler failed:', err);
    // Still 200 so Stripe doesn't hammer retries for a provisioning bug on our end;
    // the failure is logged for manual follow-up instead.
    res.json({ received: true, handledWithError: true });
  }
});

async function handleCheckoutCompleted(session) {
  const userId = Number(session.metadata.userId);
  const planKey = session.metadata.planKey;
  const plan = plans[planKey];
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !plan) return;

  if (session.customer && !user.stripe_customer_id) {
    db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(session.customer, userId);
  }

  db.prepare(
    "UPDATE orders SET status = 'paid', stripe_subscription_id = ? WHERE stripe_session_id = ?"
  ).run(session.subscription, session.id);

  const panelUser = await pterodactyl.createOrGetPanelUser({ email: user.email, name: user.name });
  const server = await pterodactyl.createServer({
    panelUserId: panelUser.id,
    plan,
    serverName: `${user.name}'s ${plan.name}`,
  });

  db.prepare(
    `INSERT INTO servers (user_id, plan_key, pterodactyl_server_id, pterodactyl_identifier, status, stripe_subscription_id)
     VALUES (?, ?, ?, ?, 'active', ?)`
  ).run(userId, planKey, server.id, server.identifier, session.subscription);
}

async function handleSubscriptionCancelled(subscription) {
  const server = db
    .prepare('SELECT * FROM servers WHERE stripe_subscription_id = ?')
    .get(subscription.id);
  if (!server) return;
  await pterodactyl.suspendServer(server.pterodactyl_server_id);
  db.prepare("UPDATE servers SET status = 'suspended' WHERE id = ?").run(server.id);
}

async function handlePaymentFailed(invoice) {
  if (!invoice.subscription) return;
  const server = db
    .prepare('SELECT * FROM servers WHERE stripe_subscription_id = ?')
    .get(invoice.subscription);
  if (!server) return;
  await pterodactyl.suspendServer(server.pterodactyl_server_id);
  db.prepare("UPDATE servers SET status = 'suspended' WHERE id = ?").run(server.id);
}

module.exports = router;
