import Stripe from 'stripe';
import { parseProductCatalog, syncProductsToStripe, getStripeProducts, getProductWithPrices } from './catalog.js';

/**
 * MCP Stripe tool handlers. The Stripe client is injected so tests can mock
 * API calls without booting the HTTP server or using live keys.
 */
export async function handleToolCall(
  toolName: string,
  input: Record<string, unknown>,
  client: Stripe
): Promise<unknown> {
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
