import Stripe from 'stripe';
import dotenv from 'dotenv';
import { createConnectApp, type ConnectStripeClient } from './connect-app.js';

// Load environment variables from .env file
dotenv.config();

// ============================================================================
// STRIPE CLIENT INITIALIZATION
// ============================================================================
// Initialize the Stripe client with the secret API key.
// The secret key is used for server-side operations and should never be
// exposed to the client. Store this in your environment variables.
// TODO: Add your Stripe secret API key to the .env file
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  throw new Error(
    'STRIPE_SECRET_KEY is not set. Please add it to your .env file. ' +
    'Get your key from https://dashboard.stripe.com/apikeys'
  );
}

// Create the Stripe client - this is used for all Stripe API requests
const stripeClient = new Stripe(STRIPE_SECRET_KEY);

// ============================================================================
// WEBHOOK SECRET
// ============================================================================
// The webhook secret is used to verify that webhooks are coming from Stripe.
// You can find this in the Stripe Dashboard under Developers > Webhooks
// TODO: Add your webhook signing secret to the .env file
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const app = createConnectApp({
  stripeClient: stripeClient as unknown as ConnectStripeClient,
  webhookSecret: WEBHOOK_SECRET,
});

// ============================================================================
// START SERVER
// ============================================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Webhook ready at /webhook and /webhook/thin');
});
