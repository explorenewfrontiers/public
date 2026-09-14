import Stripe from 'stripe';
import { parseProductCatalog, syncProductsToStripe, getStripeProducts, getProductWithPrices } from './catalog.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export function buildStripeClientOptions(stripeAccount?: string): {
  apiVersion: string;
  stripeAccount?: string;
} {
  const options: { apiVersion: string; stripeAccount?: string } = {
    apiVersion: '2024-11-20',
  };

  if (stripeAccount) {
    options.stripeAccount = stripeAccount;
  }

  return options;
}

export function getStripeClient(
  stripeAccount?: string,
  apiKey = process.env.STRIPE_API_KEY || ''
): Stripe {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stripe(apiKey, buildStripeClientOptions(stripeAccount) as any);
}

export const tools: Record<string, ToolDefinition> = {
  'list_customers': {
    name: 'list_customers',
    description: 'List all customers',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of customers to return (default: 10)' },
        starting_after: { type: 'string', description: 'Customer ID to start after for pagination' },
      },
      required: [],
    },
  },
  'get_customer': {
    name: 'get_customer',
    description: 'Get details of a specific customer',
    inputSchema: {
      type: 'object',
      properties: {
        customer_id: { type: 'string', description: 'The customer ID' },
      },
      required: ['customer_id'],
    },
  },
  'create_customer': {
    name: 'create_customer',
    description: 'Create a new customer',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Customer email' },
        name: { type: 'string', description: 'Customer name' },
        description: { type: 'string', description: 'Customer description' },
      },
      required: ['email'],
    },
  },
  'list_charges': {
    name: 'list_charges',
    description: 'List charges',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of charges to return (default: 10)' },
        customer: { type: 'string', description: 'Filter by customer ID' },
      },
      required: [],
    },
  },
  'get_charge': {
    name: 'get_charge',
    description: 'Get details of a specific charge',
    inputSchema: {
      type: 'object',
      properties: {
        charge_id: { type: 'string', description: 'The charge ID' },
      },
      required: ['charge_id'],
    },
  },
  'create_payment_intent': {
    name: 'create_payment_intent',
    description: 'Create a payment intent',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in cents' },
        currency: { type: 'string', description: 'Currency code (e.g., "usd")' },
        customer: { type: 'string', description: 'Customer ID' },
        description: { type: 'string', description: 'Description' },
      },
      required: ['amount', 'currency'],
    },
  },
  'get_payment_intent': {
    name: 'get_payment_intent',
    description: 'Get details of a payment intent',
    inputSchema: {
      type: 'object',
      properties: {
        payment_intent_id: { type: 'string', description: 'The payment intent ID' },
      },
      required: ['payment_intent_id'],
    },
  },
  'list_invoices': {
    name: 'list_invoices',
    description: 'List invoices',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of invoices to return (default: 10)' },
        customer: { type: 'string', description: 'Filter by customer ID' },
      },
      required: [],
    },
  },
  'get_invoice': {
    name: 'get_invoice',
    description: 'Get details of a specific invoice',
    inputSchema: {
      type: 'object',
      properties: {
        invoice_id: { type: 'string', description: 'The invoice ID' },
      },
      required: ['invoice_id'],
    },
  },
  'list_products': {
    name: 'list_products',
    description: 'List all products from Stripe catalog',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max number of products to return (default: 10)' },
      },
      required: [],
    },
  },
  'get_product': {
    name: 'get_product',
    description: 'Get product details with pricing information',
    inputSchema: {
      type: 'object',
      properties: {
        product_id: { type: 'string', description: 'The product ID' },
      },
      required: ['product_id'],
    },
  },
  'sync_catalog': {
    name: 'sync_catalog',
    description: 'Sync product catalog from Excel file to Stripe',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Path to the Excel catalog file' },
      },
      required: ['file_path'],
    },
  },
};

export async function handleToolCall(
  toolName: string,
  input: Record<string, unknown>,
  stripeAccount?: string,
  stripeClient?: Stripe
): Promise<unknown> {
  const client = stripeClient ?? getStripeClient(stripeAccount);

  switch (toolName) {
    case 'list_customers': {
      const customers = await client.customers.list({
        limit: (input.limit as number) || 10,
        starting_after: input.starting_after as string,
      });
      return customers;
    }
    case 'get_customer': {
      const customer = await client.customers.retrieve(input.customer_id as string);
      return customer;
    }
    case 'create_customer': {
      const customer = await client.customers.create({
        email: input.email as string,
        name: input.name as string,
        description: input.description as string,
      });
      return customer;
    }
    case 'list_charges': {
      const charges = await client.charges.list({
        limit: (input.limit as number) || 10,
        customer: input.customer as string,
      });
      return charges;
    }
    case 'get_charge': {
      const charge = await client.charges.retrieve(input.charge_id as string);
      return charge;
    }
    case 'create_payment_intent': {
      const intent = await client.paymentIntents.create({
        amount: input.amount as number,
        currency: input.currency as string,
        customer: input.customer as string,
        description: input.description as string,
      });
      return intent;
    }
    case 'get_payment_intent': {
      const intent = await client.paymentIntents.retrieve(input.payment_intent_id as string);
      return intent;
    }
    case 'list_invoices': {
      const invoices = await client.invoices.list({
        limit: (input.limit as number) || 10,
        customer: input.customer as string,
      });
      return invoices;
    }
    case 'get_invoice': {
      const invoice = await client.invoices.retrieve(input.invoice_id as string);
      return invoice;
    }
    case 'list_products': {
      const products = await getStripeProducts(client, (input.limit as number) || 10);
      return {
        products: products.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          images: p.images,
          metadata: p.metadata,
        })),
      };
    }
    case 'get_product': {
      const result = await getProductWithPrices(client, input.product_id as string);
      return {
        product: {
          id: result.product.id,
          name: result.product.name,
          description: result.product.description,
          images: result.product.images,
          metadata: result.product.metadata,
        },
        prices: result.prices.map((p) => ({
          id: p.id,
          product: p.product,
          unit_amount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring,
        })),
      };
    }
    case 'sync_catalog': {
      const filePath = input.file_path as string;
      const products = await parseProductCatalog(filePath);
      const result = await syncProductsToStripe(products, client);
      return {
        created_count: result.created.length,
        updated_count: result.updated.length,
        created: result.created.map((p) => ({ id: p.id, name: p.name })),
        updated: result.updated.map((p) => ({ id: p.id, name: p.name })),
      };
    }
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
