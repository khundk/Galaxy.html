import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Store, Wallet, Warehouse, Zap } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { api, type ShopifyShop, type Warehouse as WarehouseType, type AutomationSettings } from '../lib/api';

export default function Settings() {
  const { merchant, refresh } = useApp();
  const [shops, setShops] = useState<ShopifyShop[]>([]);
  const [shopDomain, setShopDomain] = useState('');
  const [depositAmount, setDepositAmount] = useState(100);
  const [warehouse, setWarehouse] = useState<Partial<WarehouseType>>({
    name: 'Superbly Warehouse',
    contactName: '',
    address1: '',
    city: '',
    province: '',
    country: 'US',
    zip: '',
    phone: '',
  });
  const [automation, setAutomation] = useState<Partial<AutomationSettings>>({
    autoPurchaseEnabled: true,
    autoOutboundEnabled: true,
    outboundCarrier: 'demo',
  });
  const [saved, setSaved] = useState('');
  const [searchParams] = useSearchParams();
  const shopifyConnected = searchParams.get('shopify') === 'connected';

  useEffect(() => {
    if (!merchant) return;
    api.getShops(merchant.id).then((r) => setShops(r.shops));
    api.getWarehouse(merchant.id).then((r) => {
      if (r.warehouse) setWarehouse(r.warehouse);
    });
    api.getAutomation(merchant.id).then((r) => {
      if (r.settings) setAutomation(r.settings);
    });
  }, [merchant]);

  const handleConnectDemo = async () => {
    if (!merchant || !shopDomain) return;
    await api.connectDemoShop(merchant.id, shopDomain);
    const { shops: s } = await api.getShops(merchant.id);
    setShops(s);
    await refresh();
  };

  const handleConnectShopify = async () => {
    if (!merchant || !shopDomain) return;
    const { authUrl } = await api.connectShopify(shopDomain, merchant.id);
    window.location.href = authUrl;
  };

  const handleDeposit = async () => {
    if (!merchant) return;
    await api.depositWallet(merchant.id, depositAmount);
    await refresh();
  };

  const handleSaveWarehouse = async () => {
    if (!merchant) return;
    await api.saveWarehouse(merchant.id, warehouse as WarehouseType);
    setSaved('Warehouse saved!');
    setTimeout(() => setSaved(''), 3000);
  };

  const handleSaveAutomation = async () => {
    if (!merchant) return;
    await api.saveAutomation(merchant.id, automation);
    setSaved('Automation settings saved!');
    setTimeout(() => setSaved(''), 3000);
  };

  if (!merchant) return <Layout><div className="text-slate-400">Loading...</div></Layout>;

  return (
    <Layout>
      <PageHeader
        title="Settings"
        subtitle="Configure your Superbly warehouse, automation, and Shopify connection"
      />

      {shopifyConnected && (
        <div className="card mb-6 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <p className="text-emerald-300">Shopify store connected successfully!</p>
        </div>
      )}

      {saved && (
        <div className="card mb-6 border-emerald-500/30 bg-emerald-500/10 text-emerald-300">{saved}</div>
      )}

      {/* Warehouse — critical for automation */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Warehouse className="w-5 h-5" /> Superbly Warehouse Address
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Taobao orders ship HERE (not to your customer). When packages arrive, SuperBridge auto-creates
          outbound labels using the customer address from Shopify — you never type it manually.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input" placeholder="Warehouse name" value={warehouse.name || ''} onChange={(e) => setWarehouse({ ...warehouse, name: e.target.value })} />
          <input className="input" placeholder="Contact name" value={warehouse.contactName || ''} onChange={(e) => setWarehouse({ ...warehouse, contactName: e.target.value })} />
          <input className="input md:col-span-2" placeholder="Street address" value={warehouse.address1 || ''} onChange={(e) => setWarehouse({ ...warehouse, address1: e.target.value })} />
          <input className="input" placeholder="City" value={warehouse.city || ''} onChange={(e) => setWarehouse({ ...warehouse, city: e.target.value })} />
          <input className="input" placeholder="State/Province" value={warehouse.province || ''} onChange={(e) => setWarehouse({ ...warehouse, province: e.target.value })} />
          <input className="input" placeholder="ZIP" value={warehouse.zip || ''} onChange={(e) => setWarehouse({ ...warehouse, zip: e.target.value })} />
          <input className="input" placeholder="Country" value={warehouse.country || ''} onChange={(e) => setWarehouse({ ...warehouse, country: e.target.value })} />
          <input className="input" placeholder="Phone" value={warehouse.phone || ''} onChange={(e) => setWarehouse({ ...warehouse, phone: e.target.value })} />
        </div>
        <button className="btn-primary mt-4" onClick={handleSaveWarehouse}>Save Warehouse</button>
      </div>

      {/* Automation */}
      <div className="card mb-6">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5" /> Automation
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          When a customer buys on Shopify: auto-buy on Taobao → ship to Superbly → auto-ship to customer.
        </p>
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={automation.autoPurchaseEnabled ?? true} onChange={(e) => setAutomation({ ...automation, autoPurchaseEnabled: e.target.checked })} />
            Auto-purchase from Taobao when Shopify order arrives
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={automation.autoOutboundEnabled ?? true} onChange={(e) => setAutomation({ ...automation, autoOutboundEnabled: e.target.checked })} />
            Auto-create shipping label when package arrives at Superbly (no manual address entry)
          </label>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Outbound carrier</label>
            <select className="input w-48" value={automation.outboundCarrier || 'demo'} onChange={(e) => setAutomation({ ...automation, outboundCarrier: e.target.value as AutomationSettings['outboundCarrier'] })}>
              <option value="demo">Demo (testing)</option>
              <option value="shipstation">ShipStation (production)</option>
              <option value="shippo">Shippo (production)</option>
            </select>
          </div>
          {automation.outboundCarrier === 'shipstation' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="input" placeholder="ShipStation API Key" value={automation.shipstationApiKey || ''} onChange={(e) => setAutomation({ ...automation, shipstationApiKey: e.target.value })} />
              <input className="input" placeholder="ShipStation API Secret" type="password" value={automation.shipstationApiSecret || ''} onChange={(e) => setAutomation({ ...automation, shipstationApiSecret: e.target.value })} />
            </div>
          )}
          {automation.outboundCarrier === 'shippo' && (
            <input className="input" placeholder="Shippo API Token" type="password" value={automation.shippoApiToken || ''} onChange={(e) => setAutomation({ ...automation, shippoApiToken: e.target.value })} />
          )}
        </div>
        <button className="btn-primary mt-4" onClick={handleSaveAutomation}>Save Automation</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5" /> Shopify Connection
          </h3>

          {shops.length > 0 ? (
            <div className="space-y-3">
              {shops.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                  <div>
                    <p className="font-medium">{s.shopDomain}</p>
                    <p className="text-xs text-slate-500">{s.isConnected ? 'Connected' : 'Disconnected'}</p>
                  </div>
                  {s.isConnected && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm mb-4">No Shopify store connected yet.</p>
          )}

          <div className="mt-4 space-y-3">
            <input className="input" placeholder="your-store.myshopify.com" value={shopDomain} onChange={(e) => setShopDomain(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={handleConnectShopify}>Connect via OAuth</button>
              <button className="btn-secondary flex-1" onClick={handleConnectDemo}>Demo Connect</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Wallet
          </h3>
          <p className="text-3xl font-bold text-emerald-400 mb-1">${merchant.walletBalance.toFixed(2)}</p>
          <p className="text-sm text-slate-400 mb-4">Auto-deducted when outbound labels are created.</p>
          <div className="flex gap-3">
            <input type="number" className="input" value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} min={1} />
            <button className="btn-primary" onClick={handleDeposit}>Top Up</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
