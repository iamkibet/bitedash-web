import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  Settings,
  Bike,
  Truck,
  Users,
  Store,
  FileText,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface SidebarLink {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const getSidebarLinks = (role: string | null): SidebarLink[] => {
  switch (role) {
    case 'restaurant':
      return [
        { path: '/store/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/store/menu', label: 'Menu', icon: UtensilsCrossed },
        { path: '/store/orders', label: 'Orders', icon: ShoppingBag },
        { path: '/store/settings', label: 'Settings', icon: Settings },
      ];
    case 'customer':
      return [
        { path: '/stores', label: 'Restaurants', icon: Store },
        { path: '/orders', label: 'My Orders', icon: Package },
      ];
    case 'rider':
      return [
        { path: '/rider/orders', label: 'Available Orders', icon: ShoppingBag },
        { path: '/rider/deliveries', label: 'My Deliveries', icon: Truck },
      ];
    case 'admin':
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/stores', label: 'Stores', icon: Store },
        { path: '/admin/orders', label: 'Orders', icon: FileText },
      ];
    default:
      return [];
  }
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar = ({ isOpen, onClose, isCollapsed, onToggleCollapse }: SidebarProps) => {
  const { role } = useAuthStore();
  const location = useLocation();
  const links = getSidebarLinks(role);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 h-16">
          {!isCollapsed && (
            <Link to="/" className="flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-primary-600" />
              <span className="text-xl font-bold text-primary-600">BiteDash</span>
            </Link>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center w-full">
              <UtensilsCrossed className="h-6 w-6 text-primary-600" />
            </div>
          )}
          <div className="flex items-center gap-2">
            {/* Collapse Toggle - Desktop */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              )}
            </button>
            {/* Close Button - Mobile */}
            <button
              onClick={onClose}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + '/');
              
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={() => {
                      // Close mobile sidebar on navigation
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      'hover:bg-gray-100',
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:text-gray-900'
                    )}
                    title={isCollapsed ? link.label : undefined}
                  >
                    <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary-600')} />
                    {!isCollapsed && (
                      <span className="text-sm truncate">{link.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};
