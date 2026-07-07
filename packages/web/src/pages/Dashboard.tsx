import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, Wallet, TrendingUp, ArrowRight } from 'lucide-react';
import { Layout, PageHeader, StatusBadge } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { api, type DashboardStats, type FulfillmentOrder } from '../lib/api';

export default function Dashboard() {
  const { merchant } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<FulfillmentOrder[]>([]);

  useEffect(() => {
    if (!merchant) return;
    api.getDashboard(merchant.id).then((r) => setStats(r.stats));
    api.getOrders(merchant.id).then((r) => setRecentOrders(r.orders.slice(0, 5)));
  }, [merchant]);

  if (!merchant || !stats) {
    return (
      <Layout>
        <div className="text-muted">Loading dashboard...</div>
      </Layout>
    );
  }

  const statCards = [
    { label: 'Products Sourced', value: stats.totalProducts, icon: Package, color: 'text-burgundy' },
    { label: 'Total Orders', value: stats.totalOrders, icon: ShoppingCart, color: 'text-warning' },
    { label: 'Wallet Balance', value: `$${stats.walletBalance.toFixed(2)}`, icon: Wallet, color: 'text-success' },
    { label: 'Total Spent', value: `$${stats.totalSpent.toFixed(2)}`, icon: TrendingUp, color: 'text-warning' },
  ];

  return (
    <Layout>
      <PageHeader
        title={`Welcome, ${merchant.name}`}
        subtitle="Your Taobao-to-Shopify fulfillment command center"
        action={
          <Link to="/products" className="btn-primary flex items-center gap-2">
            Import Products <ArrowRight className="w-4 h-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
              <s.icon className={`w-8 h-8 ${s.color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-display font-semibold text-lg mb-4">Order Pipeline</h3>
          {Object.keys(stats.ordersByStatus).length === 0 ? (
            <p className="text-faint text-sm">No orders yet. Connect Shopify or create a test order.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="text-sm font-medium">{count} orders</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Orders</h3>
            <Link to="/orders" className="text-sm text-burgundy hover:text-burgundy">View all</Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-faint text-sm">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((o) => (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="flex items-center justify-between p-3 rounded-lg vintage-inset hover:vintage-inset transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{o.shopifyOrderNum || o.customerName}</p>
                    <p className="text-xs text-faint">{new Date(o.createdAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-display font-semibold text-lg mb-3">How SuperBridge Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center text-sm">
          {[
            { step: '1', title: 'Import', desc: 'Source from Taobao' },
            { step: '2', title: 'Sync', desc: 'Push to Shopify' },
            { step: '3', title: 'Order', desc: 'Customer buys' },
            { step: '4', title: 'Fulfill', desc: 'QC & pack at warehouse' },
            { step: '5', title: 'Ship', desc: 'Global delivery' },
          ].map((s) => (
            <div key={s.step} className="p-4 vintage-inset text-center">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2 font-display font-bold text-sm text-[#faf5eb]"
                style={{ background: 'linear-gradient(135deg, #8b3a3a, #6b2c2c)', border: '1px solid #c9a227' }}
              >
                {s.step}
              </div>
              <p className="font-display font-semibold">{s.title}</p>
              <p className="text-faint text-xs mt-1 italic">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
