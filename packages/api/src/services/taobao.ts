export interface TaobaoVariant {
  skuId: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
}

export interface TaobaoProduct {
  itemId: string;
  url: string;
  title: string;
  description?: string;
  images: string[];
  variants: TaobaoVariant[];
  supplierName?: string;
  category?: string;
  weight?: number;
}

// Demo catalog — replace with Taobao Open Platform / scraping service in production
const DEMO_CATALOG: TaobaoProduct[] = [
  {
    itemId: 'tb-10001',
    url: 'https://item.taobao.com/item.htm?id=10001',
    title: '韩版休闲连帽卫衣 男女同款',
    description: 'Premium cotton blend hoodie, unisex fit, multiple colors.',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600',
      'https://images.unsplash.com/photo-1578587018453-892bacefd3af?w=600',
    ],
    variants: [
      { skuId: 'tb-10001-black-m', name: 'Black / M', price: 4.5, stock: 500 },
      { skuId: 'tb-10001-black-l', name: 'Black / L', price: 4.5, stock: 320 },
      { skuId: 'tb-10001-white-m', name: 'White / M', price: 4.8, stock: 280 },
      { skuId: 'tb-10001-white-l', name: 'White / L', price: 4.8, stock: 150 },
    ],
    supplierName: '广州潮流服饰店',
    category: 'Apparel',
    weight: 0.45,
  },
  {
    itemId: 'tb-10002',
    url: 'https://item.taobao.com/item.htm?id=10002',
    title: '无线蓝牙耳机 降噪款',
    description: 'TWS earbuds with active noise cancellation, 30hr battery.',
    images: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600',
      'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600',
    ],
    variants: [
      { skuId: 'tb-10002-white', name: 'White', price: 8.2, stock: 1200 },
      { skuId: 'tb-10002-black', name: 'Black', price: 8.2, stock: 980 },
    ],
    supplierName: '深圳数码科技',
    category: 'Electronics',
    weight: 0.12,
  },
  {
    itemId: 'tb-10003',
    url: 'https://item.taobao.com/item.htm?id=10003',
    title: '北欧风陶瓷花瓶 家居装饰',
    description: 'Minimalist ceramic vase, matte finish, 25cm height.',
    images: [
      'https://images.unsplash.com/photo-1578507055264-1b47f6f7a87c?w=600',
    ],
    variants: [
      { skuId: 'tb-10003-white', name: 'Matte White', price: 3.1, stock: 800 },
      { skuId: 'tb-10003-grey', name: 'Matte Grey', price: 3.1, stock: 650 },
      { skuId: 'tb-10003-beige', name: 'Beige', price: 3.3, stock: 420 },
    ],
    supplierName: '景德镇家居馆',
    category: 'Home & Garden',
    weight: 0.8,
  },
  {
    itemId: 'tb-10004',
    url: 'https://item.taobao.com/item.htm?id=10004',
    title: '宠物自动饮水器 2L容量',
    description: 'Cat/dog water fountain with filter, quiet pump.',
    images: [
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600',
    ],
    variants: [
      { skuId: 'tb-10004-white', name: 'White', price: 6.5, stock: 340 },
      { skuId: 'tb-10004-green', name: 'Green', price: 6.5, stock: 210 },
    ],
    supplierName: '义乌宠物用品',
    category: 'Pets',
    weight: 0.65,
  },
  {
    itemId: 'tb-10005',
    url: 'https://item.taobao.com/item.htm?id=10005',
    title: '925银简约项链 女款',
    description: 'Sterling silver pendant necklace, hypoallergenic.',
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    ],
    variants: [
      { skuId: 'tb-10005-silver', name: 'Silver', price: 2.8, stock: 1500 },
      { skuId: 'tb-10005-gold', name: 'Gold Plated', price: 3.2, stock: 900 },
    ],
    supplierName: '义乌饰品批发',
    category: 'Jewelry',
    weight: 0.05,
  },
];

export async function fetchTaobaoProduct(urlOrId: string): Promise<TaobaoProduct | null> {
  const itemId = extractItemId(urlOrId);
  if (!itemId) return null;

  const found = DEMO_CATALOG.find((p) => p.itemId === itemId || p.url.includes(itemId));
  if (found) return { ...found };

  // Simulate fetching unknown products with generated data
  if (itemId.startsWith('tb-') || /^\d+$/.test(itemId)) {
    return {
      itemId: itemId.startsWith('tb-') ? itemId : `tb-${itemId}`,
      url: urlOrId.startsWith('http') ? urlOrId : `https://item.taobao.com/item.htm?id=${itemId}`,
      title: `Imported Taobao Product ${itemId}`,
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'],
      variants: [
        { skuId: `${itemId}-default`, name: 'Default', price: 5.0, stock: 100 },
      ],
      supplierName: 'Taobao Seller',
      category: 'General',
      weight: 0.3,
    };
  }

  return null;
}

export async function searchTaobaoProducts(query: string): Promise<TaobaoProduct[]> {
  const q = query.toLowerCase();
  return DEMO_CATALOG.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.supplierName?.toLowerCase().includes(q)
  );
}

export async function purchaseFromTaobao(
  itemId: string,
  variantSku: string,
  quantity: number
): Promise<{ success: boolean; purchaseOrderId: string; estimatedArrival: Date }> {
  // In production: call Taobao purchasing API or manual procurement system
  const arrival = new Date();
  arrival.setDate(arrival.getDate() + 2 + Math.floor(Math.random() * 2));
  return {
    success: true,
    purchaseOrderId: `PO-${Date.now()}`,
    estimatedArrival: arrival,
  };
}

function extractItemId(input: string): string | null {
  if (input.startsWith('tb-')) return input;
  const urlMatch = input.match(/[?&]id=(\d+)/);
  if (urlMatch) return `tb-${urlMatch[1]}`;
  if (/^\d+$/.test(input)) return `tb-${input}`;
  if (input.includes('tb-')) return input;
  return input.length > 3 ? input : null;
}
