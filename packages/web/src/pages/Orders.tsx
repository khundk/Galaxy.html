import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Download,
  ChevronRight,
  Package,
  Truck,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { Layout, StatusBadge } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { api, type FulfillmentOrder } from '../lib/api';

const STATUS_TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'taobao_ordered', label: 'Purchasing' },
  { key: 'inbound_transit', label: 'Supplier Shipping' },
  { key: 'at_warehouse', label: 'At Warehouse' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  taobao_ordered: 'Purchasing',
  inbound_transit: 'Supplier Shipping',
  at_warehouse: 'At Warehouse',
  shipped: 'Shipped',
  delivered: 'Delivered',
  failed: 'Failed',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getProductImage(product: { images: string }) {
  try {
    const imgs = JSON.parse(product.images) as string[];
    return imgs[0] || '';
  } catch {
    return '';
  }
}

export default function Orders() {
  const { merchant } = useApp();
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FulfillmentOrder | null>(null);

  const load = useCallback(() => {
    if (!merchant) return;
    setLoading(true);
    api
      .getOrders(merchant.id, { status: activeTab, search })
      .then((r) => {
        setOrders(r.orders);
        setStatusCounts(r.statusCounts);
      })
      .finally(() => setLoading(false));
  }, [merchant, activeTab, search]);

  useEffect(load, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleSimulateArrival = async (orderId: string) => {
    await api.simulateArrival(orderId);
    load();
    if (selected?.id === orderId) {
      const { order } = await api.getOrder(orderId);
      setSelected(order);
    }
  };

  const exportCsv = () => {
    const headers = ['Order', 'Customer', 'Status', 'Products', 'Subtotal', 'Shipping', 'Total', 'Tracking', 'Date'];
    const rows = orders.map((o) => {
      const items = o.items?.map((i) => i.product.title).join('; ') || '';
      return [
        o.shopifyOrderNum || o.id.slice(0, 8),
        o.customerName,
        STATUS_LABELS[o.status] || o.status,
        items,
        o.subtotal.toFixed(2),
        o.shippingCost.toFixed(2),
        o.totalCost.toFixed(2),
        o.trackingNumber || o.inboundTracking || '',
        formatDate(o.createdAt),
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `superbridge-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const totalSpent = orders.reduce((s, o) => s + o.totalCost, 0);

  return (
    <Layout wide>
      <div className="admin-page">
        {/* Header — BuckyDrop style */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink">Orders</h1>
            <p className="text-muted text-sm mt-1 italic">
              Track procurement, warehouse receiving, QC, and shipping — synced from Shopify
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2 text-sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync
            </button>
            <button className="btn-secondary flex items-center gap-2 text-sm" onClick={exportCsv}>
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="stat-pill">
            <p className="text-xs text-faint uppercase tracking-wide">Total Orders</p>
            <p className="text-2xl font-bold mt-1">{statusCounts.all || 0}</p>
          </div>
          <div className="stat-pill">
            <p className="text-xs text-faint uppercase tracking-wide">Processing</p>
            <p className="font-display text-2xl font-bold mt-1 text-warning">
              {(statusCounts.pending || 0) +
                (statusCounts.taobao_ordered || 0) +
                (statusCounts.inbound_transit || 0) +
                (statusCounts.at_warehouse || 0)}
            </p>
          </div>
          <div className="stat-pill">
            <p className="text-xs text-faint uppercase tracking-wide">Shipped</p>
            <p className="font-display text-2xl font-bold mt-1 text-burgundy">{statusCounts.shipped || 0}</p>
          </div>
          <div className="stat-pill">
            <p className="text-xs text-faint uppercase tracking-wide">Page Total</p>
            <p className="font-display text-2xl font-bold mt-1 text-success">${totalSpent.toFixed(2)}</p>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`status-tab ${activeTab === tab.key ? 'status-tab-active' : 'status-tab-inactive'}`}
            >
              {tab.label}
              {statusCounts[tab.key] !== undefined && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key ? 'bg-white/20' : 'pipeline-dot-inactive'
                }`}>
                  {tab.key === 'all' ? statusCounts.all : statusCounts[tab.key] || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              className="input pl-10"
              placeholder="Search order #, customer, tracking, warehouse ref..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary text-sm">Search</button>
          {search && (
            <button type="button" className="btn-secondary text-sm" onClick={() => { setSearch(''); setSearchInput(''); }}>
              Clear
            </button>
          )}
        </form>

        {/* Auto-fulfillment banner */}
        <div className="flex items-center gap-3 p-3 mb-4 banner-auto text-sm">
          <Zap className="w-4 h-4 text-gold shrink-0" />
          <span className="text-ink">
            <strong className="text-burgundy">Auto-fulfillment enabled</strong> — Shopify orders auto-buy on Taobao → Superbly warehouse → auto-ship to customer
          </span>
          <Link to="/settings" className="ml-auto text-burgundy hover:text-gold text-xs whitespace-nowrap font-display">Settings →</Link>
        </div>

        {/* Orders table */}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Products</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Procurement</th>
                <th>Amount</th>
                <th>Tracking</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-faint">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    {loading ? 'Loading orders...' : 'No orders found. Orders sync automatically from Shopify.'}
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const addr = JSON.parse(o.shippingAddress);
                  const outbound = o.shipments?.find((s) => s.direction === 'outbound');
                  const inbound = o.shipments?.find((s) => s.direction === 'inbound');
                  return (
                    <tr
                      key={o.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(o)}
                    >
                      <td>
                        <div className="font-display font-semibold text-ink">{o.shopifyOrderNum || `#${o.id.slice(0, 8)}`}</div>
                        {o.warehouseRef && (
                          <div className="text-xs text-faint font-mono mt-0.5">{o.warehouseRef}</div>
                        )}
                        {o.shop?.shopDomain && (
                          <div className="text-xs text-faint mt-0.5">{o.shop.shopDomain}</div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {o.items?.slice(0, 3).map((item) => {
                            const img = getProductImage(item.product);
                            return (
                              <div key={item.id} className="relative group">
                                {img ? (
                                  <img src={img} alt="" className="w-10 h-10 object-cover thumb-border" />
                                ) : (
                                  <div className="w-10 h-10 vintage-inset flex items-center justify-center">
                                    <Package className="w-4 h-4 text-faint" />
                                  </div>
                                )}
                                <span className="absolute -top-1 -right-1 w-4 h-4 qty-badge rounded-full text-[10px] flex items-center justify-center">
                                  {item.quantity}
                                </span>
                              </div>
                            );
                          })}
                          {(o.items?.length || 0) > 3 && (
                            <span className="text-xs text-faint">+{(o.items?.length || 0) - 3}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{o.customerName}</div>
                        <div className="text-xs text-faint">{addr.city}, {addr.country}</div>
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                        {o.automationError && (
                          <div className="text-xs text-burgundy mt-1 max-w-[120px] truncate" title={o.automationError}>
                            Error
                          </div>
                        )}
                      </td>
                      <td>
                        <ProcurementSteps status={o.status} />
                      </td>
                      <td>
                        <div className="font-medium">${o.totalCost.toFixed(2)}</div>
                        <div className="text-xs text-faint">
                          Product ${o.subtotal.toFixed(2)} + Ship ${o.shippingCost.toFixed(2)}
                        </div>
                      </td>
                      <td>
                        {outbound?.trackingNumber ? (
                          <div>
                            <div className="text-xs font-mono text-burgundy">{outbound.trackingNumber}</div>
                            <div className="text-xs text-faint">{outbound.carrier}</div>
                          </div>
                        ) : inbound?.trackingNumber ? (
                          <div>
                            <div className="text-xs font-mono text-muted">{inbound.trackingNumber}</div>
                            <div className="text-xs text-faint">Inbound CN</div>
                          </div>
                        ) : (
                          <span className="text-xs text-faint">—</span>
                        )}
                      </td>
                      <td className="text-xs text-muted whitespace-nowrap">{formatDate(o.createdAt)}</td>
                      <td>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {o.status === 'inbound_transit' && (
                            <button
                              className="btn-primary text-xs !px-2 !py-1"
                              onClick={() => handleSimulateArrival(o.id)}
                              title="Simulate warehouse arrival"
                            >
                              Receive
                            </button>
                          )}
                          <Link to={`/orders/${o.id}`} className="p-1.5 rounded hover:pipeline-dot-inactive text-muted hover:text-ink">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side drawer — quick order view like BuckyDrop */}
      {selected && (
        <OrderDrawer
          order={selected}
          onClose={() => setSelected(null)}
          onSimulateArrival={handleSimulateArrival}
          onRefresh={load}
        />
      )}
    </Layout>
  );
}

function ProcurementSteps({ status }: { status: string }) {
  const steps = ['pending', 'taobao_ordered', 'inbound_transit', 'at_warehouse', 'shipped', 'delivered'];
  const idx = steps.indexOf(status);
  const labels = ['Sync', 'Buy', 'Inbound', 'WH', 'Ship', 'Done'];

  return (
    <div className="flex items-center gap-0.5">
      {labels.map((label, i) => (
        <div
          key={label}
          title={label}
          className={`w-6 h-1.5 rounded-full ${
            i <= idx ? 'pipeline-dot-active' : 'pipeline-dot-inactive'
          }`}
        />
      ))}
    </div>
  );
}

function OrderDrawer({
  order,
  onClose,
  onSimulateArrival,
  onRefresh,
}: {
  order: FulfillmentOrder;
  onClose: () => void;
  onSimulateArrival: (id: string) => void;
  onRefresh: () => void;
}) {
  const addr = JSON.parse(order.shippingAddress);
  const outbound = order.shipments?.find((s) => s.direction === 'outbound');
  const inbound = order.shipments?.find((s) => s.direction === 'inbound');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 drawer-overlay" onClick={onClose} />
      <div className="relative w-full max-w-lg drawer-panel overflow-y-auto">
        <div className="p-6 border-b border-[var(--color-sepia)] flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">{order.shopifyOrderNum || 'Order Detail'}</h2>
            <p className="text-sm text-muted mt-1 italic">{formatDate(order.createdAt)}</p>
          </div>
          <button onClick={onClose} className="text-faint hover:text-ink text-2xl leading-none font-display">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={order.status} />
            <span className="font-display text-xl font-bold text-ink">${order.totalCost.toFixed(2)}</span>
          </div>

          {order.warehouseRef && (
            <div className="p-3 vintage-inset text-sm">
              <span className="text-faint">Warehouse ref:</span>{' '}
              <span className="font-mono text-burgundy">{order.warehouseRef}</span>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="section-label mb-3">Procurement Timeline</h3>
            <div className="space-y-3">
              {[
                { icon: Zap, label: 'Shopify order synced', done: true },
                { icon: Package, label: 'Taobao purchase placed', done: ['taobao_ordered','inbound_transit','at_warehouse','shipped','delivered'].includes(order.status) },
                { icon: Truck, label: 'Inbound to Superbly warehouse', done: ['inbound_transit','at_warehouse','shipped','delivered'].includes(order.status), tracking: inbound?.trackingNumber },
                { icon: Package, label: 'Received at warehouse', done: ['at_warehouse','shipped','delivered'].includes(order.status) },
                { icon: Truck, label: 'Shipped to customer', done: ['shipped','delivered'].includes(order.status), tracking: outbound?.trackingNumber },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    step.done ? 'step-icon-done' : 'step-icon-pending'
                  }`}>
                    <step.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-sm ${step.done ? 'text-ink' : 'text-faint'}`}>{step.label}</p>
                    {step.tracking && <p className="text-xs font-mono text-faint">{step.tracking}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="section-label mb-3">Products</h3>
            {order.items?.map((item) => {
              const img = getProductImage(item.product);
              return (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-[var(--color-sepia)] last:border-0">
                  {img && <img src={img} alt="" className="w-12 h-12 object-cover thumb-border" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-ink">{item.product.title}</p>
                    <p className="text-xs text-faint">Qty {item.quantity} · ${item.unitCost.toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Customer */}
          <div>
            <h3 className="section-label mb-2">Ship To (auto-used)</h3>
            <p className="text-sm text-ink">{addr.name || order.customerName}</p>
            <p className="text-sm text-muted">{addr.address1}</p>
            <p className="text-sm text-muted">{addr.city}, {addr.province} {addr.zip}</p>
            <p className="text-sm text-muted">{addr.country}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-[var(--color-sepia)]">
            {order.status === 'inbound_transit' && (
              <button
                className="btn-primary flex-1 text-sm"
                onClick={() => { onSimulateArrival(order.id); onRefresh(); }}
              >
                Mark Arrived & Auto-Ship
              </button>
            )}
            <Link to={`/orders/${order.id}`} className="btn-secondary flex items-center gap-1 text-sm">
              Full Detail <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
