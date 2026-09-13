import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import { getStripeProducts, getProductWithPrices } from './catalog.js';

const app = express();
const stripe = new Stripe(process.env.STRIPE_API_KEY || '');

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// API Routes
app.get('/api/products', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const products = await getStripeProducts(stripe, limit);

    res.json({
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        images: p.images,
        metadata: p.metadata,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

app.get('/api/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const result = await getProductWithPrices(stripe, productId);

    res.json({
      product: {
        id: result.product.id,
        name: result.product.name,
        description: result.product.description,
        images: result.product.images,
        metadata: result.product.metadata,
      },
      prices: result.prices.map((p) => ({
        id: p.id,
        unit_amount: p.unit_amount,
        currency: p.currency,
        recurring: p.recurring,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Create checkout session
app.post('/api/checkout', async (req, res) => {
  try {
    const { items } = req.body as { items?: Array<{ priceId?: string; quantity?: number }> };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'items are required' });
      return;
    }

    const lineItems = items.map((item, index) => {
      const quantity = Number(item.quantity);
      if (!item.priceId || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error(`Each item needs a priceId and a positive integer quantity (index ${index})`);
      }
      return {
        price: item.priceId,
        quantity,
      };
    });

    const domain = process.env.DOMAIN || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${domain}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/cancel`,
    });

    if (!session.url) {
      res.status(500).json({ error: 'Checkout session did not return a redirect URL' });
      return;
    }

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('priceId') || message.includes('items') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

const port = parseInt(process.env.WEB_PORT || '3000', 10);
app.listen(port, () => {
  console.log(`Product catalog website listening on port ${port}`);
});
