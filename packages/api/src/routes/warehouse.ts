import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { paramId } from '../lib/params.js';

export const warehouseRoutes = Router();

warehouseRoutes.get(
  '/:merchantId',
  asyncHandler(async (req, res) => {
    const merchantId = paramId(req.params.merchantId);
    const warehouse = await prisma.warehouse.findUnique({ where: { merchantId } });
    res.json({ warehouse });
  })
);

warehouseRoutes.put(
  '/:merchantId',
  asyncHandler(async (req, res) => {
    const merchantId = paramId(req.params.merchantId);
    const body = z
      .object({
        name: z.string().default('Superbly Warehouse'),
        contactName: z.string(),
        address1: z.string(),
        address2: z.string().optional(),
        city: z.string(),
        province: z.string().optional(),
        country: z.string(),
        zip: z.string(),
        phone: z.string().optional(),
      })
      .parse(req.body);

    const warehouse = await prisma.warehouse.upsert({
      where: { merchantId },
      create: { merchantId, ...body },
      update: body,
    });

    res.json({ warehouse });
  })
);

warehouseRoutes.get(
  '/:merchantId/automation',
  asyncHandler(async (req, res) => {
    const merchantId = paramId(req.params.merchantId);
    const settings = await prisma.automationSettings.findUnique({ where: { merchantId } });
    res.json({ settings });
  })
);

warehouseRoutes.put(
  '/:merchantId/automation',
  asyncHandler(async (req, res) => {
    const merchantId = paramId(req.params.merchantId);
    const body = z
      .object({
        autoPurchaseEnabled: z.boolean().optional(),
        autoOutboundEnabled: z.boolean().optional(),
        outboundCarrier: z.enum(['demo', 'shipstation', 'shippo']).optional(),
        defaultServiceCode: z.string().optional(),
        shipstationApiKey: z.string().optional(),
        shipstationApiSecret: z.string().optional(),
        shippoApiToken: z.string().optional(),
      })
      .parse(req.body);

    const settings = await prisma.automationSettings.upsert({
      where: { merchantId },
      create: { merchantId, ...body },
      update: body,
    });

    res.json({ settings });
  })
);
