import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, Zap, AlertCircle } from 'lucide-react';
import { Layout, StatusBadge } from '../components/Layout';
import { api, type FulfillmentOrder } from '../lib/api';

const AUTO_PIPELINE = [
  'pending',
  'taobao_ordered',
  'inbound_transit',
  'at_warehouse',
  'shipped',
  'delivered',
];

const STEP_LABELS: Record<string, string> = {
  pending: 'Shopify Order',
  taobao_ordered: 'Auto-Buy Taobao',
  inbound_transit: '→ Superbly',
  at_warehouse: 'At Warehouse',
  shipped: '→ Customer',
  delivered: 'Delivered',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<FulfillmentOrder | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!id) return;
    api.getOrder(id).then((r) => setOrder(r.order));
  };

  useEffect(load, [id]);

  const handleSimulateArrival = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await api.simulateArrival(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTracking = async () => {
    if (!id) return;
    await api.simulateTracking(id);
    load();
  };

  if (!order) {
    return (
      <Layout>
        <div className="text-slate-400">Loading order...</div>
      </Layout>
    );
  }

  const addr = JSON.parse(order.shippingAddress);
  const currentStep = AUTO_PIPELINE.indexOf(order.status);
  const inbound = order.shipments?.find((s) => s.direction === 'inbound');
  const outbound = order.shipments?.find((s) => s.direction === 'outbound');

  return (
    <Layout>
      <Link to="/orders" className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{order.shopifyOrderNum || 'Order Detail'}</h2>
          <p className="text-slate-400 mt-1">
            {order.customerName} · {addr.city}, {addr.country}
          </p>
          {order.warehouseRef && (
            <p className="text-xs text-brand-400 font-mono mt-1">Warehouse ref: {order.warehouseRef}</p>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.automationError && (
        <div className="card mb-6 border-red-500/30 bg-red-500/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">Automation error</p>
            <p className="text-sm text-red-400/80">{order.automationError}</p>
          </div>
        </div>
      )}

      {/* Automated pipeline */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" /> Automated Fulfillment
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Customer address is captured from Shopify and used automatically — never re-entered at Superbly.
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {AUTO_PIPELINE.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex flex-col items-center min-w-[80px] ${i <= currentStep ? 'text-brand-400' : 'text-slate-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  i < currentStep ? 'bg-brand-600 border-brand-600 text-white' :
                  i === currentStep ? 'border-brand-400 text-brand-400' :
                  'border-slate-700 text-slate-600'
                }`}>
                  {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs mt-1 text-center">{STEP_LABELS[step] || step}</span>
              </div>
              {i < AUTO_PIPELINE.length - 1 && (
                <div className={`w-6 h-0.5 ${i < currentStep ? 'bg-brand-600' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {order.status === 'inbound_transit' && (
          <button className="btn-primary mt-4 flex items-center gap-2" onClick={handleSimulateArrival} disabled={loading}>
            <Package className="w-4 h-4" />
            Simulate package arriving at Superbly (auto-ships to customer)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-3">Order Items</h3>
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b border-slate-800 last:border-0">
              <div>
                <p className="text-sm font-medium">{item.product.title}</p>
                <p className="text-xs text-slate-500">Qty: {item.quantity} · {item.variantName}</p>
              </div>
              <p className="text-sm">${(item.unitCost * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-slate-700 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Service fee</span><span>${order.serviceFee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Outbound shipping</span><span>${order.shippingCost.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>${order.totalCost.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Customer Address (auto-used for outbound)</h3>
          <p className="text-sm text-slate-300">{addr.name || order.customerName}</p>
          <p className="text-sm text-slate-400">{addr.address1}</p>
          <p className="text-sm text-slate-400">{addr.city}, {addr.province} {addr.zip}</p>
          <p className="text-sm text-slate-400">{addr.country}</p>
          <p className="text-xs text-emerald-400 mt-3">This address is sent automatically to your carrier API — no manual entry at Superbly.</p>
        </div>
      </div>

      {/* Inbound: Taobao → Superbly */}
      {inbound && (
        <div className="card mt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" /> Inbound: Taobao → Superbly
          </h3>
          <p className="text-sm text-slate-400">Tracking: <span className="font-mono text-slate-300">{inbound.trackingNumber}</span></p>
          <div className="space-y-2 mt-3">
            {inbound.trackingEvents?.map((ev, i) => (
              <div key={i} className="text-sm text-slate-400">{ev.description} · {ev.location}</div>
            ))}
          </div>
        </div>
      )}

      {/* Outbound: Superbly → Customer */}
      {outbound && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="w-5 h-5" /> Outbound: Superbly → Customer
            </h3>
            {order.status === 'shipped' && (
              <button className="btn-secondary text-sm" onClick={handleSimulateTracking}>Simulate delivery</button>
            )}
          </div>
          <p className="text-sm">Carrier: {outbound.carrier} · Tracking: <span className="font-mono text-brand-400">{outbound.trackingNumber}</span></p>
          {order.outboundLabelUrl && (
            <p className="text-xs text-slate-500 mt-2">Label: {order.outboundLabelUrl}</p>
          )}
          <div className="space-y-2 mt-3">
            {outbound.trackingEvents?.map((ev, i) => (
              <div key={i} className="text-sm text-slate-400">{ev.description} · {ev.location}</div>
            ))}
          </div>
        </div>
      )}

      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold mb-3">Activity Log</h3>
          {order.statusHistory.map((h, i) => (
            <div key={i} className="flex gap-3 py-2 text-sm border-b border-slate-800 last:border-0">
              <StatusBadge status={h.status} />
              <div>
                <p>{h.note}</p>
                <p className="text-xs text-slate-500">{new Date(h.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
