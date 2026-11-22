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

const NAME_HEADERS = new Set(['name', 'product name']);
const PRICE_HEADERS = new Set(['price', 'unit price']);

function normalizeHeaderKey(key: unknown): string {
  return String(key ?? '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase();
}

function canonicalCatalogField(header: unknown): string | undefined {
  const key = normalizeHeaderKey(header);
  if (NAME_HEADERS.has(key)) return 'name';
  if (PRICE_HEADERS.has(key)) return 'price';
  if (key === 'id' || key === 'product id') return 'id';
  if (key === 'description') return 'description';
  if (key === 'currency') return 'currency';
  if (key === 'image url' || key === 'image_url' || key === 'image') return 'image_url';
  if (key === 'category') return 'category';
  if (key === 'sku') return 'sku';
  return undefined;
}

function isCatalogHeaderRow(cells: unknown[]): boolean {
  const fields = new Set<string>();
  for (const cell of cells) {
    const field = canonicalCatalogField(cell);
    if (field) {
      fields.add(field);
    }
  }
  return fields.has('name') && fields.has('price');
}

function isEmptyCatalogRow(values: unknown[]): boolean {
  return values.every((value) => value == null || String(value).trim() === '');
}

function findCatalogTable(workbook: XLSX.WorkBook): {
  headers: unknown[];
  rows: unknown[][];
} {
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const aoa = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
    }) as unknown[][];

    const headerIndex = aoa.findIndex((row) => isCatalogHeaderRow(row));
    if (headerIndex === -1) continue;

    return {
      headers: aoa[headerIndex] ?? [],
      rows: aoa.slice(headerIndex + 1),
    };
  }

  throw new Error(
    'Catalog spreadsheet has no Name/Price (or Product Name/Unit Price) header row'
  );
}

function rowToProduct(headers: unknown[], values: unknown[]): ProductRow {
  const record: Record<string, unknown> = {};
  headers.forEach((header, i) => {
    const field = canonicalCatalogField(header);
    if (!field || field in record) {
      return;
    }
    record[field] = values[i];
  });

  const category = (record['category'] || '') as string;
  const sku = (record['sku'] || '') as string;

  return {
    id: (record['id'] || '') as string,
    name: (record['name'] || 'Unnamed Product') as string,
    description: (record['description'] || '') as string,
    price: parseFloat((record['price'] || '0') as string),
    currency: ((record['currency'] || 'usd') as string).toLowerCase(),
    image_url: (record['image_url'] || '') as string,
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
  const table = findCatalogTable(workbook);

  return table.rows
    .filter((values) => !isEmptyCatalogRow(values))
    .map((values) => rowToProduct(table.headers, values));
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
