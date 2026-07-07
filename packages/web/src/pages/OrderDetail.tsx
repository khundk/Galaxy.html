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
        <div className="text-muted">Loading order...</div>
      </Layout>
    );
  }

  const addr = JSON.parse(order.shippingAddress);
  const currentStep = AUTO_PIPELINE.indexOf(order.status);
  const inbound = order.shipments?.find((s) => s.direction === 'inbound');
  const outbound = order.shipments?.find((s) => s.direction === 'outbound');

  return (
    <Layout>
      <Link to="/orders" className="text-sm text-muted hover:text-ink flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{order.shopifyOrderNum || 'Order Detail'}</h2>
          <p className="text-muted mt-1">
            {order.customerName} · {addr.city}, {addr.country}
          </p>
          {order.warehouseRef && (
            <p className="text-xs text-burgundy font-mono mt-1">Warehouse ref: {order.warehouseRef}</p>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.automationError && (
        <div className="card mb-6 border-red-500/30 bg-red-500/10 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-burgundy shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">Automation error</p>
            <p className="text-sm text-burgundy/80">{order.automationError}</p>
          </div>
        </div>
      )}

      {/* Automated pipeline */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning" /> Automated Fulfillment
        </h3>
        <p className="text-sm text-muted mb-4">
          Customer address is captured from Shopify and used automatically — never re-entered at Superbly.
        </p>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {AUTO_PIPELINE.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex flex-col items-center min-w-[80px] ${i <= currentStep ? 'text-burgundy' : 'text-faint'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  i < currentStep ? 'text-[#faf5eb]' : i === currentStep ? 'text-burgundy' : 'text-faint'
                }`}
                style={
                  i < currentStep
                    ? { background: 'linear-gradient(135deg,#8b3a3a,#6b2c2c)', borderColor: '#c9a227' }
                    : i === currentStep
                    ? { borderColor: '#6b2c2c', background: 'rgba(107,44,44,0.08)' }
                    : { borderColor: 'var(--color-sepia)', background: 'transparent' }
                }
                >
                  {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs mt-1 text-center">{STEP_LABELS[step] || step}</span>
              </div>
              {i < AUTO_PIPELINE.length - 1 && (
                <div className={`w-6 h-0.5 ${i < currentStep ? 'pipeline-dot-active' : 'pipeline-dot-inactive'}`} />
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
            <div key={item.id} className="flex justify-between py-2 border-b border-[var(--color-sepia)] last:border-0">
              <div>
                <p className="text-sm font-medium">{item.product.title}</p>
                <p className="text-xs text-faint">Qty: {item.quantity} · {item.variantName}</p>
              </div>
              <p className="text-sm">${(item.unitCost * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-[var(--color-sepia-dark)] space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Service fee</span><span>${order.serviceFee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Outbound shipping</span><span>${order.shippingCost.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>${order.totalCost.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Customer Address (auto-used for outbound)</h3>
          <p className="text-sm text-ink">{addr.name || order.customerName}</p>
          <p className="text-sm text-muted">{addr.address1}</p>
          <p className="text-sm text-muted">{addr.city}, {addr.province} {addr.zip}</p>
          <p className="text-sm text-muted">{addr.country}</p>
          <p className="text-xs text-success mt-3">This address is sent automatically to your carrier API — no manual entry at Superbly.</p>
        </div>
      </div>

      {/* Inbound: Taobao → Superbly */}
      {inbound && (
        <div className="card mt-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" /> Inbound: Taobao → Superbly
          </h3>
          <p className="text-sm text-muted">Tracking: <span className="font-mono text-ink">{inbound.trackingNumber}</span></p>
          <div className="space-y-2 mt-3">
            {inbound.trackingEvents?.map((ev, i) => (
              <div key={i} className="text-sm text-muted">{ev.description} · {ev.location}</div>
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
          <p className="text-sm">Carrier: {outbound.carrier} · Tracking: <span className="font-mono text-burgundy">{outbound.trackingNumber}</span></p>
          {order.outboundLabelUrl && (
            <p className="text-xs text-faint mt-2">Label: {order.outboundLabelUrl}</p>
          )}
          <div className="space-y-2 mt-3">
            {outbound.trackingEvents?.map((ev, i) => (
              <div key={i} className="text-sm text-muted">{ev.description} · {ev.location}</div>
            ))}
          </div>
        </div>
      )}

      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="card mt-6">
          <h3 className="font-semibold mb-3">Activity Log</h3>
          {order.statusHistory.map((h, i) => (
            <div key={i} className="flex gap-3 py-2 text-sm border-b border-[var(--color-sepia)] last:border-0">
              <StatusBadge status={h.status} />
              <div>
                <p>{h.note}</p>
                <p className="text-xs text-faint">{new Date(h.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
