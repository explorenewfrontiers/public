# Stripe MCP Server

A Model Context Protocol (MCP) server for Stripe that uses HTTP transport. This server exposes Stripe API operations as tools that can be called by Claude Code and other MCP clients.

This repository also contains a separate Stripe Connect sample under [`stripe-connect-sample/`](./stripe-connect-sample). The MCP server and the Connect sample are independent apps with different env vars, ports, and Stripe clients.

## Architecture

Two Node processes share catalog helpers in `src/catalog.ts`:

| Process | Entry | Default port | Role |
|---|---|---|---|
| MCP server | `src/index.ts` | `PORT` (8000) | JSON-RPC 2.0 over raw Node `http`. POST only. |
| Product website | `src/web-server.ts` | `WEB_PORT` (3000) | Express app: static `public/` + catalog/checkout APIs |

The MCP server advertises protocol version `2024-11-05` and creates Stripe clients with API version `2024-11-20`. Per-request `Stripe-Account` is passed into `new Stripe(..., { stripeAccount })`.

```
MCP client  --POST JSON-RPC-->  :8000  src/index.ts  --> Stripe API
Browser     --HTTP------------>  :3000  src/web-server.ts --> Stripe API
```

## Features

- **Customer Management**: List, get, and create customers
- **Charges**: List and retrieve charge details
- **Payment Intents**: Create and retrieve payment intents
- **Invoices**: List and retrieve invoices
- **Products**: List, get (with prices), and sync from Excel
- **HTTP Transport**: JSON-RPC 2.0 over HTTP POST
- **Full Type Safety**: Written in TypeScript

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` and export the variables into the process environment. Neither `src/index.ts` nor `src/web-server.ts` loads a `.env` file (no `dotenv`). `npm run dev` / `npm start` only see vars you export, pass on the command line, or inject with a runner.

```env
STRIPE_API_KEY=sk_test_your_api_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
PORT=8000
WEB_PORT=3000
DOMAIN=http://localhost:3000
MCP_API_KEY=your_secure_api_key_here
```

`STRIPE_PUBLISHABLE_KEY` is listed for the catalog UI. The website process does not read it; see [Website APIs](#website-apis). `LOG_LEVEL` in `.env.example` is unused.

### Authentication

**Bearer Token Authentication (Optional)**

If you set `MCP_API_KEY` in your environment, the server will require Bearer token authentication. Clients must include an `Authorization` header:

```
Authorization: Bearer your_secure_api_key_here
```

If `MCP_API_KEY` is not set, authentication is disabled and the server accepts all requests.

### Multi-Account Support

For Stripe Connect accounts, you can specify a connected account using the `Stripe-Account` header:

```
Stripe-Account: acct_xxxxxxxxx
```

This routes all API calls to the specified connected account.

Auth is enabled when `MCP_API_KEY` is present in the environment (`!== undefined`), including an empty string. Missing or non-Bearer `Authorization` headers return HTTP 401 with JSON-RPC error code `-32600`.

The server accepts **POST only**. Other methods return HTTP 405.

**Example with curl** (tools are invoked via `call_tool`, not as top-level JSON-RPC methods):
```bash
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secure_api_key_here" \
  -H "Stripe-Account: acct_xxxxxxxxx" \
  -d '{"jsonrpc":"2.0","id":1,"method":"call_tool","params":{"name":"list_customers","arguments":{"limit":5}}}'
```

**Claude Code Configuration:**
```json
{
  "mcpServers": {
    "stripe": {
      "url": "http://localhost:8000",
      "headers": {
        "Authorization": "Bearer your_secure_api_key_here",
        "Stripe-Account": "acct_xxxxxxxxx"
      }
    }
  }
}
```

## Running the Server

### Development

MCP Server only:
```bash
npm run dev
```

Website only:
```bash
npm run dev:web
```

Both servers together:
```bash
npm run dev:both
```

### Production

```bash
npm run build
npm start          # MCP Server on port 8000
npm run start:web  # Website on port 3000
npm run start:both # Both together
```

- **MCP Server** will listen on `http://localhost:8000` (configurable with PORT env var)
- **Website** will listen on `http://localhost:3000` (configurable with WEB_PORT env var)

## Usage with Claude Code

Add the server to Claude Code using:

Local HTTP (this server does not terminate TLS):

```bash
claude mcp add --transport http stripe http://localhost:8000
```

If `MCP_API_KEY` is set, also configure the Bearer header in the client (see the JSON config above). The `https://localhost:8000` form only works if you put a TLS proxy in front of the process.

## Product Catalog & Website

### Syncing Products from Excel

Use the `sync_catalog` tool to import products from an Excel file:

```json
{
  "jsonrpc": "2.0",
  "method": "call_tool",
  "params": {
    "name": "sync_catalog",
    "arguments": {
      "file_path": "/path/to/CFT_Stripe_Product_Catalog_1.xlsx"
    }
  },
  "id": 1
}
```

**Excel file format** (`src/catalog.ts` reads the first sheet only):

| Header (either casing) | Behavior |
|---|---|
| `Name` / `name` | Required for a useful product. Missing names become `"Unnamed Product"`. |
| `Price` / `price` | Dollars, converted with `Math.round(price * 100)`. Missing price becomes `0`. |
| `Currency` / `currency` | Lowercased; default `usd`. |
| `Description` / `description` | Optional. |
| `Image URL` / `image_url` | Optional; stored as a single Stripe product image. |
| `Category` / `category`, `SKU` / `sku` | Copied into Stripe `metadata`. |
| `ID` / `id` | If set, the sync tries `products.retrieve` then `products.update`. |

**Sync constraints:**
- Prices are created only for **new** products. Updates change name, description, images, and metadata — not the existing price.
- If retrieve/update of an ID fails, the row is created as a new product (and a price is attached).
- `list_products` / `GET /api/products` return **active** products only.

### Product Website

The included website displays your Stripe products with:
- Product catalog with images
- Search functionality
- Shopping cart
- Stripe checkout integration
- Responsive design

Access at `http://localhost:3000`

### Website APIs

#### Get All Products
```bash
GET /api/products?limit=20
```

#### Get Product with Prices
```bash
GET /api/products/{productId}
```

#### Create Checkout Session
```bash
POST /api/checkout
Content-Type: application/json

{
  "items": [
    { "priceId": "price_xxx", "quantity": 1 }
  ]
}
```

Successful response: `{ "sessionId": "cs_..." }`. Redirects use `DOMAIN` (default `http://localhost:3000`):

- success: `${DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`
- cancel: `${DOMAIN}/cancel`

The static UI (`public/app.js`) calls `stripe.redirectToCheckout({ sessionId })` and reads `window.STRIPE_KEY`. The Express app does **not** inject that key or `STRIPE_PUBLISHABLE_KEY` into HTML — set `window.STRIPE_KEY` yourself or checkout will initialize Stripe with an empty string. There are no `/success` or `/cancel` routes; those URLs 404 unless you add pages.

## Available Tools

### Customers

#### `list_customers`
List all customers.

**Parameters:**
- `limit` (number, optional): Max customers to return (default: 10)
- `starting_after` (string, optional): Customer ID for pagination

#### `get_customer`
Get a specific customer.

**Parameters:**
- `customer_id` (string, required): The customer ID

#### `create_customer`
Create a new customer.

**Parameters:**
- `email` (string, required): Customer email
- `name` (string, optional): Customer name
- `description` (string, optional): Customer description

### Charges

#### `list_charges`
List charges.

**Parameters:**
- `limit` (number, optional): Max charges to return (default: 10)
- `customer` (string, optional): Filter by customer ID

#### `get_charge`
Get a specific charge.

**Parameters:**
- `charge_id` (string, required): The charge ID

### Payment Intents

#### `create_payment_intent`
Create a payment intent.

**Parameters:**
- `amount` (number, required): Amount in cents
- `currency` (string, required): Currency code (e.g., "usd")
- `customer` (string, optional): Customer ID
- `description` (string, optional): Description

#### `get_payment_intent`
Get a payment intent.

**Parameters:**
- `payment_intent_id` (string, required): The payment intent ID

### Invoices

#### `list_invoices`
List invoices.

**Parameters:**
- `limit` (number, optional): Max invoices to return (default: 10)
- `customer` (string, optional): Filter by customer ID

#### `get_invoice`
Get a specific invoice.

**Parameters:**
- `invoice_id` (string, required): The invoice ID

### Products

#### `list_products`
List all products in the Stripe catalog.

**Parameters:**
- `limit` (number, optional): Max products to return (default: 10)

#### `get_product`
Get product details with pricing information.

**Parameters:**
- `product_id` (string, required): The product ID

#### `sync_catalog`
Sync product catalog from Excel file to Stripe. Creates new products and updates existing ones.

**Parameters:**
- `file_path` (string, required): Path to the Excel catalog file (.xlsx)

**Excel Format:**
Requires columns: Name, Price, Description (optional), Image URL (optional), Category (optional), SKU (optional)

## API Protocol

The server implements JSON-RPC 2.0 over HTTP POST. Tool names such as `list_customers` are **not** top-level methods.

### Methods

| Method | Purpose |
|---|---|
| `initialize` | Returns `protocolVersion: "2024-11-05"`, empty `capabilities.tools`, and `serverInfo` `{ name: "stripe-mcp", version: "1.0.0" }`. |
| `list_tools` | Returns the tool definitions (name, description, JSON Schema). |
| `call_tool` | Runs a tool. Params: `{ "name": "<tool>", "arguments": { ... } }`. Unknown tools return `-32601`. |

Any other method returns `-32601 Method not found`. Invalid JSON returns HTTP 400 / `-32700 Parse error`.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "method": "call_tool",
  "params": {
    "name": "list_customers",
    "arguments": {
      "limit": 5
    }
  },
  "id": "1"
}
```

### Response Format

Successful `call_tool` results are wrapped as MCP text content (the Stripe payload is stringified):

```json
{
  "jsonrpc": "2.0",
  "result": {
    "type": "text",
    "text": "{ ... stripe object json ... }"
  },
  "id": "1"
}
```

## Docker (MCP process only)

The root `Dockerfile` copies a **pre-built** `dist/` tree and runs `node dist/index.js` on port 8000. It does not compile TypeScript and does not start the website.

```bash
npm ci
npm run build
docker build -t stripe-mcp .
docker run --rm -p 8000:8000 \
  -e STRIPE_API_KEY=sk_test_... \
  -e MCP_API_KEY=your_secure_api_key_here \
  stripe-mcp
```

`docker-compose.yml` publishes `8000:8000` and passes only `STRIPE_API_KEY`. It does not set `MCP_API_KEY`, so auth is off unless you add it. The compose file bind-mounts `./dist`, so you still need a local `npm run build` first.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `401` / `Unauthorized: Missing or invalid Bearer token` | `MCP_API_KEY` is set; send `Authorization: Bearer <same value>`. Scheme must be `Bearer`. |
| `405 Method not allowed` | Use POST. |
| `Method not found` | Use `initialize`, `list_tools`, or `call_tool` — not the tool name as `method`. |
| `Stripe API Key configured: no` | `STRIPE_API_KEY` is read at process start; restart after editing `.env`. The MCP process does not load `.env` itself — export vars or use a runner that injects them. |
| Catalog sync created duplicates | Updates require a Stripe product `ID` column. Name-only rows always create. Price changes on existing IDs are ignored. |
| Website checkout does nothing / Stripe.js error | `window.STRIPE_KEY` is unset. `STRIPE_PUBLISHABLE_KEY` in `.env` is unused by `web-server.ts`. |
| Docker image missing `dist/index.js` | Build TypeScript on the host before `docker build`. |
| Connect onboarding / application fees | That flow lives in `stripe-connect-sample/`, not this MCP server. |

## License

MIT
