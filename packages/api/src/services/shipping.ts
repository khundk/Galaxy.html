import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { purchaseFromTaobao } from './taobao.js';

export interface ShippingQuote {
  routeId: string;
  name: string;
  carrier: string;
  service: string;
  cost: number;
  minDays: number;
  maxDays: number;
  includesCustoms: boolean;
}

export interface ShippingAddress {
  country: string;
  city?: string;
  zip?: string;
}

export async function getShippingQuotes(
  weight: number,
  destination: ShippingAddress
): Promise<ShippingQuote[]> {
  const zone = resolveZone(destination.country);
  const routes = await prisma.shippingRoute.findMany({
    where: { isActive: true, destinationZone: zone },
    orderBy: { baseRate: 'asc' },
  });

  if (routes.length === 0) {
    const globalRoutes = await prisma.shippingRoute.findMany({
      where: { isActive: true, destinationZone: 'GLOBAL' },
    });
    return globalRoutes.map((r) => calculateQuote(r, weight));
  }

  return routes.map((r) => calculateQuote(r, weight));
}

function calculateQuote(
  route: {
    id: string;
    name: string;
    carrier: string;
    service: string;
    baseRate: number;
    perKgRate: number;
    minDays: number;
    maxDays: number;
    includesCustoms: boolean;
  },
  weight: number
): ShippingQuote {
  const billableWeight = Math.max(weight, 0.1);
  const cost = Math.round((route.baseRate + route.perKgRate * billableWeight) * 100) / 100;
  return {
    routeId: route.id,
    name: route.name,
    carrier: route.carrier,
    service: route.service,
    cost,
    minDays: route.minDays,
    maxDays: route.maxDays,
    includesCustoms: route.includesCustoms,
  };
}

function resolveZone(country: string): string {
  const c = country.toUpperCase();
  if (['US', 'USA', 'UNITED STATES'].includes(c)) return 'US';
  if (['GB', 'UK', 'UNITED KINGDOM'].includes(c)) return 'UK';
  if (['CA', 'CANADA'].includes(c)) return 'CA';
  if (['AU', 'AUSTRALIA'].includes(c)) return 'AU';
  if (
    ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PL', 'SE', 'DK', 'FI', 'IE', 'PT'].includes(c)
  )
    return 'EU';
  return 'GLOBAL';
}

export async function createShipment(
  orderId: string,
  routeId: string
): Promise<{ shipmentId: string; trackingNumber: string }> {
  const order = await prisma.fulfillmentOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) throw new AppError(404, 'Order not found');
  if (!['packed', 'qc'].includes(order.status)) {
    throw new AppError(400, 'Order must pass QC and be packed before shipping');
  }

  const route = await prisma.shippingRoute.findUnique({ where: { id: routeId } });
  if (!route) throw new AppError(404, 'Shipping route not found');

  const totalWeight = order.items.reduce(
    (sum, item) => sum + (item.product.weight || 0.3) * item.quantity,
    0
  );

  const quote = calculateQuote(route, totalWeight);
  const address = JSON.parse(order.shippingAddress) as ShippingAddress & { city?: string };
  const trackingNumber = generateTrackingNumber(route.carrier);

  const shipment = await prisma.shipment.create({
    data: {
      orderId,
      carrier: route.carrier,
      service: route.service,
      trackingNumber,
      weight: totalWeight,
      shippingCost: quote.cost,
      destination: `${address.city || ''}, ${address.country}`.trim(),
      status: 'label_created',
      labelUrl: `/api/shipments/${orderId}/label`,
      trackingEvents: {
        create: {
          status: 'label_created',
          location: 'Guangzhou, China',
          description: 'Shipping label created at SuperBridge warehouse',
        },
      },
    },
  });

  const totalCost = order.subtotal + order.serviceFee + quote.cost;

  await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: {
      status: 'shipped',
      carrier: route.carrier,
      shippingMethod: route.name,
      shippingCost: quote.cost,
      totalCost,
      trackingNumber,
      statusHistory: {
        create: {
          status: 'shipped',
          note: `Shipped via ${route.name} — ${trackingNumber}`,
        },
      },
    },
  });

  // Deduct from merchant wallet
  await deductFromWallet(order.merchantId, totalCost, orderId);

  return { shipmentId: shipment.id, trackingNumber };
}

export async function advanceOrderPipeline(orderId: string): Promise<string> {
  const order = await prisma.fulfillmentOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) throw new AppError(404, 'Order not found');

  switch (order.status) {
    case 'pending': {
      // Source products from Taobao
      for (const item of order.items) {
        await purchaseFromTaobao(
          item.product.taobaoItemId,
          item.variantSku || '',
          item.quantity
        );
      }
      await updateOrderStatus(orderId, 'sourcing', 'Purchasing items from Taobao suppliers');
      return 'sourcing';
    }
    case 'sourcing': {
      await updateOrderStatus(orderId, 'qc', 'Items arrived at warehouse — QC in progress');
      return 'qc';
    }
    case 'qc': {
      await prisma.qCRecord.create({
        data: {
          orderId,
          inspector: 'QC Team',
          result: 'pass',
          notes: 'All items passed quality inspection',
        },
      });
      await updateOrderStatus(orderId, 'packed', 'QC passed — order packed and ready to ship');
      return 'packed';
    }
    default:
      throw new AppError(400, `Cannot advance order from status: ${order.status}`);
  }
}

export async function recordQC(
  orderId: string,
  result: 'pass' | 'minor_flaw' | 'major_defect' | 'reject',
  notes?: string
): Promise<void> {
  await prisma.qCRecord.create({
    data: { orderId, inspector: 'QC Team', result, notes },
  });

  if (result === 'pass' || result === 'minor_flaw') {
    await updateOrderStatus(orderId, 'packed', `QC ${result} — ready for shipping`);
  } else {
    await updateOrderStatus(orderId, 'sourcing', `QC ${result} — re-sourcing required`);
  }
}

async function updateOrderStatus(orderId: string, status: string, note: string) {
  await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: {
      status,
      statusHistory: { create: { status, note } },
    },
  });
}

async function deductFromWallet(merchantId: string, amount: number, orderId: string) {
  const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
  if (!merchant) return;

  const newBalance = merchant.walletBalance - amount;
  await prisma.merchant.update({
    where: { id: merchantId },
    data: { walletBalance: newBalance },
  });

  await prisma.walletTransaction.create({
    data: {
      merchantId,
      type: 'deduction',
      amount: -amount,
      balance: newBalance,
      description: `Fulfillment cost for order`,
      referenceId: orderId,
    },
  });
}

function generateTrackingNumber(carrier: string): string {
  const prefix = carrier.substring(0, 2).toUpperCase();
  return `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export async function simulateTrackingProgress(shipmentId: string): Promise<void> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment) throw new AppError(404, 'Shipment not found');

  const stages = [
    { status: 'picked_up', location: 'Guangzhou, China', description: 'Package picked up from warehouse' },
    { status: 'in_transit', location: 'Hong Kong', description: 'Departed origin facility' },
    { status: 'in_transit', location: 'In transit', description: 'Package in international transit' },
    { status: 'customs', location: 'Destination customs', description: 'Customs clearance in progress' },
    { status: 'out_for_delivery', location: shipment.destination, description: 'Out for delivery' },
    { status: 'delivered', location: shipment.destination, description: 'Package delivered' },
  ];

  const currentIdx = stages.findIndex((s) => s.status === shipment.status);
  const nextStage = stages[Math.max(0, currentIdx + 1)] || stages[stages.length - 1];

  await prisma.trackingEvent.create({
    data: {
      shipmentId,
      ...nextStage,
    },
  });

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      status: nextStage.status,
      ...(nextStage.status === 'delivered' ? { deliveredAt: new Date() } : {}),
      ...(nextStage.status === 'picked_up' ? { shippedAt: new Date() } : {}),
    },
  });

  if (nextStage.status === 'delivered') {
    await prisma.fulfillmentOrder.update({
      where: { id: shipment.orderId },
      data: {
        status: 'delivered',
        statusHistory: { create: { status: 'delivered', note: 'Package delivered to customer' } },
      },
    });
  }
}
