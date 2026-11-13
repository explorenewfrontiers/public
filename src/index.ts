import http from 'http';
import Stripe from 'stripe';
import { handleToolCall } from './tools.js';

interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id: string | number | null;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number | null;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

const stripeApiKey = process.env.STRIPE_API_KEY || '';
const mpcApiKey = process.env.MCP_API_KEY;
const mpcAuthEnabled = mpcApiKey !== undefined;

function getStripeClient(stripeAccount?: string): Stripe {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    apiVersion: '2024-11-20',
  };

  if (stripeAccount) {
    options.stripeAccount = stripeAccount;
  }

  return new Stripe(stripeApiKey, options);
}

const tools: Record<string, ToolDefinition> = {
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

function validateAuth(authHeader: string | undefined): boolean {
  if (!mpcAuthEnabled) {
    return true;
  }

  if (!authHeader) {
    return false;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer') {
    return false;
  }

  return token === mpcApiKey;
}

async function handleRequest(
  request: JSONRPCRequest,
  stripeAccount?: string
): Promise<JSONRPCResponse> {
  try {
    switch (request.method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'stripe-mcp',
              version: '1.0.0',
            },
          },
        };

      case 'list_tools':
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: Object.values(tools),
          },
        };

      case 'call_tool': {
        const params = request.params as { name: string; arguments: Record<string, unknown> };
        if (!params.name || !tools[params.name]) {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32601,
              message: 'Tool not found',
            },
          };
        }
        try {
          const result = await handleToolCall(
            params.name,
            params.arguments || {},
            getStripeClient(stripeAccount)
          );
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : 'Internal error',
            },
          };
        }
      }

      default:
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    };
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Check authentication if enabled
  if (!validateAuth(req.headers.authorization as string | undefined)) {
    res.writeHead(401);
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Unauthorized: Missing or invalid Bearer token',
        },
      })
    );
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const request: JSONRPCRequest = JSON.parse(body);
      const stripeAccount = req.headers['stripe-account'] as string | undefined;
      const response = await handleRequest(request, stripeAccount);

      res.writeHead(200);
      res.end(JSON.stringify(response));
    } catch (error) {
      res.writeHead(400);
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32700,
            message: 'Parse error',
          },
        })
      );
    }
  });
});

const port = parseInt(process.env.PORT || '8000', 10);
server.listen(port, () => {
  console.log(`Stripe MCP Server listening on port ${port}`);
  console.log(`Stripe API Key configured: ${process.env.STRIPE_API_KEY ? 'yes' : 'no'}`);
  console.log(`Authentication: ${mpcAuthEnabled ? 'enabled (Bearer token required)' : 'disabled'}`);
});
