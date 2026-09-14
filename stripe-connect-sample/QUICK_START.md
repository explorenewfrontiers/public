# Quick Start Guide (5 minutes)

Get the Stripe Connect sample running in 5 minutes.

## Step 1: Get Your Stripe API Keys (2 minutes)

1. Go to https://dashboard.stripe.com/apikeys
2. You'll see two keys:
   - **Secret Key** (starts with `sk_test_`)
   - **Publishable Key** (starts with `pk_test_`)
3. Copy both keys - you'll need them next

## Step 2: Set Up Environment Variables (1 minute)

```bash
# In the stripe-connect-sample directory
cp .env.example .env
```

Now edit `.env` and paste your keys:

```env
STRIPE_SECRET_KEY=sk_test_paste_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_paste_your_key_here
WEBHOOK_SECRET=whsec_test_any_value_for_now
DOMAIN=http://localhost:3000
PORT=3000
```

## Step 3: Install and Run (2 minutes)

```bash
# Install dependencies
npm install

# Source is server.ts (not src/server.ts). npm run build / npm start / npm run
# dev currently target a missing src/ tree — do not use them yet.
npx ts-node --compiler-options '{"module":"ES2020","moduleResolution":"node"}' server.ts
```

Visit: http://localhost:3000

`server.ts` loads `.env` via `dotenv`. The process exits immediately if `STRIPE_SECRET_KEY` is missing.

## Step 4: Test the Flow (5 minutes)

### 1. Create an Account
- Fill in "Step 1: Create Account"
- Enter any name and email
- Click "Create Account"
- Copy the Account ID that appears

### 2. Check Status
- Go to "Step 2: Onboard Account"
- Paste the Account ID
- Click "Check Status & Get Onboarding Link"
- Click the blue "Complete Onboarding" button
- Fill out the Stripe onboarding form (use test data)

### 3. Create a Product
- Go to "Step 3: Create Products"
- Paste your Account ID
- Enter product details (name, price, etc.)
- Click "Create Product"

### 4. View Storefront
- Go to "Step 4: View Storefront"
- Paste your Account ID
- Click "Open Storefront"
- See your product displayed

### 5. Make a Test Purchase
- Click "Buy Now" on the product
- Use Stripe test card: `4242 4242 4242 4242`
- Any future expiry date and 3-digit CVC
- Complete the purchase

## What Just Happened?

1. **Created a Stripe Connect Account** - A seller account that can accept payments
2. **Completed Onboarding** - KYC verification (with test data)
3. **Created Products** - Items that can be purchased
4. **Processed a Payment** - Customer paid the seller (with platform fee)

The funds went to the connected account, and the platform kept the application fee.

## Next: Set Up Webhooks (Optional)

To test webhook handling:

```bash
# Install Stripe CLI
# https://docs.stripe.com/cli/install

# Listen for webhook events
stripe listen --events customer.subscription.updated,invoice.payment_succeeded --forward-to localhost:3000/webhook
```

## Understand the Code

All code has detailed comments explaining:
- **What** each section does
- **Why** it's necessary
- **How** it integrates with Stripe
- **TODO** sections for customization

Start with these files:
1. `server.ts` - All API endpoints with detailed comments
2. `public/index.html` - Admin UI with form examples
3. `public/storefront.html` - Customer UI with checkout

Known UI gaps (verified against the handlers):
- Storefront Buy Now sends `product.default_price`, but `GET /api/products/:accountId` does not return a price ID
- Storefront Stripe.js key is hardcoded (`pk_test_51234567890`), not `STRIPE_PUBLISHABLE_KEY`
- Subscription form POSTs `/get-session`, which is not implemented — billing portal (`url`) works

## Common Questions

**Q: Where do I find the webhook secret?**
A: Go to Dashboard > Developers > Webhooks. Create an endpoint first, then copy its signing secret.

**Q: Can I use live keys?**
A: Yes, after testing with test keys, you can switch to live keys. But test first!

**Q: How do I charge a specific percentage?**
A: The live checkout formula is `Math.round((quantity || 1) * 0.1)` cents (about `$0.00` per item), not 10% of price. To take 10% of the charge, compute `Math.round(unitAmount * quantity * 0.10)` in `POST /api/checkout`.

**Q: How do I store accounts in a database?**
A: Look for TODO comments in `server.ts` — they show where to add database calls.

**Q: Can I customize the styling?**
A: Yes! Edit the `<style>` sections in the HTML files.

## Need Help?

1. Check the detailed comments in the code
2. Read the full `README.md` for comprehensive docs
3. Visit [Stripe Docs](https://docs.stripe.com)
4. Check the server logs for error messages

## What's Next?

Once comfortable with the sample:

1. **Add a Database** - Store accounts and customers
2. **Add Authentication** - User login/signup
3. **Customize UI** - Match your brand
4. **Add More Features** - Refunds, disputes, etc.

Happy coding! 🎉
