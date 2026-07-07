import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { paramId } from '../lib/params.js';
import { getShippingQuotes } from '../services/shipping.js';

export const shippingRoutes = Router();

shippingRoutes.get(
  '/routes',
  asyncHandler(async (_req, res) => {
    const routes = await prisma.shippingRoute.findMany({
      where: { isActive: true },
      orderBy: [{ destinationZone: 'asc' }, { baseRate: 'asc' }],
    });
    res.json({ routes });
  })
);

shippingRoutes.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        weight: z.number().positive(),
        country: z.string(),
        city: z.string().optional(),
      })
      .parse(req.body);

    const quotes = await getShippingQuotes(body.weight, { country: body.country, city: body.city });
    res.json({ quotes });
  })
);

shippingRoutes.get(
  '/track/:trackingNumber',
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.findFirst({
      where: { trackingNumber: paramId(req.params.trackingNumber) },
      include: {
        trackingEvents: { orderBy: { occurredAt: 'desc' } },
        order: true,
      },
    });
    if (!shipment) throw new AppError(404, 'Tracking number not found');
    res.json({ shipment });
  })
);
