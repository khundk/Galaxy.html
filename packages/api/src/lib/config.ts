export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  shopify: {
    apiKey: process.env.SHOPIFY_API_KEY || '',
    apiSecret: process.env.SHOPIFY_API_SECRET || '',
    scopes: process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders',
  },
  warehouse: {
    address: process.env.WAREHOUSE_ADDRESS || 'SuperBridge Warehouse, Guangzhou, China',
    city: 'Guangzhou',
    country: 'CN',
  },
};
