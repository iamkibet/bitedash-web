import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { ShoppingCart, LogOut, User, Menu } from 'lucide-react';
import { Button } from '../common/Button';
import { useState } from 'react';

export const Navbar = () => {
  const { user, isAuthenticated, logout, role } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const cartItemCount = getItemCount();

  const getRoleLinks = () => {
    if (!isAuthenticated) return [];

    switch (role) {
      case 'customer':
        return [
          { path: '/stores', label: 'Stores' },
          { path: '/orders', label: 'My Orders' },
        ];
      case 'restaurant':
        return [
          { path: '/store/dashboard', label: 'Dashboard' },
          { path: '/store/menu', label: 'Menu' },
          { path: '/store/orders', label: 'Orders' },
        ];
      case 'rider':
        return [
          { path: '/rider/orders', label: 'Available Orders' },
          { path: '/rider/deliveries', label: 'My Deliveries' },
        ];
      case 'admin':
        return [
          { path: '/admin/dashboard', label: 'Dashboard' },
          { path: '/admin/users', label: 'Users' },
          { path: '/admin/stores', label: 'Stores' },
          { path: '/admin/orders', label: 'Orders' },
        ];
      default:
        return [];
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              BiteDash
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {getRoleLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-gray-700 hover:text-primary-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <>
                {role === 'customer' && (
                  <Link
                    to="/cart"
                    className="relative text-gray-700 hover:text-primary-600 transition-colors"
                  >
                    <ShoppingCart className="h-6 w-6" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                )}
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <span className="text-gray-700">{user?.name}</span>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {getRoleLinks().map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                {role === 'customer' && (
                  <Link
                    to="/cart"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      <span>Cart</span>
                      {cartItemCount > 0 && (
                        <span className="bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cartItemCount}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
                <div className="px-4 py-2 text-gray-700">{user?.name}</div>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
