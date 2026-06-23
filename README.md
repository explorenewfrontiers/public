# Stripe MCP Server

A Model Context Protocol (MCP) server for Stripe that uses HTTP transport. This server exposes Stripe API operations as tools that can be called by Claude Code and other MCP clients.

## Features

- **Customer Management**: List, get, and create customers
- **Charges**: List and retrieve charge details
- **Payment Intents**: Create and retrieve payment intents
- **Invoices**: List and retrieve invoices
- **HTTP Transport**: Standard HTTP/JSON-RPC 2.0 protocol
- **Full Type Safety**: Written in TypeScript

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with your Stripe API key:

```env
STRIPE_API_KEY=sk_test_your_api_key_here
PORT=8000
MCP_API_KEY=your_secure_api_key_here
```

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

**Example with curl:**
```bash
curl -X POST http://localhost:8000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secure_api_key_here" \
  -H "Stripe-Account: acct_xxxxxxxxx" \
  -d '{"jsonrpc":"2.0","method":"list_customers","id":1}'
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

```bash
claude mcp add --transport http stripe https://localhost:8000
```

For a remote server:

```bash
claude mcp add --transport http stripe https://mcp.stripe.com
```

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

**Excel File Format:**
Your spreadsheet should have columns for:
- `Name` (required) - Product name
- `Description` - Product description
- `Price` - Price in dollars (e.g., 29.99)
- `Currency` - Currency code (default: usd)
- `Image URL` - URL to product image
- `Category` - Product category
- `SKU` - Stock keeping unit

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

The server implements the JSON-RPC 2.0 protocol over HTTP.

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

```json
{
  "jsonrpc": "2.0",
  "result": {
    "type": "text",
    "text": "..."
  },
  "id": "1"
}
```

## License

MIT
