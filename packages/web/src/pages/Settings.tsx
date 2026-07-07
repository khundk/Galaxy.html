import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Store, Wallet } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { api, type ShopifyShop } from '../lib/api';

export default function Settings() {
  const { merchant, refresh } = useApp();
  const [shops, setShops] = useState<ShopifyShop[]>([]);
  const [shopDomain, setShopDomain] = useState('');
  const [depositAmount, setDepositAmount] = useState(100);
  const [searchParams] = useSearchParams();
  const shopifyConnected = searchParams.get('shopify') === 'connected';

  useEffect(() => {
    if (!merchant) return;
    api.getShops(merchant.id).then((r) => setShops(r.shops));
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

  if (!merchant) return <Layout><div className="text-slate-400">Loading...</div></Layout>;

  return (
    <Layout>
      <PageHeader title="Settings" subtitle="Connect your Shopify store and manage your wallet" />

      {shopifyConnected && (
        <div className="card mb-6 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <p className="text-emerald-300">Shopify store connected successfully!</p>
        </div>
      )}

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
                    <p className="text-xs text-slate-500">
                      {s.isConnected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                  {s.isConnected && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm mb-4">No Shopify store connected yet.</p>
          )}

          <div className="mt-4 space-y-3">
            <input
              className="input"
              placeholder="your-store.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={handleConnectShopify}>
                Connect via OAuth
              </button>
              <button className="btn-secondary flex-1" onClick={handleConnectDemo}>
                Demo Connect
              </button>
            </div>
            <p className="text-xs text-slate-500">
              For production: set SHOPIFY_API_KEY and SHOPIFY_API_SECRET in your .env file.
              Demo connect works without credentials for testing.
            </p>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" /> Wallet
          </h3>
          <p className="text-3xl font-bold text-emerald-400 mb-1">${merchant.walletBalance.toFixed(2)}</p>
          <p className="text-sm text-slate-400 mb-4">
            Fulfillment costs are deducted from your wallet when orders ship.
          </p>
          <div className="flex gap-3">
            <input
              type="number"
              className="input"
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              min={1}
            />
            <button className="btn-primary" onClick={handleDeposit}>Top Up</button>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <h3 className="font-semibold mb-3">Production Setup Checklist</h3>
        <div className="space-y-2 text-sm">
          {[
            { done: true, text: 'Platform deployed and running' },
            { done: false, text: 'Register Shopify Partner app and set API credentials' },
            { done: false, text: 'Set up Taobao Open Platform API or procurement team' },
            { done: false, text: 'Contract with warehouse in Guangzhou/Shenzhen' },
            { done: false, text: 'Integrate carrier APIs (YunExpress, 4PX, CNE)' },
            { done: false, text: 'Set up payment processing for wallet top-ups' },
            { done: false, text: 'Configure Shopify webhooks for order/create' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-slate-700'}`} />
              <span className={item.done ? 'text-slate-300' : 'text-slate-500'}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
