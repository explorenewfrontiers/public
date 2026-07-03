# Stripe Connect Integration Sample

A comprehensive, thoroughly commented sample application demonstrating Stripe Connect integration with detailed explanations of each step.

This sample includes:
- Creating and onboarding connected accounts (V2 API)
- Product management
- Customer checkout (direct charges with application fees)
- Subscription billing
- Webhook handling (both standard and V2 thin events)
- Billing portal for subscription management

**All code includes detailed comments explaining:**
- What each section does
- Why we're doing it
- How it works with Stripe Connect
- What values you need to provide

## Features

### 1. Account Creation & Onboarding
- Create new Stripe Connect accounts using the V2 API
- Generate onboarding links for KYC verification
- Check account status and requirements
- Track readiness for payment processing

### 2. Product Management
- Create products on connected accounts
- List products from connected accounts
- Support multiple currencies

### 3. Payment Processing
- Direct charges with application fees
- Stripe Checkout for secure payment handling
- Application fee taken per transaction (customizable)

### 4. Subscriptions & Recurring Billing
- Create subscription checkouts
- Billing Portal for customer self-service
- Manage subscription changes, upgrades, downgrades

### 5. Webhooks
- Listen for subscription events
- Handle payment notifications
- Track account requirement changes (V2 thin events)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Then edit `.env` and add your Stripe API keys:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
WEBHOOK_SECRET=whsec_YOUR_SECRET
DOMAIN=http://localhost:3000
```

### 3. Get Your Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret Key** (sk_test_...)
3. Copy your **Publishable Key** (pk_test_...)
4. Add them to your `.env` file

### 4. Build and Run

```bash
# Build TypeScript
npm run build

# Start the server
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Account Management

**POST /api/accounts**
Create a new Stripe Connect account
```json
{
  "displayName": "Business Name",
  "contactEmail": "owner@example.com"
}
```

**POST /api/onboarding/link**
Generate an onboarding link for KYC
```json
{
  "accountId": "acct_1234567890"
}
```

**GET /api/accounts/:accountId/status**
Check account onboarding status and requirements

### Products

**POST /api/products**
Create a product on a connected account
```json
{
  "accountId": "acct_1234567890",
  "name": "Premium Coffee",
  "description": "Single origin espresso",
  "priceInCents": 999,
  "currency": "usd"
}
```

**GET /api/products/:accountId**
List all products for a connected account

### Checkout & Payments

**POST /api/checkout**
Create a checkout session for a one-time payment
```json
{
  "accountId": "acct_1234567890",
  "priceId": "price_1234567890",
  "quantity": 1
}
```

### Subscriptions

**POST /api/subscriptions**
Create a subscription checkout session
```json
{
  "accountId": "acct_1234567890",
  "priceId": "price_1234567890"
}
```

**POST /api/billing-portal**
Create a billing portal session for subscription management
```json
{
  "accountId": "acct_1234567890"
}
```

## Webhook Setup

### Standard Webhooks (for subscriptions)

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "+ Add endpoint"
3. Enter URL: `https://yourdomain.com/webhook`
4. Select events:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the signing secret and add to `.env` as `WEBHOOK_SECRET`

### V2 Thin Webhooks (for account requirements)

1. Add another endpoint: `https://yourdomain.com/webhook/thin`
2. Select "Connected accounts" in "Events from"
3. Choose "Thin" in "Payload style"
4. Select V2 events:
   - `v2.account[requirements].updated`
   - `v2.account[configuration.merchant].capability_status_updated`
   - `v2.account[configuration.customer].capability_status_updated`

### Local Testing with Stripe CLI

```bash
# Listen for standard events
stripe listen --events customer.subscription.updated,customer.subscription.deleted,invoice.payment_succeeded --forward-to localhost:3000/webhook

# Listen for thin events
stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated' --forward-thin-to localhost:3000/webhook/thin
```

## Project Structure

```
stripe-connect-sample/
├── src/
│   └── server.ts          # Main server with all API endpoints
├── public/
│   ├── index.html         # Admin dashboard and account management UI
│   └── storefront.html    # Customer-facing product listing and checkout
├── package.json           # Dependencies
├── .env.example           # Environment variables template
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Code Comments

Every section of code includes detailed comments explaining:

1. **What** - What the code does
2. **Why** - Why it's necessary for the integration
3. **How** - How it works with Stripe Connect
4. **TODO** - Where to add database operations or custom logic

Look for these sections:

```typescript
// ================================================================
// STRIPE CLIENT INITIALIZATION
// ================================================================
// Initialize the Stripe client with the secret API key...
```

## Important Concepts

### Stripe Account IDs in URLs

⚠️ **Important**: This sample uses Stripe account IDs in URLs for simplicity, but this is NOT recommended for production.

**In production, you should:**
1. Create merchant profiles with proper database IDs
2. Map those IDs to Stripe account IDs server-side
3. Use merchant-friendly URLs like `/shops/coffee-shop-nyc`
4. Never expose Stripe account IDs to clients

### Application Fees

This sample takes a 10% application fee on each transaction:

```typescript
application_fee_amount: Math.round(
  (quantity || 1) * 0.1 // 10% fee
)
```

Adjust this percentage as needed in the checkout endpoint.

### Stripe Account vs Stripe Customer

- **Stripe Account (V2)**: A connected merchant account (e.g., seller)
- **Stripe Customer**: A buyer/subscriber (V1 API)

In V2 API, subscriptions use `customer_account` instead of `customer`:
```typescript
customer_account: accountId  // Not customer: accountId
```

## Testing

### Create a Test Account

1. Start the server: `npm run dev`
2. Go to http://localhost:3000
3. Fill in "Create Account" form (use any name/email)
4. Copy the Account ID
5. Paste it into "Onboard Account" form
6. Click "Check Status"
7. Complete onboarding at the Stripe link

### Create Test Products

1. Paste the Account ID in "Create Products" form
2. Add product details and price
3. Create product

### Test Checkout

1. Open the storefront with Account ID
2. Click "Buy Now" on a product
3. Use Stripe test card: 4242 4242 4242 4242

**Test card details:**
- Card number: 4242 4242 4242 4242
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)

### Verify Webhooks

Check that webhooks are received:

```bash
stripe logs tail
```

Or in the Stripe Dashboard > Developers > Webhooks, click the endpoint and see recent events.

## Customization

### Change Application Fee

Edit the fee in `server.ts`:
```typescript
application_fee_amount: Math.round(
  (quantity || 1) * 0.15  // 15% fee instead of 10%
)
```

### Change Currency

The sample uses USD by default. Add support for other currencies in the UI and API.

### Add Database

Add these TODO sections to your database:

```typescript
// TODO: In a production application, store the mapping...
await db.saveUserStripeAccount(userId, account.id);
```

### Customize Styling

Edit `public/index.html` and `public/storefront.html` CSS sections to match your brand.

## Common Issues

### "STRIPE_SECRET_KEY is not set"
- Copy `.env.example` to `.env`
- Add your keys from https://dashboard.stripe.com/apikeys

### "Webhook signature verification failed"
- Make sure `WEBHOOK_SECRET` is correct
- Use Stripe CLI for local testing
- For production, ensure SSL/TLS is enabled

### "Account not ready for payments"
- User needs to complete onboarding at the link
- Check requirements in the account status section

### Checkout not redirecting
- Ensure `STRIPE_PUBLISHABLE_KEY` is correct
- Check browser console for errors
- Make sure domain matches Stripe URL settings

## Learning Resources

- [Stripe Connect Docs](https://docs.stripe.com/connect)
- [V2 API Reference](https://docs.stripe.com/api/v2)
- [Webhook Events](https://docs.stripe.com/webhooks)
- [Stripe CLI](https://docs.stripe.com/cli)

## Next Steps

1. **Add Database**: Store accounts, products, and customers
2. **User Authentication**: Add login/signup flow
3. **Dashboard**: Create merchant dashboard with sales data
4. **Analytics**: Track revenue, transaction history
5. **Custom Branding**: Add merchant logos and branding to storefront
6. **Inventory Management**: Track product stock
7. **Notifications**: Send emails for orders and subscription changes

## Support

For issues with the Stripe integration, check:
1. [Stripe API Docs](https://docs.stripe.com)
2. [GitHub Issues](https://github.com/stripe/stripe-node/issues)
3. [Stripe Support](https://support.stripe.com)

## License

MIT
