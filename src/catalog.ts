import XLSX from 'xlsx';
import Stripe from 'stripe';

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

export interface SyncError {
  name: string;
  message: string;
}

export interface SyncResult {
  created: Stripe.Product[];
  updated: Stripe.Product[];
  errors: SyncError[];
}

export function parsePriceValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
      return Number.NaN;
    }
    return Number.parseFloat(cleaned);
  }
  return Number.NaN;
}

export function priceToUnitAmount(price: number): number {
  const unitAmount = Math.round(price * 100);
  if (!Number.isFinite(unitAmount) || unitAmount < 0) {
    throw new Error(`Invalid price: ${price}`);
  }
  return unitAmount;
}

export function isResourceMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'resource_missing'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
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
    price: parsePriceValue(row['Price'] ?? row['price']),
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

async function createPriceForProduct(
  stripe: Stripe,
  productId: string,
  product: ProductRow
): Promise<Stripe.Price> {
  const unitAmount = priceToUnitAmount(product.price);
  return stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: product.currency || 'usd',
    metadata: {
      sku: product.sku || '',
    },
  });
}

async function createProductWithPrice(
  stripe: Stripe,
  product: ProductRow
): Promise<Stripe.Product> {
  priceToUnitAmount(product.price);
  const stripeProduct = await stripe.products.create({
    name: product.name,
    description: product.description || undefined,
    images: product.image_url ? [product.image_url] : undefined,
    metadata: product.metadata,
  });

  const price = await createPriceForProduct(stripe, stripeProduct.id, product);
  return stripe.products.update(stripeProduct.id, {
    default_price: price.id,
  });
}

async function syncPriceForExistingProduct(
  stripe: Stripe,
  productId: string,
  product: ProductRow
): Promise<void> {
  const unitAmount = priceToUnitAmount(product.price);
  const currency = product.currency || 'usd';
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  const match = existing.data.find(
    (price) =>
      price.unit_amount === unitAmount &&
      price.currency === currency &&
      !price.recurring
  );

  if (match) {
    await stripe.products.update(productId, { default_price: match.id });
    return;
  }

  const created = await createPriceForProduct(stripe, productId, product);
  await stripe.products.update(productId, { default_price: created.id });
}

export async function syncProductsToStripe(
  products: ProductRow[],
  stripe: Stripe
): Promise<SyncResult> {
  const created: Stripe.Product[] = [];
  const updated: Stripe.Product[] = [];
  const errors: SyncError[] = [];

  for (const product of products) {
    try {
      if (product.id) {
        let existing: Stripe.Product | null = null;
        try {
          existing = await stripe.products.retrieve(product.id);
        } catch (error) {
          if (!isResourceMissing(error)) {
            throw error;
          }
        }

        if (existing) {
          const stripeProduct = await stripe.products.update(product.id, {
            name: product.name,
            description: product.description || undefined,
            images: product.image_url ? [product.image_url] : undefined,
            metadata: product.metadata,
          });
          await syncPriceForExistingProduct(stripe, product.id, product);
          updated.push(stripeProduct);
          console.log(`Updated product: ${product.name}`);
        } else {
          const stripeProduct = await createProductWithPrice(stripe, product);
          created.push(stripeProduct);
          console.log(`Created product: ${product.name}`);
        }
      } else {
        const stripeProduct = await createProductWithPrice(stripe, product);
        created.push(stripeProduct);
        console.log(`Created product: ${product.name}`);
      }
    } catch (error) {
      console.error(`Error processing product ${product.name}:`, error);
      errors.push({ name: product.name, message: errorMessage(error) });
    }
  }

  return { created, updated, errors };
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
  const ordered = [...prices.data];
  const defaultPriceId =
    typeof product.default_price === 'string'
      ? product.default_price
      : product.default_price?.id;

  if (defaultPriceId) {
    const defaultIndex = ordered.findIndex((price) => price.id === defaultPriceId);
    if (defaultIndex > 0) {
      const [defaultPrice] = ordered.splice(defaultIndex, 1);
      if (defaultPrice) {
        ordered.unshift(defaultPrice);
      }
    }
  }

  return {
    product,
    prices: ordered,
  };
}
