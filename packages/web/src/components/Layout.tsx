import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  Boxes,
} from 'lucide-react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders' },
  { to: '/shipping', icon: Truck, label: 'Shipping' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Layout({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SuperBridge</h1>
              <p className="text-xs text-slate-400">Taobao → Shopify</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-600/20 text-brand-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <p className="text-xs text-slate-500">Your BuckyDrop alternative</p>
          <p className="text-xs text-slate-600 mt-1">Warehousing · QC · Global Shipping</p>
        </div>
      </aside>
      <main className="main-content">
        {wide ? children : <div className="p-8 max-w-7xl mx-auto">{children}</div>}
      </main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const cls = `badge badge-${status}`;
  return <span className={cls}>{status.replace('_', ' ')}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
