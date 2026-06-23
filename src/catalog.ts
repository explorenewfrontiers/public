import XLSX from 'xlsx';
import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

export interface ProductRow {
  id?: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  image_url?: string;
  category?: string;
  sku?: string;
  metadata?: Record<string, string>;
}

export async function parseProductCatalog(filePath: string): Promise<ProductRow[]> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

  return data.map((row) => ({
    id: (row['ID'] || row['id'] || '') as string,
    name: (row['Name'] || row['name'] || 'Unnamed Product') as string,
    description: (row['Description'] || row['description'] || '') as string,
    price: parseFloat((row['Price'] || row['price'] || '0') as string),
    currency: ((row['Currency'] || row['currency'] || 'usd') as string).toLowerCase(),
    image_url: (row['Image URL'] || row['image_url'] || '') as string,
    category: (row['Category'] || row['category'] || '') as string,
    sku: (row['SKU'] || row['sku'] || '') as string,
    metadata: {
      category: (row['Category'] || row['category'] || '') as string,
      sku: (row['SKU'] || row['sku'] || '') as string,
    },
  }));
}

export async function syncProductsToStripe(
  products: ProductRow[],
  stripe: Stripe
): Promise<{ created: Stripe.Product[]; updated: Stripe.Product[] }> {
  const created: Stripe.Product[] = [];
  const updated: Stripe.Product[] = [];

  for (const product of products) {
    try {
      let stripeProduct: Stripe.Product;

      // Try to find existing product by ID or name
      if (product.id) {
        try {
          stripeProduct = await stripe.products.retrieve(product.id);
          // Update existing product
          stripeProduct = await stripe.products.update(product.id, {
            name: product.name,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : undefined,
            metadata: product.metadata,
          });
          updated.push(stripeProduct);
          console.log(`Updated product: ${product.name}`);
        } catch (error) {
          // Product doesn't exist, create new one
          throw error;
        }
      } else {
        // Create new product
        stripeProduct = await stripe.products.create({
          name: product.name,
          description: product.description || undefined,
          images: product.image_url ? [product.image_url] : undefined,
          metadata: product.metadata,
        });
        created.push(stripeProduct);

        // Create a price for this product
        await stripe.prices.create({
          product: stripeProduct.id,
          unit_amount: Math.round(product.price * 100), // Convert to cents
          currency: product.currency || 'usd',
          metadata: {
            sku: product.sku || '',
          },
        });

        console.log(`Created product: ${product.name}`);
      }
    } catch (error) {
      console.error(`Error processing product ${product.name}:`, error);
      // Create new product if update failed
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description || undefined,
        images: product.image_url ? [product.image_url] : undefined,
        metadata: product.metadata,
      });
      created.push(stripeProduct);

      // Create a price for this product
      await stripe.prices.create({
        product: stripeProduct.id,
        unit_amount: Math.round(product.price * 100),
        currency: product.currency || 'usd',
        metadata: {
          sku: product.sku || '',
        },
      });
    }
  }

  return { created, updated };
}

export async function getStripeProducts(stripe: Stripe, limit = 100): Promise<Stripe.Product[]> {
  const products = await stripe.products.list({ limit, active: true });
  return products.data;
}

export async function getProductWithPrices(
  stripe: Stripe,
  productId: string
): Promise<{ product: Stripe.Product; prices: Stripe.Price[] }> {
  const product = await stripe.products.retrieve(productId);
  const prices = await stripe.prices.list({ product: productId, active: true });

  return {
    product,
    prices: prices.data,
  };
}
