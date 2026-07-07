# SuperBridge

**Your own BuckyDrop alternative** — a full-stack Taobao-to-Shopify dropshipping fulfillment platform with warehousing, quality control, and international shipping.

Built for merchants like **Superbly** who want to source products from Taobao, sell on Shopify, and handle fulfillment without paying a middleman platform.

## What SuperBridge Does

SuperBridge replaces services like BuckyDrop by giving you direct control over the entire supply chain:

| Stage | What Happens |
|-------|-------------|
| **Source** | Import products from Taobao by URL or search |
| **List** | Sync products to your Shopify store with markup |
| **Order** | Shopify orders flow in automatically via webhooks |
| **Purchase** | Platform buys items from Taobao suppliers |
| **QC** | Quality inspection at your Guangzhou warehouse |
| **Pack** | Repackage with your branding (blind shipping) |
| **Ship** | International delivery via YunExpress, 4PX, CNE |
| **Track** | Full tracking from warehouse to customer door |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Taobao    │────▶│  SuperBridge │────▶│    Shopify      │
│  (Source)   │     │  Platform    │     │  (Your Store)   │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────▼───────┐
                    │  Warehouse   │
                    │  QC · Pack   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Carriers    │
                    │  Global Ship │
                    └──────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
cd packages/api
cp .env.example .env
npx prisma db push
npm run db:seed

# Start both API and dashboard
cd ../..
npm run dev
```

- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3001

A demo merchant (`demo@superbly.com`) with $500 wallet balance is created on seed.

## How to Use

### 1. Connect Shopify
Go to **Settings** → enter your `store.myshopify.com` domain → Connect.

For testing without Shopify credentials, use **Demo Connect**.

### 2. Import Taobao Products
Go to **Products** → search the catalog or paste a Taobao URL → set your markup % → Import.

Try these demo item IDs: `tb-10001` (hoodie), `tb-10002` (earbuds), `tb-10003` (vase).

### 3. Sync to Shopify
Click **Sync to Shopify** on any imported product. It creates the listing in your store.

### 4. Fulfill Orders
When a customer orders:
1. Order appears in **Orders** (auto from Shopify webhook, or create a test order)
2. Click the order → **Advance** through: Pending → Sourcing → QC → Packed
3. Select a shipping route → Ship
4. Track delivery progress

### 5. Shipping
Use the **Shipping** page to calculate rates by weight and destination. Routes cover US, UK, EU, CA, AU, and global.

## Shipping Strategy (How to Conduct Shipping)

This is the operational playbook for running fulfillment without BuckyDrop:

### Warehouse Setup
1. **Location**: Rent space in Guangzhou or Shenzhen (near Taobao suppliers)
2. **Staff**: 1-2 warehouse workers for receiving, QC, and packing
3. **Supplies**: Branded poly mailers, boxes, bubble wrap, thank-you cards

### Per-Order Workflow
1. **Receive** — Taobao items arrive at warehouse (1-3 days domestic)
2. **QC** — Inspect each item: correct SKU, no defects, matches listing photos
3. **Repack** — Remove Taobao packaging/branding, pack in your branded materials
4. **Weigh** — Measure actual weight for accurate shipping cost
5. **Ship** — Choose route based on destination, urgency, and customs needs
6. **Track** — Push tracking number back to Shopify for customer notification

### Carrier Selection Guide

| Destination | Recommended | Delivery | Customs |
|------------|-------------|----------|---------|
| USA (fast) | YunExpress Express DDP | 7-12 days | Tax included |
| USA (cheap) | YunExpress Standard | 12-20 days | Customer pays |
| UK | 4PX Express DDP | 6-10 days | Tax included |
| EU | 4PX Standard | 10-18 days | Customer pays |
| Canada | CNE Express | 8-14 days | Customer pays |
| Australia | CNE Express | 7-12 days | Customer pays |
| Other | China Post ePacket | 15-30 days | Customer pays |

**DDP** (Delivered Duty Paid) = you pay import taxes, better customer experience.
**DDU** (Delivered Duty Unpaid) = customer pays customs, cheaper for you.

### Cost Structure
- **Product cost**: Taobao supplier price
- **Service fee**: 5% platform fee (configurable)
- **Domestic shipping**: ~$0.50-1.00 per Taobao order (China domestic)
- **International shipping**: Based on weight + route (see calculator)
- **QC/packing**: ~$0.30-0.50 per item

### Wallet System
Merchants pre-fund a wallet. When an order ships, total cost (product + service fee + shipping) is deducted automatically.

## Production Deployment

### Shopify App Setup
1. Create a [Shopify Partner](https://partners.shopify.com) account
2. Create a custom app with scopes: `read_products`, `write_products`, `read_orders`, `write_orders`
3. Set redirect URL to `https://your-api.com/api/shopify/callback`
4. Register webhook: `orders/create` → `https://your-api.com/api/shopify/webhooks/orders`
5. Add credentials to `.env`

### Taobao Integration
The demo uses a mock catalog. For production, choose one of:
- **Taobao Open Platform API** — requires business registration in China
- **1688 Open API** — better for wholesale, easier API access
- **Manual procurement team** — hire buyers on Taobao to purchase on your behalf
- **Browser extension** — build a Chrome extension that scrapes product data (like BuckyDrop's)

### Carrier API Integration
Contact these providers for API access:
- **YunExpress** (yunexpress.com) — best for US/UK DDP
- **4PX** (4px.com) — strong EU coverage
- **CNE** (cnexps.com) — good for CA/AU
- **ShipStation / Easyship** — aggregator that connects multiple carriers

## Project Structure

```
superbridge/
├── packages/
│   ├── api/                 # Express API server
│   │   ├── prisma/          # Database schema & seed
│   │   └── src/
│   │       ├── routes/      # API endpoints
│   │       └── services/    # Business logic
│   │           ├── taobao.ts    # Product sourcing
│   │           ├── shopify.ts   # Store integration
│   │           └── shipping.ts  # Fulfillment & logistics
│   └── web/                 # React dashboard
│       └── src/
│           ├── pages/       # Dashboard, Products, Orders, Shipping, Settings
│           └── components/  # Shared UI
└── package.json             # Monorepo root
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/merchants` | List merchants |
| GET | `/api/merchants/:id/dashboard` | Dashboard stats |
| POST | `/api/products/import` | Import from Taobao |
| GET | `/api/products/search?q=` | Search Taobao catalog |
| POST | `/api/products/:id/sync-shopify` | Push to Shopify |
| GET | `/api/shopify/connect` | Start OAuth flow |
| POST | `/api/shopify/webhooks/orders` | Receive Shopify orders |
| GET | `/api/orders` | List fulfillment orders |
| POST | `/api/orders/:id/advance` | Move through pipeline |
| POST | `/api/orders/:id/ship` | Create shipment |
| GET | `/api/shipping/routes` | List shipping routes |
| POST | `/api/shipping/quote` | Calculate shipping cost |

## License

MIT
