import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { config } from '../lib/config.js';
import {
  getShopifyAuthUrl,
  handleShopifyCallback,
  processShopifyOrderWebhook,
} from '../services/shopify.js';

export const shopifyRoutes = Router();

shopifyRoutes.get(
  '/connect',
  asyncHandler(async (req, res) => {
    const shop = String(req.query.shop || '');
    const merchantId = String(req.query.merchantId || '');
    if (!shop || !merchantId) throw new AppError(400, 'shop and merchantId required');

    const authUrl = getShopifyAuthUrl(shop, merchantId);
    res.json({ authUrl });
  })
);

shopifyRoutes.get(
  '/callback',
  asyncHandler(async (req, res) => {
    const { shop, code, state } = req.query;
    if (!shop || !code || !state) throw new AppError(400, 'Missing OAuth parameters');

    const { merchantId } = JSON.parse(
      Buffer.from(String(state), 'base64url').toString()
    ) as { merchantId: string };

    await handleShopifyCallback(String(shop), String(code), merchantId);
    res.redirect(`${config.appUrl}/settings?shopify=connected`);
  })
);

shopifyRoutes.post(
  '/webhooks/orders',
  asyncHandler(async (req, res) => {
    const shopDomain = String(req.headers['x-shopify-shop-domain'] || req.body.shop_domain || '');
    const orderId = await processShopifyOrderWebhook(shopDomain, req.body);
    res.json({ orderId });
  })
);

shopifyRoutes.get(
  '/shops',
  asyncHandler(async (req, res) => {
    const merchantId = String(req.query.merchantId || '');
    const shops = await prisma.shopifyShop.findMany({
      where: merchantId ? { merchantId } : undefined,
    });
    res.json({ shops });
  })
);

shopifyRoutes.post(
  '/shops/demo',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        merchantId: z.string(),
        shopDomain: z.string(),
      })
      .parse(req.body);

    const shop = await prisma.shopifyShop.upsert({
      where: { shopDomain: body.shopDomain },
      create: {
        merchantId: body.merchantId,
        shopDomain: body.shopDomain,
        accessToken: `demo_token_${body.shopDomain}`,
        isConnected: true,
        installedAt: new Date(),
      },
      update: { isConnected: true },
    });

    res.json({ shop });
  })
);
