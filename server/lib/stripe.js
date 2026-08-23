const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[warn] STRIPE_SECRET_KEY is not set — checkout routes will fail until you add it to .env');
}

module.exports = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
