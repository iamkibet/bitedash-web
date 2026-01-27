import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { PublicLayout } from './components/layout/PublicLayout';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Auth Pages
import { Login } from './pages/Auth/Login';
import { Register } from './pages/Auth/Register';

// Home
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Services } from './pages/Services';
import { Contact } from './pages/Contact';

// Customer Pages
import { Restaurants } from './pages/Customer/Restaurants';
import { Menu } from './pages/Customer/Menu';
import { Cart } from './pages/Customer/Cart';
import { Orders } from './pages/Customer/Orders';
import { OrderDetails } from './pages/Customer/OrderDetails';
import { Payment } from './pages/Customer/Payment';

// Restaurant Pages
import { RestaurantDashboard } from './pages/Restaurant/Dashboard';
import { MenuManagement } from './pages/Restaurant/MenuManagement';
import { RestaurantOrders } from './pages/Restaurant/Orders';
import { CreateStore } from './pages/Restaurant/CreateStore';
import { StoreSettings } from './pages/Restaurant/StoreSettings';

// Rider Pages
import { RiderOrders } from './pages/Rider/Orders';
import { RiderDeliveries } from './pages/Rider/Deliveries';

// Admin Pages
import { AdminDashboard } from './pages/Admin/Dashboard';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public Layout Routes - Homepage, public browsing, and auth pages */}
        <Route element={<PublicLayout><Outlet /></PublicLayout>}>
          <Route path="/" element={<Home />} />
          <Route path="/stores" element={<Restaurants />} />
          <Route path="/stores/:id/menu" element={<Menu />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* App Layout Routes - Dashboard pages with sidebar */}
        <Route element={<AppLayout><Outlet /></AppLayout>}>
          {/* Customer Routes */}
          <Route element={<ProtectedRoute requiredRole="customer" />}>
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/orders/:id/payment" element={<Payment />} />
          </Route>

          {/* Store (restaurant) owner Routes */}
          <Route element={<ProtectedRoute requiredRole="restaurant" />}>
            <Route path="/store/dashboard" element={<RestaurantDashboard />} />
            <Route path="/store/create" element={<CreateStore />} />
            <Route path="/store/menu" element={<MenuManagement />} />
            <Route path="/store/orders" element={<RestaurantOrders />} />
            <Route path="/store/orders/:id" element={<OrderDetails />} />
            <Route path="/store/settings" element={<StoreSettings />} />
          </Route>

          {/* Rider Routes */}
          <Route element={<ProtectedRoute requiredRole="rider" />}>
            <Route path="/rider/orders" element={<RiderOrders />} />
            <Route path="/rider/deliveries" element={<RiderDeliveries />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute requiredRole="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<div>Users Management</div>} />
            <Route path="/admin/stores" element={<div>Stores Management</div>} />
            <Route path="/admin/orders" element={<div>Orders Management</div>} />
          </Route>
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
