import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, AppError } from '../lib/errors.js';
import { paramId } from '../lib/params.js';
import { fetchTaobaoProduct, searchTaobaoProducts } from '../services/taobao.js';
import { syncProductToShopify } from '../services/shopify.js';

export const productRoutes = Router();

productRoutes.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '');
    const results = await searchTaobaoProducts(q);
    res.json({ products: results });
  })
);

productRoutes.post(
  '/import',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        merchantId: z.string(),
        shopId: z.string().optional(),
        url: z.string(),
        markupPercent: z.number().default(200),
      })
      .parse(req.body);

    const taobaoProduct = await fetchTaobaoProduct(body.url);
    if (!taobaoProduct) throw new AppError(404, 'Could not fetch Taobao product');

    const minPrice = Math.min(...taobaoProduct.variants.map((v) => v.price));
    const totalStock = taobaoProduct.variants.reduce((s, v) => s + v.stock, 0);

    const product = await prisma.sourcedProduct.create({
      data: {
        merchantId: body.merchantId,
        shopId: body.shopId,
        taobaoItemId: taobaoProduct.itemId,
        taobaoUrl: taobaoProduct.url,
        title: taobaoProduct.title,
        description: taobaoProduct.description,
        images: JSON.stringify(taobaoProduct.images),
        variants: JSON.stringify(taobaoProduct.variants),
        supplierName: taobaoProduct.supplierName,
        supplierPrice: minPrice,
        markupPercent: body.markupPercent,
        stock: totalStock,
        category: taobaoProduct.category,
        weight: taobaoProduct.weight || 0.3,
        status: 'draft',
      },
    });

    res.status(201).json({ product });
  })
);

productRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const merchantId = String(req.query.merchantId || '');
    const products = await prisma.sourcedProduct.findMany({
      where: merchantId ? { merchantId } : undefined,
      include: { shop: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ products });
  })
);

productRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = paramId(req.params.id);
    const product = await prisma.sourcedProduct.findUnique({
      where: { id },
      include: { shop: true },
    });
    if (!product) throw new AppError(404, 'Product not found');
    res.json({ product });
  })
);

productRoutes.post(
  '/:id/sync-shopify',
  asyncHandler(async (req, res) => {
    const result = await syncProductToShopify(paramId(req.params.id));
    res.json(result);
  })
);

productRoutes.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        markupPercent: z.number().optional(),
        sellingPrice: z.number().optional(),
        titleEn: z.string().optional(),
        status: z.string().optional(),
      })
      .parse(req.body);

    const id = paramId(req.params.id);
    const product = await prisma.sourcedProduct.update({
      where: { id },
      data: body,
    });
    res.json({ product });
  })
);

productRoutes.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.sourcedProduct.delete({ where: { id: paramId(req.params.id) } });
    res.json({ success: true });
  })
);
