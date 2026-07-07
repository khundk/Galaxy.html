import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { paramId } from '../lib/params.js';
import {
  getShippingQuotes,
  createShipment,
  advanceOrderPipeline,
  recordQC,
  simulateTrackingProgress,
} from '../services/shipping.js';

export const orderRoutes = Router();

orderRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const merchantId = String(req.query.merchantId || '');
    const orders = await prisma.fulfillmentOrder.findMany({
      where: merchantId ? { merchantId } : undefined,
      include: {
        items: { include: { product: true } },
        shipments: true,
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ orders });
  })
);

orderRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const order = await prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        shipments: { include: { trackingEvents: { orderBy: { occurredAt: 'desc' } } } },
        qcRecords: { orderBy: { inspectedAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new AppError(404, 'Order not found');
    res.json({ order });
  })
);

orderRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        merchantId: z.string(),
        shopId: z.string().optional(),
        customerName: z.string(),
        customerEmail: z.string().optional(),
        shippingAddress: z.object({
          name: z.string().optional(),
          address1: z.string(),
          city: z.string(),
          province: z.string().optional(),
          country: z.string(),
          zip: z.string(),
          phone: z.string().optional(),
        }),
        items: z.array(
          z.object({
            productId: z.string(),
            variantSku: z.string().optional(),
            variantName: z.string().optional(),
            quantity: z.number().int().positive(),
          })
        ),
      })
      .parse(req.body);

    let subtotal = 0;
    const orderItems: Array<{
      productId: string;
      variantSku?: string;
      variantName?: string;
      quantity: number;
      unitCost: number;
      unitPrice: number;
    }> = [];

    for (const item of body.items) {
      const product = await prisma.sourcedProduct.findUnique({ where: { id: item.productId } });
      if (!product) throw new AppError(404, `Product ${item.productId} not found`);
      const unitCost = product.supplierPrice;
      const unitPrice = product.sellingPrice || unitCost * (1 + product.markupPercent / 100);
      orderItems.push({
        productId: item.productId,
        variantSku: item.variantSku,
        variantName: item.variantName,
        quantity: item.quantity,
        unitCost,
        unitPrice,
      });
      subtotal += unitCost * item.quantity;
    }

    const order = await prisma.fulfillmentOrder.create({
      data: {
        merchantId: body.merchantId,
        shopId: body.shopId,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        shippingAddress: JSON.stringify(body.shippingAddress),
        status: 'pending',
        subtotal,
        serviceFee: subtotal * 0.05,
        totalCost: subtotal * 1.05,
        items: { create: orderItems },
        statusHistory: { create: { status: 'pending', note: 'Manual order created' } },
      },
      include: { items: { include: { product: true } } },
    });

    res.status(201).json({ order });
  })
);

orderRoutes.post(
  '/:id/advance',
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const newStatus = await advanceOrderPipeline(id);
    const order = await prisma.fulfillmentOrder.findUnique({ where: { id } });
    res.json({ status: newStatus, order });
  })
);

orderRoutes.post(
  '/:id/qc',
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const body = z
      .object({
        result: z.enum(['pass', 'minor_flaw', 'major_defect', 'reject']),
        notes: z.string().optional(),
      })
      .parse(req.body);

    await recordQC(id, body.result, body.notes);
    const order = await prisma.fulfillmentOrder.findUnique({ where: { id } });
    res.json({ order });
  })
);

orderRoutes.get(
  '/:id/shipping-quotes',
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const order = await prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new AppError(404, 'Order not found');

    const address = JSON.parse(order.shippingAddress);
    const weight = order.items.reduce(
      (sum: number, item) => sum + (item.product.weight || 0.3) * item.quantity,
      0
    );

    const quotes = await getShippingQuotes(weight, address);
    res.json({ quotes, weight });
  })
);

orderRoutes.post(
  '/:id/ship',
  asyncHandler(async (req, res) => {
    const body = z.object({ routeId: z.string() }).parse(req.body);
    const result = await createShipment(paramId(req.params.id), body.routeId);
    res.json(result);
  })
);

orderRoutes.post(
  '/:id/tracking/simulate',
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const order = await prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: { shipments: true },
    });
    if (!order?.shipments[0]) throw new AppError(404, 'No shipment found');
    await simulateTrackingProgress(order.shipments[0].id);
    const updated = await prisma.fulfillmentOrder.findUnique({
      where: { id },
      include: { shipments: { include: { trackingEvents: true } } },
    });
    res.json({ order: updated });
  })
);
