# Stripe MCP Server

A Model Context Protocol (MCP) server for Stripe that uses HTTP transport. This server exposes Stripe API operations as tools that can be called by Claude Code and other MCP clients.

This repository also contains a separate Stripe Connect sample under [`stripe-connect-sample/`](./stripe-connect-sample). The MCP server and the Connect sample are independent apps with different env vars, ports, and Stripe clients.

## Architecture

Two Node processes share catalog helpers in `src/catalog.ts`:

| Process | Entry | Default port | Role |
|---|---|---|---|
| MCP server | `src/index.ts` | `PORT` (8000) | JSON-RPC 2.0 over raw Node `http`. POST only. |
| Product website | `src/web-server.ts` | `WEB_PORT` (3000) | Express app: static `public/` + catalog/checkout APIs |

```
MCP client  --POST JSON-RPC-->  :8000  src/index.ts     --> Stripe API
Browser     --HTTP------------>  :3000  src/web-server.ts --> Stripe API
```

JSON-RPC methods this server implements: `initialize`, `list_tools`, `call_tool`. Those are **not** the MCP spec names (`tools/list`, `tools/call`). Spec-compliant clients that send `tools/list` or `tools/call` receive `-32601 Method not found`.

Tool `inputSchema.required` is advertised in `list_tools` but **not enforced** in `handleToolCall`. Missing required arguments are passed through to Stripe (often as `undefined`).

`create_payment_intent` and `get_payment_intent` return the raw Stripe object. `call_tool` wraps it as `{ type: "text", text: JSON.stringify(result) }`, so `client_secret` (and other secret fields) are sent to the MCP client and any transcript logger.

`getStripeClient` constructs `new Stripe(key, { apiVersion: '2024-11-20', stripeAccount })` with the options object typed as `any`. `package-lock.json` pins `stripe@15.12.0` (generated for `2024-04-10`). If Stripe rejects `Stripe-Version: 2024-11-20`, every tool call fails before a resource is reached. The website process does **not** pin an API version.

Both processes call `listen(port)` with no host, so they bind all interfaces (`0.0.0.0`), not loopback.

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

If `MCP_API_KEY` is **unset** (`undefined`), authentication is disabled and the server accepts all requests.

Auth is enabled when `MCP_API_KEY !== undefined`, including an **empty string**. Docker Compose interpolates a missing `${MCP_API_KEY}` as `""` if you add that mapping without a host value — then `Authorization: Bearer ` (empty token) succeeds. The token is `authHeader.split(' ')[1]` only: extra spaces, `Bearer` with no token, or a non-`Bearer` scheme all fail.

Missing or non-Bearer `Authorization` headers return HTTP 401 with JSON-RPC error code `-32600`.

The server accepts **POST only**. Other methods return HTTP 405.

There is no allowlist on `Stripe-Account`. Any `acct_...` on the header is passed into the Stripe client for that request.

### Multi-Account Support

For Stripe Connect accounts, you can specify a connected account using the `Stripe-Account` header:

```
Stripe-Account: acct_xxxxxxxxx
```

This routes all API calls on that request to the specified connected account.

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

If the client speaks official MCP (`tools/list` / `tools/call`), it will not match this server until those method names are aliased in `src/index.ts`.

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

`package.json` is `"type": "module"` and the `dev*` scripts are `ts-node src/...`. If ts-node rejects ESM imports, export env vars and run the compiled files instead (`npm run build` then `npm start` / `npm run start:web`).

Static files for the website are resolved from the process working directory (`express.static('public')`). Start the website from the repo root.

### Production

```bash
npm run build
npm start          # MCP Server on port 8000
npm run start:web  # Website on port 3000
npm run start:both # Both together
```

- **MCP Server** will listen on `http://localhost:8000` (configurable with PORT env var)
- **Website** will listen on `http://localhost:3000` (configurable with WEB_PORT env var)

`npm test` looks for `dist/**/*.test.js`. This branch does not ship those files.

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

The `file_path` is read from the MCP process filesystem (`XLSX.readFile`). Paths that exist only on the client machine will fail.

**Excel file format** (`src/catalog.ts` reads the first sheet only):

| Header (either casing) | Behavior |
|---|---|
| `Name` / `name` | Required for a useful product. Missing names become `"Unnamed Product"`. |
| `Price` / `price` | Major units, always converted with `Math.round(price * 100)` (cents). Missing price becomes `0`. Stripe zero-decimal currencies (`jpy`, `krw`, `vnd`, …) use the major unit as `unit_amount`, so a `Price=500` / `Currency=jpy` row stores `50000` (¥50,000). |
| `Currency` / `currency` | Lowercased with `.toLowerCase()`; default `usd`. **Must be text.** A numeric Excel cell (ISO code `840`, etc.) throws `toLowerCase is not a function` and the catch path tries to create the row again. |
| `Description` / `description` | Optional. |
| `Image URL` / `image_url` | Optional; stored as a single Stripe product image. Not scheme-checked (`javascript:`, `data:`, private-network URLs can later appear as `<img src>`). |
| `Category` / `category`, `SKU` / `sku` | Copied into Stripe `metadata`. Excel often stores digits as numbers; `as string` does not convert at runtime. Stripe requires metadata values to be strings, so a numeric `SKU` / `Category` rejects `products.create` / `update`. The catch path retries create with the same bad metadata, throws again, and **aborts the rest of the sheet**. |
| `ID` / `id` | If set, the sync tries `products.retrieve` then `products.update`. |

**Sync constraints:**
- Prices are created only for **new** products. Updates change name, description, images, and metadata — not the existing price.
- If retrieve/update of an ID fails, the row is created as a new product (and a price is attached). Rows without `ID` always create, so re-syncing the same spreadsheet duplicates products.
- `list_products` / `GET /api/products` return **active** products only (default limit 10 for the tool, 20 for the website unless `?limit=` is set).
- Optional tool arguments are forwarded as `undefined` (for example `starting_after` on `list_customers`). Send only the fields you intend Stripe to receive.
- Format every Excel text column (`Name`, `Currency`, `SKU`, `Category`, `ID`) as **text**, not General/Number.

### Product Website

The included website displays your Stripe products with:
- Product catalog with images
- Search functionality
- Shopping cart
- Stripe checkout integration
- Responsive design

Access at `http://localhost:3000`

`public/app.js` interpolates `product.name`, `product.description`, and image URLs into `innerHTML`, and builds Add to Cart as `onclick="addToCart(..., '${product.name}', ...)"`. Catalog strings from Excel / the Stripe dashboard are treated as HTML and JavaScript, not text. `web-server.ts` also enables `cors()` with no origin restriction.

Catalog and cart prices are always rendered as `$` plus `unit_amount / 100`. That is wrong for zero-decimal currencies even when Stripe stored the amount correctly.

`public/index.html` loads `https://js.stripe.com/v3/` with no Subresource Integrity hash.

### Website APIs

#### Get All Products
```bash
GET /api/products?limit=20
```

Returns `{ products: [{ id, name, description, images, metadata }] }` — no prices. The UI then calls the detail endpoint per card.

#### Get Product with Prices
```bash
GET /api/products/{productId}
```

Returns `{ product, prices: [{ id, unit_amount, currency, recurring }] }`. The cart uses `prices[0]`.

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

The static UI (`public/app.js`) calls `stripe.redirectToCheckout({ sessionId })` and reads `window.STRIPE_KEY`. `public/index.html` does not set that global, and `web-server.ts` does not inject `STRIPE_PUBLISHABLE_KEY` — checkout initializes Stripe with an empty string unless you set `window.STRIPE_KEY` yourself. There are no `/success` or `/cancel` routes; those URLs 404 unless you add pages.

`POST /api/checkout` always uses `mode: 'payment'`. A recurring price ID is rejected by Stripe. The handler does not validate `items`; a missing array throws inside `items.map` and returns HTTP 500.

`checkout()` in `public/app.js` does not check `response.ok`. A 5xx `{ error }` has no `sessionId` and no `else` reset, so the button stays **Processing...**.

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
- `amount` (number, required): Amount in cents (not converted for zero-decimal currencies)
- `currency` (string, required): Currency code (e.g., "usd")
- `customer` (string, optional): Customer ID
- `description` (string, optional): Description

The result is the raw Stripe PaymentIntent, including `client_secret`.

#### `get_payment_intent`
Get a payment intent.

**Parameters:**
- `payment_intent_id` (string, required): The payment intent ID

Same raw-object return as create (includes `client_secret` when present).

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
- `file_path` (string, required): Path to the Excel catalog file (.xlsx) on the **server** filesystem

## API Protocol

The server implements JSON-RPC 2.0 over HTTP POST. Tool names such as `list_customers` are **not** top-level methods.

### Methods

| Method | Purpose |
|---|---|
| `initialize` | Returns `protocolVersion: "2024-11-05"`, empty `capabilities.tools`, and `serverInfo` `{ name: "stripe-mcp", version: "1.0.0" }`. |
| `list_tools` | Returns the tool definitions (name, description, JSON Schema). |
| `call_tool` | Runs a tool. Params: `{ "name": "<tool>", "arguments": { ... } }`. Unknown tools return `-32601`. |

Any other method (including official MCP `tools/list` and `tools/call`) returns `-32601 Method not found`. Invalid JSON returns HTTP 400 / `-32700 Parse error`. Tool execution errors return `-32603` with the Stripe/Error message.

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

The root `Dockerfile` copies a **pre-built** `dist/` tree (`COPY dist ./dist`) and runs `node dist/index.js` on port 8000. It does not compile TypeScript, does not copy `public/`, and does not start the website. `npm ci --only=production` runs against the lockfile; you still need `npm run build` on the host first.

```bash
npm ci
npm run build
docker build -t stripe-mcp .
docker run --rm -p 8000:8000 \
  -e STRIPE_API_KEY=sk_test_... \
  -e MCP_API_KEY=your_secure_api_key_here \
  stripe-mcp
```

`docker-compose.yml` publishes `8000:8000` and passes only `STRIPE_API_KEY`. It does **not** set `MCP_API_KEY`, so auth is off in Compose even when that key is in `.env`. It bind-mounts `./dist:/app/dist`:

- An empty or missing host `dist/` overlays the image and `node dist/index.js` fails.
- A host `MCP_API_KEY` never reaches the container unless you add it to `environment`.

If you add `- MCP_API_KEY=${MCP_API_KEY}` and the host value is empty, Compose sets the var to `""`, which **enables** auth and accepts an empty Bearer token.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `401` / `Unauthorized: Missing or invalid Bearer token` | `MCP_API_KEY` is a non-empty string; send `Authorization: Bearer <same value>`. Scheme must be `Bearer`. The token is the second space-separated field only. |
| Compose logs `Authentication: disabled` despite `.env` | `docker-compose.yml` does not forward `MCP_API_KEY`. |
| Empty Bearer token is accepted | `MCP_API_KEY` is `""` (`!== undefined`). Unset the var to disable auth, or set a non-empty secret. |
| `405 Method not allowed` | Use POST. |
| `Method not found` | Use `initialize`, `list_tools`, or `call_tool` — not the tool name, and not `tools/list` / `tools/call`. |
| `Stripe API Key configured: no` | `STRIPE_API_KEY` is read at process start; restart after changing the environment. The MCP process does not load `.env` itself — export vars or use a runner that injects them. |
| Catalog sync created duplicates | Updates require a Stripe product `ID` column. Name-only rows always create. Price changes on existing IDs are ignored. |
| Catalog sync throws `toLowerCase is not a function` | `Currency` in Excel is numeric. Store `usd` (text). |
| Catalog sync: `Invalid metadata: sku must be a string` | `SKU` or `Category` is a numeric Excel cell. Format the column as text. The first bad row stops the rest of the sheet. |
| JPY/KRW/VND catalog price is 100× too high | Sync always does `Math.round(price * 100)`. For zero-decimal currencies put the major unit in `Price` only after the converter is currency-aware. |
| Tool call hits Stripe with `undefined` | Required schema fields are not checked in `handleToolCall`. Omit unused optional keys from `arguments`. |
| Every MCP Stripe call fails with an API-version error | `getStripeClient` pins `2024-11-20` via `any`. Confirm that string against the installed `stripe` package (`15.12.0` ships `2024-04-10`). |
| Website checkout does nothing / Stripe.js error | `window.STRIPE_KEY` is unset. `STRIPE_PUBLISHABLE_KEY` in `.env` is unused by `web-server.ts`. |
| Checkout button stuck on **Processing...** | `checkout()` ignores HTTP status. A 5xx `{ error }` never resets the button. |
| Recurring catalog price fails at checkout | `POST /api/checkout` is `mode: 'payment'` only. |
| Checkout success/cancel 404 | `success_url` / `cancel_url` point at routes that are not implemented. |
| Docker image missing `dist/index.js` | Build TypeScript on the host before `docker build`. Do not start Compose with an empty host `dist/` bind-mount. |
| Process reachable from other hosts | `listen(port)` binds all interfaces; combine with auth-off-by-default only on a trusted network. |
| Connect onboarding / application fees | That flow lives in `stripe-connect-sample/`, not this MCP server. |

## License

MIT
