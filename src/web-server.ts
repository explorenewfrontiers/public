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
    const { items } = req.body as { items: Array<{ priceId: string; quantity: number }> };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item) => ({
        price: item.priceId,
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.DOMAIN || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN || 'http://localhost:3000'}/cancel`,
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

const port = parseInt(process.env.WEB_PORT || '3000', 10);
app.listen(port, () => {
  console.log(`Product catalog website listening on port ${port}`);
});
