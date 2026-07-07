import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { productRoutes } from './routes/products.js';
import { shopifyRoutes } from './routes/shopify.js';
import { orderRoutes } from './routes/orders.js';
import { shippingRoutes } from './routes/shipping.js';
import { merchantRoutes } from './routes/merchants.js';
import { warehouseRoutes } from './routes/warehouse.js';
import { errorHandler } from './lib/errors.js';
import { config } from './lib/config.js';

const app = express();

app.use(cors({ origin: config.appUrl }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'SuperBridge API',
    version: '1.0.0',
    description: 'Taobao-to-Shopify fulfillment platform',
  });
});

app.use('/api/warehouse', warehouseRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shipping', shippingRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`SuperBridge API running on http://localhost:${config.port}`);
});
