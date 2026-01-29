import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useFavoritesStore } from '../../store/favoritesStore';
import { ShoppingCart, LogOut, User, Menu, Store, ChevronDown, Heart, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '../common/Button';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

interface NavbarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar = ({ onMenuClick, showMenuButton = false, sidebarCollapsed = true, onToggleSidebar }: NavbarProps = {}) => {
  const { user, isAuthenticated, logout, role } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { getCount: getFavoritesCount, fetchFavorites } = useFavoritesStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Fetch favorites only for customers (API returns 403 for other roles)
  useEffect(() => {
    if (isAuthenticated && role === 'customer') {
      fetchFavorites();
    }
  }, [isAuthenticated, role, fetchFavorites]);

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
  const favoritesCount = isAuthenticated && role === 'customer' ? getFavoritesCount() : 0;
  const showFavorites = isAuthenticated && role === 'customer';

  const getRoleLinks = () => {
    if (!isAuthenticated) return [];

    switch (role) {
      case 'customer':
        return [
          { path: '/dashboard', label: 'Dashboard' },
        ];
      case 'restaurant':
        return [
          { path: '/store/dashboard', label: 'Dashboard' },
        ];
      case 'rider':
        return [
          { path: '/rider/dashboard', label: 'Dashboard' },
        ];
      case 'admin':
        return [
          { path: '/admin/dashboard', label: 'Dashboard' },
        ];
      default:
        return [];
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            {/* Hamburger Menu Button - Only show in AppLayout and on mobile */}
            {showMenuButton && (
              <>
                <button
                  onClick={onMenuClick}
                  className="lg:hidden text-gray-700 hover:text-primary-600 transition-colors p-2"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="h-6 w-6" />
                </button>
                {/* Sidebar Toggle - Desktop only */}
                {onToggleSidebar && (
                  <button
                    onClick={onToggleSidebar}
                    className="hidden lg:flex text-gray-700 hover:text-primary-600 transition-colors p-2"
                    aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {sidebarCollapsed ? (
                      <PanelLeftOpen className="h-5 w-5" />
                    ) : (
                      <PanelLeftClose className="h-5 w-5" />
                    )}
                  </button>
                )}
              </>
            )}
            {/* Logo - Only show when NOT in AppLayout (when sidebar is not shown) */}
            {!showMenuButton && (
              <Link to="/" className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                BiteDash
              </Link>
            )}
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
            {/* Favorites Icon - Show for customers only */}
            {showFavorites && (
              <Link
                to="/favorites"
                className="relative text-gray-700 hover:text-primary-600 transition-colors"
                aria-label={`Favorites${favoritesCount > 0 ? ` with ${favoritesCount} items` : ''}`}
              >
                <Heart className="h-6 w-6" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {favoritesCount}
                  </span>
                )}
              </Link>
            )}
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

            {/* Profile / Account Menu */}
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
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {isAuthenticated ? (
                    <>
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs text-gray-500">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user?.name || 'Account'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleLogout();
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Actions - Cart and Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            {/* Favorites Icon - Show for customers only */}
            {showFavorites && (
              <Link
                to="/favorites"
                className="relative text-gray-700 hover:text-primary-600 transition-colors"
                aria-label={`Favorites${favoritesCount > 0 ? ` with ${favoritesCount} items` : ''}`}
              >
                <Heart className="h-6 w-6" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {favoritesCount}
                  </span>
                )}
              </Link>
            )}
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
          <div className="md:hidden py-4 border-t border-gray-100">
            {/* Public Links */}
            <div className="mb-4">
              <div className="px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Navigation
              </div>
              <div className="space-y-0.5">
                {publicLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.path || 
                    (link.path !== '/' && location.pathname.startsWith(link.path));
                  
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        'flex items-center gap-2 px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors',
                        isActive && 'bg-primary-50 text-primary-600 font-medium'
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Role-specific links */}
            {isAuthenticated && getRoleLinks().length > 0 && (
              <div className="mb-4">
                <div className="px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Dashboard
                </div>
                <div className="space-y-0.5">
                  {getRoleLinks().map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        'block px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors',
                        (location.pathname === link.path || location.pathname.startsWith(link.path + '/')) &&
                          'bg-primary-50 text-primary-600 font-medium'
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {isAuthenticated ? (
              <div className="mb-4">
                <div className="px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Profile
                </div>
                <div className="space-y-0.5">
                  <div className="px-6 py-2.5 text-sm text-gray-700">
                    <div className="font-semibold truncate">{user?.name || 'Account'}</div>
                    {role && (
                      <div className="text-xs text-gray-500 capitalize mt-0.5">
                        {role}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Account
                </div>
                <div className="space-y-0.5">
                  <Link
                    to="/login"
                    className="block px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="block px-6 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
