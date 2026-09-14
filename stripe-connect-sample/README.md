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

### 4. Run the server

The Express app lives at `server.ts` in this directory (not `src/server.ts`). `package.json` scripts and `tsconfig.json` still point at `src/`:

| Command | What actually happens |
|---|---|
| `npm run build` | `tsc` with `"include": ["src/**/*"]` — no files compile; `dist/server.js` is not produced. |
| `npm start` | `node dist/server.js` — fails until a matching `dist/` exists. |
| `npm run dev` | `ts-node src/server.ts` — file does not exist. |

Working local command (loads `.env` via `dotenv` in `server.ts`):

```bash
npx ts-node --compiler-options '{"module":"ES2020","moduleResolution":"node"}' server.ts
```

The process listens on `PORT` (default `3000`) and logs webhook paths `/webhook` and `/webhook/thin`.

Until `tsconfig.json` `rootDir`/`include` and the npm scripts are pointed at `server.ts`, treat `npm run build` / `npm start` / `npm run dev` as broken. The Docker image and Heroku `Procfile` (`npm run build && npm start`) have the same layout assumption.

## API Endpoints

### Account Management

**POST /api/accounts**
Create a new Stripe Connect account (V2). Required body: `displayName`, `contactEmail`. Response: `{ success, accountId, displayName }`.
```json
{
  "displayName": "Business Name",
  "contactEmail": "owner@example.com"
}
```

**POST /api/onboarding/link**
Generate an onboarding link for KYC. Returns `{ success, url }`.
```json
{
  "accountId": "acct_1234567890"
}
```

Redirects use `DOMAIN` (default `http://localhost:3000`):

- refresh: `${DOMAIN}/onboarding?accountId=...`
- return: `${DOMAIN}/dashboard?accountId=...`

There are no `/onboarding` or `/dashboard` routes (only `GET /` and static `public/`). After onboarding, those URLs 404 unless you add pages. Checkout success/cancel similarly target `/success`, `/storefront`, and `/subscription-success` — only `storefront.html` exists (`/storefront` without `.html` is not served by `express.static`).

**GET /api/accounts/:accountId/status**
Retrieves the V2 account with `configuration.merchant`, `configuration.customer`, and `requirements`. Response includes `onboardingComplete` (true unless requirements summary status is `currently_due` or `past_due`), `readyToProcessPayments` (`card_payments.status === "active"`), `requirementsStatus`, `currentlyDueRequirements`, and `pastDueRequirements`.

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
Create a Checkout Session on the connected account (`stripeAccount: accountId`). Returns `{ success, sessionId }` — not a hosted URL. The storefront is expected to call Stripe.js `redirectToCheckout({ sessionId })`.
```json
{
  "accountId": "acct_1234567890",
  "priceId": "price_1234567890",
  "quantity": 1
}
```

Required: `accountId`, `priceId`. `GET /api/products/:accountId` returns `id`, `name`, `description`, `price` (unit amount), and `currency`. It does **not** return `priceId` or `default_price`. The storefront currently sends `product.default_price`, so Buy Now will fail unless you pass a real `price_...` ID from product creation (`default_price` on the create response).

### Subscriptions

**POST /api/subscriptions**
Create a subscription Checkout Session (`mode: "subscription"`, `customer_account: accountId`). Returns `{ success, sessionId }`.
```json
{
  "accountId": "acct_1234567890",
  "priceId": "price_1234567890"
}
```

The admin UI then POSTs to `/get-session` to resolve a hosted URL. **That route is not implemented** in `server.ts`. Use the `sessionId` with Stripe.js, or add a route that retrieves the session.

**POST /api/billing-portal**
Create a billing portal session. Returns `{ success, url }` — the UI redirects to `url`.
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
4. Select the events the handler switches on:
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Copy the signing secret and add to `.env` as `WEBHOOK_SECRET`

Both `/webhook` and `/webhook/thin` verify with the same `WEBHOOK_SECRET`. Two Dashboard endpoints have two secrets; this sample only reads one env var.

`bodyParser.json()` is registered globally before the webhook routes. Stripe signature verification needs the raw body. If verification fails even with a correct secret, this middleware order is the first thing to check. The route-level `express.raw({ type: 'application/json' })` does not undo a body that was already parsed.

### V2 Thin Webhooks (for account requirements)

1. Add another endpoint: `https://yourdomain.com/webhook/thin`
2. Select "Connected accounts" in "Events from"
3. Choose "Thin" in "Payload style"
4. Select the V2 events the handler switches on:
   - `v2.core.account[requirements].updated`
   - `v2.core.account[configuration.merchant].capability_status_updated`

The handler does not have a case for `v2.core.account[configuration.customer].capability_status_updated` (it logs `Unhandled V2 event type`). After verifying the thin event, the code fetches the full object with `stripeClient.v2.core.events.retrieve(thinEvent.id)`.

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
├── server.ts                 # All API endpoints (source of truth)
├── public/
│   ├── index.html            # Admin dashboard
│   └── storefront.html       # Customer storefront
├── package.json              # Scripts still reference src/ and dist/
├── tsconfig.json             # include/rootDir are src/**
├── Dockerfile                # Multi-stage build copies src/ (missing)
├── docker-compose.yml
├── Procfile                  # Heroku: npm run build && npm start
├── vercel.json               # Stub; no api/ serverless functions exist
├── .github/workflows/deploy.yml  # Nested; GitHub Actions does not load this
├── .env.example
└── README.md
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

`POST /api/checkout` sets:

```typescript
application_fee_amount: Math.round(
  (quantity || 1) * 0.1
)
```

That is `0.1` **cents** per item, not 10% of the price. `Math.round(0.1)` is `0`, so a quantity of `1` sends a `$0.00` application fee. Comments and older docs described a 10% cut. To take 10% of the charge, multiply the price unit amount by quantity, then take 10% of that result.

### Account creation defaults

`POST /api/accounts` hardcodes:

- `identity.country: "us"`
- `dashboard: "full"`
- `defaults.responsibilities.fees_collector` / `losses_collector`: `"stripe"`
- `configuration.merchant.capabilities.card_payments.requested: true`
- empty `configuration.customer`

There is no request field to change country or capabilities.

### Product list limit

`GET /api/products/:accountId` lists at most **20** active products and expands `data.default_price`, but the JSON response only exposes `price` / `currency` (not the price ID).

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

Edit `POST /api/checkout` in `server.ts`. Using `quantity * 0.15` still produces a fraction of a cent, not 15% of the price. Base the fee on `unit_amount * quantity`.

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
- The process throws at import time if this var is missing (`server.ts` uses `dotenv`)

### `npm run build` / `npm start` / `npm run dev` fail
- Source file is `server.ts`; scripts and `tsconfig.json` expect `src/server.ts`
- Use the `ts-node` command in [Build and Run](#4-run-the-server)

### "Webhook signature verification failed"
- Confirm `WEBHOOK_SECRET` matches the endpoint you are hitting
- Both webhook routes share one secret
- Global `bodyParser.json()` may have already parsed the body — Stripe needs the raw payload
- Use Stripe CLI for local testing

### "Account not ready for payments"
- User needs to complete onboarding at the link
- `readyToProcessPayments` is true only when `configuration.merchant.capabilities.card_payments.status === "active"`

### Checkout not redirecting
- `storefront.html` hardcodes `pk_test_51234567890` — replace it; `STRIPE_PUBLISHABLE_KEY` is not served to the browser
- List endpoint does not return a price ID; Buy Now sends `product.default_price`, which is undefined
- Checkout API returns `sessionId`, not a URL
- Subscription UI calls missing `/get-session`

### Docker / CI will not start
- `Dockerfile` `COPY src ./src` fails because `src/` is absent
- Nested `.github/workflows/deploy.yml` is not a repository workflow GitHub will run
- `vercel.json` points at `api/**/*.ts` and `outputDirectory: dist`; this is still an Express app

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
