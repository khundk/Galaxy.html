import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { paramId } from '../lib/params.js';

export const merchantRoutes = Router();

merchantRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const merchants = await prisma.merchant.findMany({
      include: {
        shops: true,
        _count: { select: { products: true, orders: true } },
      },
    });
    res.json({ merchants });
  })
);

merchantRoutes.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        email: z.string().email(),
        name: z.string(),
        company: z.string().optional(),
      })
      .parse(req.body);

    const merchant = await prisma.merchant.create({ data: body });
    res.status(201).json({ merchant });
  })
);

merchantRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: {
        shops: true,
        walletTxns: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { products: true, orders: true } },
      },
    });
    if (!merchant) throw new AppError(404, 'Merchant not found');
    res.json({ merchant });
  })
);

merchantRoutes.post(
  '/:id/wallet/deposit',
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const body = z.object({ amount: z.number().positive() }).parse(req.body);
    const merchant = await prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new AppError(404, 'Merchant not found');

    const newBalance = merchant.walletBalance + body.amount;
    await prisma.merchant.update({
      where: { id },
      data: { walletBalance: newBalance },
    });

    const txn = await prisma.walletTransaction.create({
      data: {
        merchantId: id,
        type: 'deposit',
        amount: body.amount,
        balance: newBalance,
        description: 'Wallet top-up',
      },
    });

    res.json({ balance: newBalance, transaction: txn });
  })
);

merchantRoutes.get(
  '/:id/dashboard',
  asyncHandler(async (req, res) => {
    const merchantId = paramId(req.params.id);
    const [products, orders, merchant] = await Promise.all([
      prisma.sourcedProduct.count({ where: { merchantId } }),
      prisma.fulfillmentOrder.findMany({
        where: { merchantId },
        select: { status: true, totalCost: true },
      }),
      prisma.merchant.findUnique({ where: { id: merchantId } }),
    ]);

    const ordersByStatus = orders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalSpent = orders.reduce((sum, o) => sum + o.totalCost, 0);

    res.json({
      stats: {
        totalProducts: products,
        totalOrders: orders.length,
        ordersByStatus,
        walletBalance: merchant?.walletBalance || 0,
        totalSpent,
      },
    });
  })
);
