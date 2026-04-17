function toStripeMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

function getStripeClient() {
  return null;
}

/*
Future activation steps:

1. Install Stripe:
   npm install stripe

2. Uncomment and configure:

const Stripe = require('stripe');
const { getRequiredEnv } = require('../../config/env');

const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'));

function getStripeClient() {
  return stripe;
}

3. Use STRIPE_WEBHOOK_SECRET for webhook signature verification when webhook support is enabled.
*/

module.exports = {
  getStripeClient,
  toStripeMinorUnits
};
