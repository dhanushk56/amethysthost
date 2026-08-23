const express = require('express');
const stripe = require('../lib/stripe');
const plans = require('../plans');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3000';

router.post('/', requireAuth, async (req, res) => {
  const { planKey } = req.body;
  const plan = plans[planKey];

  if (!plan) return res.status(400).json({ error: 'Unknown plan' });
  if (plan.priceCents === 0) return res.status(400).json({ error: 'Use /api/servers/deploy-free for the free plan' });
  if (!plan.stripePriceId) return res.status(500).json({ error: `Plan "${planKey}" has no Stripe price configured` });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: user.stripe_customer_id || undefined,
    customer_email: user.stripe_customer_id ? undefined : user.email,
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${PUBLIC_URL}/dashboard.html?checkout=success`,
    cancel_url: `${PUBLIC_URL}/pricing.html?checkout=cancelled`,
    metadata: { userId: String(user.id), planKey: plan.key },
    subscription_data: { metadata: { userId: String(user.id), planKey: plan.key } },
  });

  db.prepare(
    'INSERT INTO orders (user_id, plan_key, stripe_session_id, status) VALUES (?, ?, ?, ?)'
  ).run(user.id, plan.key, session.id, 'pending');

  res.json({ url: session.url });
});

module.exports = router;
