import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Truck, CheckCircle } from 'lucide-react';
import { Layout, StatusBadge } from '../components/Layout';
import { api, type FulfillmentOrder, type ShippingQuote } from '../lib/api';

const PIPELINE = ['pending', 'sourcing', 'qc', 'packed', 'shipped', 'delivered'];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<FulfillmentOrder | null>(null);
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!id) return;
    api.getOrder(id).then((r) => setOrder(r.order));
  };

  useEffect(load, [id]);

  const handleAdvance = async () => {
    if (!id) return;
    setLoading(true);
    try {
      await api.advanceOrder(id);
      load();
      if (order?.status === 'packed' || order?.status === 'qc') {
        const { quotes: q } = await api.getShippingQuotes(id);
        setQuotes(q);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async (routeId: string) => {
    if (!id) return;
    setLoading(true);
    try {
      await api.shipOrder(id, routeId);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Shipping failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTracking = async () => {
    if (!id) return;
    await api.simulateTracking(id);
    load();
  };

  useEffect(() => {
    if (id && order && ['packed', 'qc'].includes(order.status)) {
      api.getShippingQuotes(id).then((r) => setQuotes(r.quotes));
    }
  }, [id, order?.status]);

  if (!order) {
    return (
      <Layout>
        <div className="text-slate-400">Loading order...</div>
      </Layout>
    );
  }

  const addr = JSON.parse(order.shippingAddress);
  const currentStep = PIPELINE.indexOf(order.status);

  return (
    <Layout>
      <Link to="/orders" className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to orders
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{order.shopifyOrderNum || 'Order Detail'}</h2>
          <p className="text-slate-400 mt-1">{order.customerName} · {addr.city}, {addr.country}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Pipeline */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Fulfillment Pipeline</h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {PIPELINE.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`flex flex-col items-center ${i <= currentStep ? 'text-brand-400' : 'text-slate-600'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                  i < currentStep ? 'bg-brand-600 border-brand-600 text-white' :
                  i === currentStep ? 'border-brand-400 text-brand-400' :
                  'border-slate-700 text-slate-600'
                }`}>
                  {i < currentStep ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs mt-1 capitalize">{step}</span>
              </div>
              {i < PIPELINE.length - 1 && (
                <div className={`w-8 h-0.5 ${i < currentStep ? 'bg-brand-600' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {['pending', 'sourcing', 'qc'].includes(order.status) && (
          <button
            className="btn-primary mt-4 flex items-center gap-2"
            onClick={handleAdvance}
            disabled={loading}
          >
            <Play className="w-4 h-4" />
            Advance to next stage
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
            <div className="flex justify-between"><span className="text-slate-400">Service fee (5%)</span><span>${order.serviceFee.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Shipping</span><span>${order.shippingCost.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>${order.totalCost.toFixed(2)}</span></div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-3">Shipping Address</h3>
          <p className="text-sm text-slate-300">{addr.name || order.customerName}</p>
          <p className="text-sm text-slate-400">{addr.address1}</p>
          <p className="text-sm text-slate-400">{addr.city}, {addr.province} {addr.zip}</p>
          <p className="text-sm text-slate-400">{addr.country}</p>
        </div>
      </div>

      {/* Shipping quotes */}
      {quotes.length > 0 && order.status === 'packed' && (
        <div className="card mt-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" /> Select Shipping Route
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quotes.map((q) => (
              <button
                key={q.routeId}
                className="text-left p-4 rounded-lg border border-slate-700 hover:border-brand-500 transition-colors"
                onClick={() => handleShip(q.routeId)}
                disabled={loading}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{q.name}</p>
                    <p className="text-xs text-slate-500">{q.carrier} · {q.minDays}-{q.maxDays} days</p>
                    {q.includesCustoms && <span className="text-xs text-emerald-400">DDP (tax included)</span>}
                  </div>
                  <p className="font-bold text-brand-400">${q.cost.toFixed(2)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tracking */}
      {order.shipments && order.shipments.length > 0 && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Tracking — {order.trackingNumber}</h3>
            {order.status === 'shipped' && (
              <button className="btn-secondary text-sm" onClick={handleSimulateTracking}>
                Simulate next event
              </button>
            )}
          </div>
          <div className="space-y-3">
            {order.shipments[0].trackingEvents?.map((ev, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-medium">{ev.description}</p>
                  <p className="text-xs text-slate-500">{ev.location} · {new Date(ev.occurredAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status history */}
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
