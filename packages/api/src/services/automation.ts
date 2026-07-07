import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { purchaseFromTaobao, type TaobaoPurchaseResult } from './taobao.js';
import { createOutboundLabel, type CustomerAddress, type WarehouseAddress } from './carriers.js';
import { pushFulfillmentToShopify } from './shopify.js';

function generateWarehouseRef(shopifyOrderNum?: string | null): string {
  const suffix = Date.now().toString(36).toUpperCase();
  const prefix = shopifyOrderNum?.replace('#', '') || 'ORD';
  return `SB-${prefix}-${suffix}`;
}

export async function startAutoFulfillment(orderId: string): Promise<void> {
  const order = await prisma.fulfillmentOrder.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      merchant: { include: { warehouse: true, automationSettings: true } },
      shop: true,
    },
  });

  if (!order) throw new AppError(404, 'Order not found');

  const settings = order.merchant.automationSettings;
  if (settings && !settings.autoPurchaseEnabled) {
    return;
  }

  const warehouse = order.merchant.warehouse;
  if (!warehouse) {
    await prisma.fulfillmentOrder.update({
      where: { id: orderId },
      data: {
        automationStatus: 'failed',
        automationError: 'Superbly warehouse address not configured. Go to Settings → Warehouse.',
        statusHistory: {
          create: {
            status: 'failed',
            note: 'Automation stopped: warehouse address missing',
          },
        },
      },
    });
    return;
  }

  const warehouseRef = order.warehouseRef || generateWarehouseRef(order.shopifyOrderNum);

  await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: {
      warehouseRef,
      automationStatus: 'running',
      status: 'taobao_ordered',
      statusHistory: {
        create: {
          status: 'taobao_ordered',
          note: `Auto-purchasing from Taobao → shipping to ${warehouse.name} (ref: ${warehouseRef})`,
        },
      },
    },
  });

  try {
    await autoPurchaseFromTaobao(orderId, {
      name: warehouse.name,
      contactName: warehouse.contactName,
      address1: warehouse.address1,
      address2: warehouse.address2 ?? undefined,
      city: warehouse.city,
      province: warehouse.province ?? undefined,
      country: warehouse.country,
      zip: warehouse.zip,
      phone: warehouse.phone ?? undefined,
    }, warehouseRef);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Taobao purchase failed';
    await prisma.fulfillmentOrder.update({
      where: { id: orderId },
      data: {
        automationStatus: 'failed',
        automationError: message,
        statusHistory: { create: { status: 'failed', note: message } },
      },
    });
  }
}

async function autoPurchaseFromTaobao(
  orderId: string,
  warehouse: WarehouseAddress,
  warehouseRef: string
): Promise<void> {
  const order = await prisma.fulfillmentOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });

  if (!order) throw new AppError(404, 'Order not found');

  const shipTo: WarehouseAddress = {
    name: warehouse.name,
    contactName: warehouse.contactName,
    address1: warehouse.address1,
    address2: warehouse.address2 || undefined,
    city: warehouse.city,
    province: warehouse.province || undefined,
    country: warehouse.country,
    zip: warehouse.zip,
    phone: warehouse.phone || undefined,
  };

  const purchaseIds: TaobaoPurchaseResult[] = [];

  for (const item of order.items) {
    const result = await purchaseFromTaobao({
      itemId: item.product.taobaoItemId,
      variantSku: item.variantSku || '',
      quantity: item.quantity,
      shipTo,
      orderRef: warehouseRef,
      buyerNote: `Superbly ref: ${warehouseRef} | Ship to warehouse — do NOT ship to customer`,
    });
    purchaseIds.push(result);
  }

  const inboundTracking = purchaseIds[0]?.inboundTracking || `IN${Date.now()}`;

  await prisma.shipment.create({
    data: {
      orderId,
      direction: 'inbound',
      carrier: 'Taobao',
      service: 'domestic_china',
      trackingNumber: inboundTracking,
      weight: order.items.reduce((s, i) => s + (i.product.weight || 0.3) * i.quantity, 0),
      shippingCost: 0.8,
      origin: 'Taobao Seller, China',
      destination: `${warehouse.city}, ${warehouse.country}`,
      status: 'in_transit',
      trackingEvents: {
        create: {
          status: 'in_transit',
          location: 'China',
          description: `Package en route to ${warehouse.name} — ref ${warehouseRef}`,
        },
      },
    },
  });

  await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: {
      taobaoPurchaseIds: JSON.stringify(purchaseIds.map((p) => p.purchaseOrderId)),
      inboundTracking,
      automationStatus: 'inbound',
      status: 'inbound_transit',
      statusHistory: {
        create: {
          status: 'inbound_transit',
          note: `Taobao order placed. Inbound tracking: ${inboundTracking}. Customer address stored — no manual entry needed at Superbly.`,
        },
      },
    },
  });
}

/** Called when package arrives at Superbly warehouse — auto-ships to customer */
export async function onWarehouseArrival(orderId: string): Promise<void> {
  const order = await prisma.fulfillmentOrder.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      merchant: { include: { automationSettings: true } },
      shop: true,
    },
  });

  if (!order) throw new AppError(404, 'Order not found');

  if (!['inbound_transit', 'taobao_ordered', 'at_warehouse'].includes(order.status)) {
    throw new AppError(400, `Cannot process warehouse arrival from status: ${order.status}`);
  }

  const settings = order.merchant.automationSettings;
  const customerAddress = JSON.parse(order.shippingAddress) as CustomerAddress;

  await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: {
      status: 'at_warehouse',
      automationStatus: 'at_warehouse',
      statusHistory: {
        create: {
          status: 'at_warehouse',
          note: `Package ${order.warehouseRef} arrived at Superbly warehouse`,
        },
      },
    },
  });

  if (settings && !settings.autoOutboundEnabled) {
    return;
  }

  const weight = order.items.reduce(
    (sum, item) => sum + (item.product.weight || 0.3) * item.quantity,
    0
  );

  const label = await createOutboundLabel(
    customerAddress,
    weight,
    order.warehouseRef || orderId,
    {
      carrier: settings?.outboundCarrier || 'demo',
      serviceCode: settings?.defaultServiceCode || undefined,
      shipstationApiKey: settings?.shipstationApiKey || undefined,
      shipstationApiSecret: settings?.shipstationApiSecret || undefined,
      shippoApiToken: settings?.shippoApiToken || undefined,
    }
  );

  await prisma.shipment.create({
    data: {
      orderId,
      direction: 'outbound',
      carrier: label.carrier,
      service: label.service,
      trackingNumber: label.trackingNumber,
      weight,
      shippingCost: label.cost,
      origin: 'Superbly Warehouse',
      destination: `${customerAddress.city}, ${customerAddress.country}`,
      status: 'label_created',
      labelUrl: label.labelUrl,
      trackingEvents: {
        create: {
          status: 'label_created',
          location: 'Superbly Warehouse',
          description: `Outbound label auto-created for ${customerAddress.name || 'customer'} — no manual address entry`,
        },
      },
    },
  });

  const totalCost = order.subtotal + order.serviceFee + label.cost;

  await prisma.fulfillmentOrder.update({
    where: { id: orderId },
    data: {
      status: 'shipped',
      automationStatus: 'shipped',
      trackingNumber: label.trackingNumber,
      carrier: label.carrier,
      shippingMethod: label.service,
      shippingCost: label.cost,
      totalCost,
      outboundLabelUrl: label.labelUrl,
      statusHistory: {
        create: {
          status: 'shipped',
          note: `Auto-shipped to customer via ${label.carrier} ${label.trackingNumber}`,
        },
      },
    },
  });

  await deductFromWallet(order.merchantId, totalCost, orderId);

  if (order.shop) {
    await pushFulfillmentToShopify(
      order.shop.shopDomain,
      order.shop.accessToken || '',
      order.shopifyOrderId || '',
      label.trackingNumber,
      label.carrier
    );
  }
}

/** Demo: simulate Taobao package arriving at Superbly and auto-ship to customer */
export async function simulateInboundArrival(orderId: string): Promise<void> {
  const order = await prisma.fulfillmentOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError(404, 'Order not found');
  if (order.status !== 'inbound_transit') {
    throw new AppError(400, 'Order must be in inbound_transit to simulate arrival');
  }

  const inbound = await prisma.shipment.findFirst({
    where: { orderId, direction: 'inbound' },
  });

  if (inbound) {
    await prisma.trackingEvent.create({
      data: {
        shipmentId: inbound.id,
        status: 'delivered',
        location: 'Superbly Warehouse',
        description: 'Inbound package received at Superbly warehouse',
      },
    });
    await prisma.shipment.update({
      where: { id: inbound.id },
      data: { status: 'delivered', deliveredAt: new Date() },
    });
  }

  await onWarehouseArrival(orderId);
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
      description: 'Auto-fulfillment: product + outbound shipping',
      referenceId: orderId,
    },
  });
}
