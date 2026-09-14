import http from 'http';
import { handleToolCall, tools } from './tools.js';

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

const mpcApiKey = process.env.MCP_API_KEY;
const mpcAuthEnabled = mpcApiKey !== undefined;

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
          const result = await handleToolCall(params.name, params.arguments || {}, stripeAccount);
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
