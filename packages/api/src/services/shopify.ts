import { config } from '../lib/config.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';

export function getShopifyAuthUrl(shopDomain: string, merchantId: string): string {
  const shop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const redirectUri = `${config.apiUrl}/api/shopify/callback`;
  const state = Buffer.from(JSON.stringify({ merchantId, shop })).toString('base64url');

  const params = new URLSearchParams({
    client_id: config.shopify.apiKey,
    scope: config.shopify.scopes,
    redirect_uri: redirectUri,
    state,
  });

  return `https://${shop}/admin/oauth/authorize?${params}`;
}

export async function handleShopifyCallback(
  shop: string,
  code: string,
  merchantId: string
): Promise<void> {
  const shopDomain = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');

  let accessToken = `demo_token_${shopDomain}`;

  if (config.shopify.apiKey && config.shopify.apiSecret) {
    const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.shopify.apiKey,
        client_secret: config.shopify.apiSecret,
        code,
      }),
    });

    if (!response.ok) {
      throw new AppError(400, 'Failed to exchange Shopify OAuth code');
    }

    const data = (await response.json()) as { access_token: string };
    accessToken = data.access_token;
  }

  await prisma.shopifyShop.upsert({
    where: { shopDomain },
    create: {
      merchantId,
      shopDomain,
      accessToken,
      isConnected: true,
      installedAt: new Date(),
    },
    update: {
      accessToken,
      isConnected: true,
      installedAt: new Date(),
    },
  });
}

export async function syncProductToShopify(productId: string): Promise<{ shopifyProductId: string }> {
  const product = await prisma.sourcedProduct.findUnique({
    where: { id: productId },
    include: { shop: true },
  });

  if (!product) throw new AppError(404, 'Product not found');
  if (!product.shop?.isConnected) throw new AppError(400, 'Shopify store not connected');

  const variants = JSON.parse(product.variants) as Array<{ skuId: string; name: string; price: number }>;
  const images = JSON.parse(product.images) as string[];
  const sellingPrice = product.sellingPrice || product.supplierPrice * (1 + product.markupPercent / 100);

  const shopifyProduct = {
    product: {
      title: product.titleEn || product.title,
      body_html: product.description || '',
      vendor: 'SuperBridge',
      product_type: product.category || 'General',
      images: images.map((src) => ({ src })),
      variants: variants.map((v) => ({
        option1: v.name,
        price: sellingPrice.toFixed(2),
        sku: v.skuId,
        inventory_management: 'shopify',
        inventory_quantity: product.stock,
      })),
    },
  };

  let shopifyProductId = `gid://shopify/Product/${Date.now()}`;

  if (product.shop.accessToken && !product.shop.accessToken.startsWith('demo_')) {
    const response = await fetch(
      `https://${product.shop.shopDomain}/admin/api/2024-10/products.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': product.shop.accessToken,
        },
        body: JSON.stringify(shopifyProduct),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new AppError(400, `Shopify sync failed: ${err}`);
    }

    const data = (await response.json()) as { product: { id: number } };
    shopifyProductId = String(data.product.id);
  }

  await prisma.sourcedProduct.update({
    where: { id: productId },
    data: {
      shopifyProductId,
      shopifySynced: true,
      sellingPrice,
      status: 'active',
    },
  });

  return { shopifyProductId };
}

export async function processShopifyOrderWebhook(
  shopDomain: string,
  orderData: ShopifyOrderPayload
): Promise<string> {
  const shop = await prisma.shopifyShop.findUnique({
    where: { shopDomain },
    include: { merchant: true },
  });

  if (!shop) throw new AppError(404, 'Shop not found');

  const existing = await prisma.fulfillmentOrder.findFirst({
    where: { shopifyOrderId: String(orderData.id) },
  });
  if (existing) return existing.id;

  const lineItems = orderData.line_items || [];
  const orderItems: Array<{
    productId: string;
    variantSku: string;
    variantName: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
  }> = [];

  let subtotal = 0;

  for (const item of lineItems) {
    const product = await prisma.sourcedProduct.findFirst({
      where: {
        shopId: shop.id,
        OR: [
          { shopifyProductId: String(item.product_id) },
          { title: { contains: item.title } },
        ],
      },
    });

    if (product) {
      const unitCost = product.supplierPrice;
      const unitPrice = parseFloat(item.price);
      orderItems.push({
        productId: product.id,
        variantSku: item.sku || '',
        variantName: item.variant_title || item.title,
        quantity: item.quantity,
        unitCost,
        unitPrice,
      });
      subtotal += unitCost * item.quantity;
    }
  }

  const shippingAddr = orderData.shipping_address || orderData.billing_address;
  const address = shippingAddr
    ? {
        name: `${shippingAddr.first_name || ''} ${shippingAddr.last_name || ''}`.trim(),
        address1: shippingAddr.address1,
        address2: shippingAddr.address2,
        city: shippingAddr.city,
        province: shippingAddr.province,
        country: shippingAddr.country,
        zip: shippingAddr.zip,
        phone: shippingAddr.phone,
      }
    : {};

  const order = await prisma.fulfillmentOrder.create({
    data: {
      merchantId: shop.merchantId,
      shopId: shop.id,
      shopifyOrderId: String(orderData.id),
      shopifyOrderNum: orderData.name || `#${orderData.order_number}`,
      customerName: address.name || orderData.email || 'Customer',
      customerEmail: orderData.email,
      shippingAddress: JSON.stringify(address),
      status: 'pending',
      subtotal,
      serviceFee: subtotal * 0.05,
      totalCost: subtotal * 1.05,
      items: {
        create: orderItems,
      },
      statusHistory: {
        create: { status: 'pending', note: 'Order received from Shopify' },
      },
    },
  });

  return order.id;
}

interface ShopifyOrderPayload {
  id: number;
  name?: string;
  order_number?: number;
  email?: string;
  line_items?: Array<{
    product_id: number;
    title: string;
    variant_title?: string;
    sku?: string;
    quantity: number;
    price: string;
  }>;
  shipping_address?: AddressPayload;
  billing_address?: AddressPayload;
}

interface AddressPayload {
  first_name?: string;
  last_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
}
