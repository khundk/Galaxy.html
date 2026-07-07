import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Settings,
  Anchor,
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
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #8b3a3a 0%, #6b2c2c 100%)',
                border: '2px solid #c9a227',
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <Anchor className="w-5 h-5" style={{ color: '#f0e6d3' }} />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl" style={{ color: '#f0e6d3', letterSpacing: '0.06em' }}>
                SuperBridge
              </h1>
              <p className="text-xs font-mono" style={{ color: '#9a8472', letterSpacing: '0.12em' }}>
                EST. 2026 · TRADE CO.
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`sidebar-nav-link ${active ? 'sidebar-nav-link-active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4" style={{ borderTop: '1px solid rgba(201,162,39,0.2)' }}>
          <p className="font-mono text-xs" style={{ color: '#9a8472', letterSpacing: '0.08em' }}>
            TAOBAO → SHOPIFY
          </p>
          <p className="font-display text-xs italic mt-1" style={{ color: '#6b5344' }}>
            Warehousing · QC · Global Shipping
          </p>
        </div>
      </aside>

      <main className="main-content">
        {wide ? children : <div className="p-8 max-w-7xl mx-auto">{children}</div>}
      </main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{status.replace(/_/g, ' ')}</span>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h2 className="font-display text-3xl font-bold text-ink" style={{ letterSpacing: '0.02em' }}>{title}</h2>
        {subtitle && <p className="text-muted mt-1 italic">{subtitle}</p>}
        <div className="ornament mt-3 max-w-xs">✦</div>
      </div>
      {action}
    </div>
  );
}
