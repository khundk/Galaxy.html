import { useEffect, useState } from 'react';
import { Search, Plus, ExternalLink, Upload, Package } from 'lucide-react';
import { Layout, PageHeader, StatusBadge } from '../components/Layout';
import { useApp } from '../context/AppContext';
import { api, type SourcedProduct, type TaobaoProduct } from '../lib/api';

export default function Products() {
  const { merchant, shopId } = useApp();
  const [products, setProducts] = useState<SourcedProduct[]>([]);
  const [searchResults, setSearchResults] = useState<TaobaoProduct[]>([]);
  const [query, setQuery] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [markup, setMarkup] = useState(200);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'catalog' | 'imported'>('imported');

  const loadProducts = () => {
    if (!merchant) return;
    api.getProducts(merchant.id).then((r) => setProducts(r.products));
  };

  useEffect(loadProducts, [merchant]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { products: results } = await api.searchProducts(query);
      setSearchResults(results);
      setTab('catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (url: string) => {
    if (!merchant) return;
    setLoading(true);
    try {
      await api.importProduct({
        merchantId: merchant.id,
        shopId: shopId || undefined,
        url,
        markupPercent: markup,
      });
      loadProducts();
      setTab('imported');
      setImportUrl('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (id: string) => {
    try {
      await api.syncToShopify(id);
      loadProducts();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Sync failed');
    }
  };

  return (
    <Layout>
      <PageHeader
        title="Product Sourcing"
        subtitle="Import products from Taobao and sync to your Shopify store"
      />

      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Import from Taobao</h3>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Paste Taobao URL or item ID (e.g. tb-10001)"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400 whitespace-nowrap">Markup %</label>
            <input
              type="number"
              className="input w-20"
              value={markup}
              onChange={(e) => setMarkup(Number(e.target.value))}
            />
          </div>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => handleImport(importUrl)}
            disabled={!importUrl || loading}
          >
            <Plus className="w-4 h-4" /> Import
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <h3 className="font-semibold mb-4">Search Taobao Catalog</h3>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Search by keyword (hoodie, earbuds, vase...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn-secondary flex items-center gap-2" onClick={handleSearch} disabled={loading}>
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'imported' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          onClick={() => setTab('imported')}
        >
          My Products ({products.length})
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'catalog' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400'}`}
          onClick={() => setTab('catalog')}
        >
          Search Results ({searchResults.length})
        </button>
      </div>

      {tab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {searchResults.map((p) => {
            const images = p.images;
            const minPrice = Math.min(...p.variants.map((v) => v.price));
            return (
              <div key={p.itemId} className="card !p-4">
                <img src={images[0]} alt={p.title} className="w-full h-40 object-cover rounded-lg mb-3" />
                <h4 className="font-medium text-sm line-clamp-2">{p.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{p.supplierName} · {p.category}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-brand-400 font-semibold">${minPrice.toFixed(2)}</span>
                  <button
                    className="btn-primary text-xs !px-3 !py-1.5"
                    onClick={() => handleImport(p.url)}
                    disabled={loading}
                  >
                    Import
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'imported' && (
        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="card text-center py-12">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No products imported yet. Search or paste a Taobao URL above.</p>
            </div>
          ) : (
            products.map((p) => {
              const images = JSON.parse(p.images) as string[];
              const selling = p.sellingPrice || p.supplierPrice * (1 + p.markupPercent / 100);
              return (
                <div key={p.id} className="card !p-4 flex items-center gap-4">
                  <img src={images[0]} alt={p.title} className="w-16 h-16 object-cover rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{p.title}</h4>
                    <p className="text-xs text-slate-500">
                      Cost: ${p.supplierPrice.toFixed(2)} → Sell: ${selling.toFixed(2)} ({p.markupPercent}% markup)
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                  <div className="flex gap-2">
                    <a href={p.taobaoUrl} target="_blank" rel="noreferrer" className="btn-secondary !p-2">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    {!p.shopifySynced ? (
                      <button className="btn-primary flex items-center gap-1 text-sm" onClick={() => handleSync(p.id)}>
                        <Upload className="w-4 h-4" /> Sync to Shopify
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-medium px-3 py-2">Synced ✓</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Layout>
  );
}
