import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Layout, PageHeader, StatusBadge } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { api, type FulfillmentOrder, type SourcedProduct } from '../lib/api';

export default function Orders() {
  const { merchant, shopId } = useApp();
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [products, setProducts] = useState<SourcedProduct[]>([]);

  const load = () => {
    if (!merchant) return;
    api.getOrders(merchant.id).then((r) => setOrders(r.orders));
    api.getProducts(merchant.id).then((r) => setProducts(r.products));
  };

  useEffect(load, [merchant]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!merchant) return;
    const fd = new FormData(e.currentTarget);
    const productId = fd.get('productId') as string;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    await api.createOrder({
      merchantId: merchant.id,
      shopId: shopId || undefined,
      customerName: fd.get('customerName') as string,
      customerEmail: fd.get('email') as string,
      shippingAddress: {
        address1: fd.get('address1') as string,
        city: fd.get('city') as string,
        province: fd.get('province') as string,
        country: fd.get('country') as string,
        zip: fd.get('zip') as string,
      },
      items: [{
        productId,
        variantName: 'Default',
        quantity: Number(fd.get('quantity')),
      }],
    });
    setShowCreate(false);
    load();
  };

  return (
    <Layout>
      <PageHeader
        title="Order Fulfillment"
        subtitle="Manage orders from Shopify through sourcing, QC, and shipping"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" /> Test Order
          </button>
        }
      />

      {showCreate && (
        <form onSubmit={handleCreate} className="card mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <h3 className="font-semibold col-span-full">Create Test Order</h3>
          <input name="customerName" className="input" placeholder="Customer name" required />
          <input name="email" className="input" placeholder="Email" type="email" />
          <select name="productId" className="input" required>
            <option value="">Select product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <input name="quantity" className="input" placeholder="Quantity" type="number" defaultValue={1} min={1} required />
          <input name="address1" className="input" placeholder="Address" required />
          <input name="city" className="input" placeholder="City" required />
          <input name="province" className="input" placeholder="State/Province" />
          <input name="country" className="input" placeholder="Country (US, UK, etc.)" required />
          <input name="zip" className="input" placeholder="ZIP code" required />
          <button type="submit" className="btn-primary col-span-full">Create Order</button>
        </form>
      )}

      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">
            No orders yet. Orders flow in automatically from Shopify, or create a test order above.
          </div>
        ) : (
          orders.map((o) => {
            const addr = JSON.parse(o.shippingAddress);
            return (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className="card !p-4 flex items-center gap-4 hover:border-brand-600/50 transition-colors block"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{o.shopifyOrderNum || `Order ${o.id.slice(0, 8)}`}</h4>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {o.customerName} · {addr.city}, {addr.country}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${o.totalCost.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString()}</p>
                </div>
                {o.trackingNumber && (
                  <div className="text-xs text-brand-400 font-mono">{o.trackingNumber}</div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </Layout>
  );
}
