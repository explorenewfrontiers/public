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

export type CatalogMatchProduct = Pick<Stripe.Product, 'id' | 'name'> & {
  metadata?: Stripe.Metadata | null;
};

/**
 * Find a previously synced product when the spreadsheet has no Stripe ID.
 * SKU (metadata.sku) wins because names are not unique; empty SKUs never match.
 */
export function matchExistingProduct(
  products: CatalogMatchProduct[],
  row: ProductRow
): CatalogMatchProduct | undefined {
  const sku = row.sku?.trim();
  if (sku) {
    const bySku = products.find((product) => (product.metadata?.sku || '').trim() === sku);
    if (bySku) {
      return bySku;
    }
  }

  const name = row.name.trim();
  if (!name) {
    return undefined;
  }

  return products.find((product) => product.name.trim() === name);
}

async function listActiveProducts(stripe: Stripe): Promise<Stripe.Product[]> {
  const products: Stripe.Product[] = [];
  let startingAfter: string | undefined;

  for (;;) {
    const page = await stripe.products.list({
      limit: 100,
      active: true,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    products.push(...page.data);
    if (!page.has_more || page.data.length === 0) {
      break;
    }
    const last = page.data[page.data.length - 1];
    if (!last) {
      break;
    }
    startingAfter = last.id;
  }

  return products;
}

async function applyCatalogPrice(
  stripe: Stripe,
  productId: string,
  product: ProductRow
): Promise<void> {
  const unitAmount = Math.round(product.price * 100);
  const currency = product.currency || 'usd';
  const existing = await stripe.prices.list({ product: productId, active: true });
  const match = existing.data.find(
    (price) => price.unit_amount === unitAmount && price.currency === currency && !price.recurring
  );

  if (match) {
    return;
  }

  await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency,
    metadata: {
      sku: product.sku || '',
    },
  });

  // Prices are immutable. Archive the previous one-time prices so the
  // storefront, which reads the first active price, does not keep the old amount.
  for (const price of existing.data) {
    if (!price.recurring) {
      await stripe.prices.update(price.id, { active: false });
    }
  }
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
  const existingCatalog = await listActiveProducts(stripe);

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
        const existing = matchExistingProduct(existingCatalog, product);
        if (existing) {
          stripeProduct = await stripe.products.update(existing.id, {
            name: product.name,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : undefined,
            metadata: product.metadata,
          });
          await applyCatalogPrice(stripe, existing.id, product);
          updated.push(stripeProduct);
          const catalogIndex = existingCatalog.findIndex((item) => item.id === existing.id);
          if (catalogIndex >= 0) {
            existingCatalog[catalogIndex] = stripeProduct;
          }
          console.log(`Updated product: ${product.name}`);
        } else {
          // Create new product
          stripeProduct = await stripe.products.create({
            name: product.name,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : undefined,
            metadata: product.metadata,
          });
          created.push(stripeProduct);
          existingCatalog.push(stripeProduct);

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
