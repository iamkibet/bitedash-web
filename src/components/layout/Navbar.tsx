import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { ShoppingCart, LogOut, User, Menu, Store, ChevronDown } from 'lucide-react';
import { Button } from '../common/Button';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface NavbarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export const Navbar = ({ onMenuClick, showMenuButton = false }: NavbarProps = {}) => {
  const { user, isAuthenticated, logout, role } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  // Public navigation links (shown in PublicLayout)
  const publicLinks = [
    { path: '/', label: 'Home' },
    { path: '/stores', label: 'Stores', icon: Store },
    { path: '/about', label: 'About Us' },
    { path: '/services', label: 'Services' },
    { path: '/contact', label: 'Contact' },
  ];

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
    <nav className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            {/* Hamburger Menu Button - Only show in AppLayout */}
            {showMenuButton && (
              <button
                onClick={onMenuClick}
                className="text-gray-700 hover:text-primary-600 transition-colors p-2 -ml-2"
                aria-label="Toggle sidebar"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
            <Link to="/" className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
              BiteDash
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {/* Public Links - Show when not in AppLayout */}
            {!showMenuButton && (
              <>
                {publicLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path || 
                    (link.path !== '/' && location.pathname.startsWith(link.path));
                  
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                        isActive
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        {Icon && <Icon className="h-4 w-4" />}
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </>
            )}

            {/* Role-specific links - Show when authenticated and not in AppLayout */}
            {!showMenuButton && isAuthenticated && getRoleLinks().length > 0 && (
              <div className="ml-2 pl-2 border-l border-gray-200">
                {getRoleLinks().map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                      location.pathname === link.path || location.pathname.startsWith(link.path + '/')
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Actions - Always show */}
          <div className="hidden md:flex items-center gap-6">
            {/* Cart Icon - Show for everyone */}
            <Link
              to="/cart"
              className="relative text-gray-700 hover:text-primary-600 transition-colors"
              aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <>
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
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
                  aria-label="Account menu"
                >
                  <User className="h-6 w-6" />
                  <ChevronDown className={cn('h-4 w-4 transition-transform', profileMenuOpen && 'rotate-180')} />
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      to="/login"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setProfileMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Actions - Cart and Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            {/* Cart Icon - Always visible on mobile */}
            <Link
              to="/cart"
              className="relative text-gray-700 hover:text-primary-600 transition-colors"
              aria-label={`Shopping cart${cartItemCount > 0 ? ` with ${cartItemCount} items` : ''}`}
            >
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {cartItemCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button - Only show if not in AppLayout */}
            {!showMenuButton && (
              <button
                className="text-gray-700 hover:text-primary-600 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation - Only show if not in AppLayout */}
        {!showMenuButton && mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-1 border-t border-gray-100">
            {/* Public Links */}
            {publicLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path || 
                (link.path !== '/' && location.pathname.startsWith(link.path));
              
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors',
                    isActive && 'bg-primary-50 text-primary-600 font-medium'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}

            {/* Role-specific links */}
            {isAuthenticated && getRoleLinks().length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Account
                </div>
                {getRoleLinks().map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={cn(
                      'block px-4 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors',
                      (location.pathname === link.path || location.pathname.startsWith(link.path + '/')) &&
                        'bg-primary-50 text-primary-600 font-medium'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </>
            )}

            {isAuthenticated ? (
              <>
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
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Account
                </div>
                <Link
                  to="/login"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
