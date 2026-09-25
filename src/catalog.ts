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

function cellString(value: unknown): string {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

function cellNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const parsed = parseFloat(cellString(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeProductRow(row: Record<string, unknown>): ProductRow {
  const id = cellString(row['ID'] ?? row['id']);
  const name = cellString(row['Name'] ?? row['name']) || 'Unnamed Product';
  const description = cellString(row['Description'] ?? row['description']);
  const price = cellNumber(row['Price'] ?? row['price'] ?? 0);
  const currency = (cellString(row['Currency'] ?? row['currency']) || 'usd').toLowerCase();
  const image_url = cellString(row['Image URL'] ?? row['image_url']);
  const category = cellString(row['Category'] ?? row['category']);
  const sku = cellString(row['SKU'] ?? row['sku']);

  return {
    id: id || undefined,
    name,
    description,
    price,
    currency,
    image_url,
    category,
    sku,
    metadata: {
      category,
      sku,
    },
  };
}

export async function parseProductCatalog(filePath: string): Promise<ProductRow[]> {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

  return data.map((row) => normalizeProductRow(row));
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
