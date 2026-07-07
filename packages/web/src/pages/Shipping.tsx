import { useEffect, useState } from 'react';
import { Calculator, Globe } from 'lucide-react';
import { Layout, PageHeader } from '../components/Layout';
import { api, type ShippingRoute, type ShippingQuote } from '../lib/api';

export default function ShippingPage() {
  const [routes, setRoutes] = useState<ShippingRoute[]>([]);
  const [weight, setWeight] = useState(0.5);
  const [country, setCountry] = useState('US');
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);

  useEffect(() => {
    api.getShippingRoutes().then((r) => setRoutes(r.routes));
  }, []);

  const calculate = async () => {
    const { quotes: q } = await api.getShippingQuote(weight, country);
    setQuotes(q);
  };

  const zones = [...new Set(routes.map((r) => r.destinationZone))];

  return (
    <Layout>
      <PageHeader
        title="Shipping & Logistics"
        subtitle="International shipping routes from our Guangzhou warehouse"
      />

      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5" /> Shipping Calculator
        </h3>
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-sm text-slate-400 block mb-1">Weight (kg)</label>
            <input
              type="number"
              className="input w-32"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              step={0.1}
              min={0.1}
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Destination</label>
            <select className="input w-40" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany (EU)</option>
              <option value="FR">France (EU)</option>
              <option value="JP">Japan</option>
            </select>
          </div>
          <button className="btn-primary" onClick={calculate}>Calculate</button>
        </div>

        {quotes.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {quotes.map((q) => (
              <div key={q.routeId} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{q.name}</p>
                    <p className="text-xs text-slate-500">{q.carrier} · {q.minDays}-{q.maxDays} business days</p>
                  </div>
                  <p className="text-lg font-bold text-brand-400">${q.cost.toFixed(2)}</p>
                </div>
                {q.includesCustoms && (
                  <span className="text-xs text-emerald-400 mt-2 inline-block">DDP — duties & taxes included</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5" /> How Shipping Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-slate-800/30">
            <p className="font-medium text-brand-300 mb-1">1. Consolidation</p>
            <p className="text-slate-400">Items from Taobao arrive at our Guangzhou warehouse and are consolidated per order.</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30">
            <p className="font-medium text-brand-300 mb-1">2. Quality Check</p>
            <p className="text-slate-400">Every item is inspected. Defects are flagged before packing.</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30">
            <p className="font-medium text-brand-300 mb-1">3. Repackaging</p>
            <p className="text-slate-400">Items are repacked with your branding. Original Taobao packaging is removed (blind shipping).</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30">
            <p className="font-medium text-brand-300 mb-1">4. International Ship</p>
            <p className="text-slate-400">We ship via YunExpress, 4PX, CNE, or China Post with full tracking.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-4">Available Routes by Zone</h3>
        {zones.map((zone) => (
          <div key={zone} className="mb-4">
            <h4 className="text-sm font-medium text-brand-400 mb-2">{zone}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left py-2">Route</th>
                    <th className="text-left py-2">Carrier</th>
                    <th className="text-left py-2">Delivery</th>
                    <th className="text-left py-2">Base</th>
                    <th className="text-left py-2">Per kg</th>
                    <th className="text-left py-2">Customs</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.filter((r) => r.destinationZone === zone).map((r) => (
                    <tr key={r.id} className="border-b border-slate-800/50">
                      <td className="py-2">{r.name}</td>
                      <td className="py-2 text-slate-400">{r.carrier}</td>
                      <td className="py-2 text-slate-400">{r.minDays}-{r.maxDays} days</td>
                      <td className="py-2">${r.baseRate}</td>
                      <td className="py-2">${r.perKgRate}/kg</td>
                      <td className="py-2">{r.includesCustoms ? 'DDP' : 'DDU'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
