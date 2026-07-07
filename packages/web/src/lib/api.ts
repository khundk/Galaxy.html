const API = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  getMerchants: () => request<{ merchants: Merchant[] }>('/merchants'),
  getMerchant: (id: string) => request<{ merchant: Merchant }>(`/merchants/${id}`),
  getDashboard: (id: string) => request<{ stats: DashboardStats }>(`/merchants/${id}/dashboard`),
  depositWallet: (id: string, amount: number) =>
    request(`/merchants/${id}/wallet/deposit`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  searchProducts: (q: string) =>
    request<{ products: TaobaoProduct[] }>(`/products/search?q=${encodeURIComponent(q)}`),
  importProduct: (data: { merchantId: string; shopId?: string; url: string; markupPercent?: number }) =>
    request<{ product: SourcedProduct }>('/products/import', { method: 'POST', body: JSON.stringify(data) }),
  getProducts: (merchantId: string) =>
    request<{ products: SourcedProduct[] }>(`/products?merchantId=${merchantId}`),
  syncToShopify: (id: string) =>
    request(`/products/${id}/sync-shopify`, { method: 'POST' }),

  getShops: (merchantId: string) =>
    request<{ shops: ShopifyShop[] }>(`/shopify/shops?merchantId=${merchantId}`),
  connectShopify: (shop: string, merchantId: string) =>
    request<{ authUrl: string }>(`/shopify/connect?shop=${shop}&merchantId=${merchantId}`),
  connectDemoShop: (merchantId: string, shopDomain: string) =>
    request('/shopify/shops/demo', { method: 'POST', body: JSON.stringify({ merchantId, shopDomain }) }),

  getOrders: (merchantId: string, params?: { status?: string; search?: string }) => {
    const qs = new URLSearchParams({ merchantId });
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    return request<{ orders: FulfillmentOrder[]; statusCounts: Record<string, number>; total: number }>(
      `/orders?${qs}`
    );
  },
  getOrder: (id: string) => request<{ order: FulfillmentOrder }>(`/orders/${id}`),
  createOrder: (data: CreateOrderPayload) =>
    request<{ order: FulfillmentOrder }>('/orders', { method: 'POST', body: JSON.stringify(data) }),
  advanceOrder: (id: string) => request(`/orders/${id}/advance`, { method: 'POST' }),
  getShippingQuotes: (orderId: string) =>
    request<{ quotes: ShippingQuote[]; weight: number }>(`/orders/${orderId}/shipping-quotes`),
  shipOrder: (orderId: string, routeId: string) =>
    request(`/orders/${orderId}/ship`, { method: 'POST', body: JSON.stringify({ routeId }) }),
  simulateTracking: (orderId: string) =>
    request(`/orders/${orderId}/tracking/simulate`, { method: 'POST' }),
  simulateArrival: (orderId: string) =>
    request<{ order: FulfillmentOrder; message: string }>(`/orders/${orderId}/simulate-arrival`, { method: 'POST' }),
  retryAutomation: (orderId: string) =>
    request(`/orders/${orderId}/retry-automation`, { method: 'POST' }),

  getWarehouse: (merchantId: string) =>
    request<{ warehouse: Warehouse | null }>(`/warehouse/${merchantId}`),
  saveWarehouse: (merchantId: string, data: WarehouseInput) =>
    request<{ warehouse: Warehouse }>(`/warehouse/${merchantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getAutomation: (merchantId: string) =>
    request<{ settings: AutomationSettings | null }>(`/warehouse/${merchantId}/automation`),
  saveAutomation: (merchantId: string, data: Partial<AutomationSettings>) =>
    request<{ settings: AutomationSettings }>(`/warehouse/${merchantId}/automation`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getShippingRoutes: () => request<{ routes: ShippingRoute[] }>('/shipping/routes'),
  getShippingQuote: (weight: number, country: string) =>
    request<{ quotes: ShippingQuote[] }>('/shipping/quote', {
      method: 'POST',
      body: JSON.stringify({ weight, country }),
    }),
};

export interface Merchant {
  id: string;
  email: string;
  name: string;
  company?: string;
  walletBalance: number;
  shops?: ShopifyShop[];
  _count?: { products: number; orders: number };
}

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  walletBalance: number;
  totalSpent: number;
}

export interface ShopifyShop {
  id: string;
  shopDomain: string;
  isConnected: boolean;
}

export interface TaobaoProduct {
  itemId: string;
  url: string;
  title: string;
  images: string[];
  variants: Array<{ skuId: string; name: string; price: number; stock: number }>;
  supplierName?: string;
  category?: string;
  weight?: number;
}

export interface SourcedProduct {
  id: string;
  title: string;
  titleEn?: string;
  taobaoUrl: string;
  images: string;
  variants: string;
  supplierPrice: number;
  sellingPrice?: number;
  markupPercent: number;
  stock: number;
  category?: string;
  weight: number;
  shopifySynced: boolean;
  status: string;
  shop?: ShopifyShop;
}

export interface FulfillmentOrder {
  id: string;
  shopifyOrderNum?: string;
  customerName: string;
  customerEmail?: string;
  shippingAddress: string;
  status: string;
  warehouseRef?: string;
  inboundTracking?: string;
  automationStatus?: string;
  automationError?: string;
  outboundLabelUrl?: string;
  subtotal: number;
  shippingCost: number;
  serviceFee: number;
  totalCost: number;
  trackingNumber?: string;
  carrier?: string;
  shippingMethod?: string;
  createdAt: string;
  shop?: ShopifyShop;
  items?: OrderItem[];
  shipments?: Shipment[];
  statusHistory?: StatusHistory[];
  qcRecords?: QCRecord[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  variantName?: string;
  product: SourcedProduct;
}

export interface Shipment {
  id: string;
  direction?: string;
  carrier: string;
  service: string;
  trackingNumber: string;
  status: string;
  shippingCost: number;
  trackingEvents?: TrackingEvent[];
}

export interface TrackingEvent {
  status: string;
  location?: string;
  description: string;
  occurredAt: string;
}

export interface StatusHistory {
  status: string;
  note?: string;
  createdAt: string;
}

export interface QCRecord {
  result: string;
  notes?: string;
  inspectedAt: string;
}

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

export interface ShippingRoute {
  id: string;
  name: string;
  carrier: string;
  service: string;
  destinationZone: string;
  minDays: number;
  maxDays: number;
  baseRate: number;
  perKgRate: number;
  includesCustoms: boolean;
  description?: string;
}

export interface CreateOrderPayload {
  merchantId: string;
  shopId?: string;
  customerName: string;
  customerEmail?: string;
  shippingAddress: {
    address1: string;
    city: string;
    province?: string;
    country: string;
    zip: string;
  };
  items: Array<{ productId: string; variantSku?: string; variantName?: string; quantity: number }>;
}

export interface Warehouse {
  id: string;
  name: string;
  contactName: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

export type WarehouseInput = Omit<Warehouse, 'id'>;

export interface AutomationSettings {
  autoPurchaseEnabled: boolean;
  autoOutboundEnabled: boolean;
  outboundCarrier: 'demo' | 'shipstation' | 'shippo';
  defaultServiceCode?: string;
  shipstationApiKey?: string;
  shipstationApiSecret?: string;
  shippoApiToken?: string;
}
