import { Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import ShippingPage from './pages/Shipping';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/shipping" element={<ShippingPage />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppProvider>
  );
}
