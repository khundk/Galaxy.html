import { createContext, useContext, useEffect, useState } from 'react';
import { api, type Merchant } from '../lib/api';

interface AppContextType {
  merchant: Merchant | null;
  shopId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextType>({
  merchant: null,
  shopId: null,
  loading: true,
  refresh: async () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { merchants } = await api.getMerchants();
    const m = merchants[0] || null;
    setMerchant(m);
    if (m?.shops?.[0]) setShopId(m.shops[0].id);
    else if (m) {
      const { shops } = await api.getShops(m.id);
      if (shops[0]) setShopId(shops[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh().catch(console.error);
  }, []);

  return (
    <AppContext.Provider value={{ merchant, shopId, loading, refresh }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
