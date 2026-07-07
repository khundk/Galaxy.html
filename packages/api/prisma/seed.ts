import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const merchant = await prisma.merchant.upsert({
    where: { email: 'demo@superbly.com' },
    create: {
      email: 'demo@superbly.com',
      name: 'Superbly Store',
      company: 'Superbly E-Commerce',
      walletBalance: 500,
    },
    update: {},
  });

  await prisma.shopifyShop.upsert({
    where: { shopDomain: 'superbly-demo.myshopify.com' },
    create: {
      merchantId: merchant.id,
      shopDomain: 'superbly-demo.myshopify.com',
      accessToken: 'demo_token_superbly',
      isConnected: true,
      installedAt: new Date(),
    },
    update: { isConnected: true },
  });

  const shop = await prisma.shopifyShop.findUnique({
    where: { shopDomain: 'superbly-demo.myshopify.com' },
  });

  const shippingRoutes = [
    { name: 'US Express DDP', carrier: 'YunExpress', service: 'express_ddp', destinationZone: 'US', minDays: 7, maxDays: 12, baseRate: 4.5, perKgRate: 8.2, includesCustoms: true, description: 'Tax-inclusive express to USA' },
    { name: 'US Standard', carrier: 'YunExpress', service: 'standard', destinationZone: 'US', minDays: 12, maxDays: 20, baseRate: 3.2, perKgRate: 5.8, includesCustoms: false, description: 'Economy shipping to USA' },
    { name: 'UK Express DDP', carrier: '4PX', service: 'express_ddp', destinationZone: 'UK', minDays: 6, maxDays: 10, baseRate: 4.0, perKgRate: 7.5, includesCustoms: true, description: 'Tax-inclusive express to UK' },
    { name: 'EU Standard', carrier: '4PX', service: 'standard', destinationZone: 'EU', minDays: 10, maxDays: 18, baseRate: 3.5, perKgRate: 6.2, includesCustoms: false, description: 'Economy shipping to Europe' },
    { name: 'Canada Express', carrier: 'CNE', service: 'express', destinationZone: 'CA', minDays: 8, maxDays: 14, baseRate: 4.2, perKgRate: 7.8, includesCustoms: false, description: 'Express to Canada' },
    { name: 'Australia Express', carrier: 'CNE', service: 'express', destinationZone: 'AU', minDays: 7, maxDays: 12, baseRate: 4.8, perKgRate: 8.5, includesCustoms: false, description: 'Express to Australia' },
    { name: 'Global Economy', carrier: 'China Post', service: 'e_packet', destinationZone: 'GLOBAL', minDays: 15, maxDays: 30, baseRate: 2.5, perKgRate: 4.5, includesCustoms: false, description: 'Worldwide economy shipping' },
  ];

  for (const route of shippingRoutes) {
    const existing = await prisma.shippingRoute.findFirst({
      where: { name: route.name, carrier: route.carrier },
    });
    if (!existing) {
      await prisma.shippingRoute.create({ data: route });
    }
  }

  await prisma.walletTransaction.create({
    data: {
      merchantId: merchant.id,
      type: 'deposit',
      amount: 500,
      balance: 500,
      description: 'Initial demo wallet balance',
    },
  });

  await prisma.warehouse.upsert({
    where: { merchantId: merchant.id },
    create: {
      merchantId: merchant.id,
      name: 'Superbly Warehouse',
      contactName: 'Receiving Dept',
      address1: '123 Superbly Way',
      city: 'Los Angeles',
      province: 'CA',
      country: 'US',
      zip: '90001',
      phone: '+1-555-0100',
    },
    update: {},
  });

  await prisma.automationSettings.upsert({
    where: { merchantId: merchant.id },
    create: {
      merchantId: merchant.id,
      autoPurchaseEnabled: true,
      autoOutboundEnabled: true,
      outboundCarrier: 'demo',
    },
    update: {},
  });

  console.log('Seed complete!');
  console.log(`Demo merchant ID: ${merchant.id}`);
  console.log(`Demo shop ID: ${shop?.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
