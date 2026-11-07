import { createMcpServer } from './mcp.js';

const port = parseInt(process.env.PORT || '8000', 10);
const server = createMcpServer();
server.listen(port, () => {
  console.log(`Stripe MCP Server listening on port ${port}`);
  console.log(`Stripe API Key configured: ${process.env.STRIPE_API_KEY ? 'yes' : 'no'}`);
  console.log(`Authentication: ${process.env.MCP_API_KEY !== undefined ? 'enabled (Bearer token required)' : 'disabled'}`);
});
