import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { UtensilsCrossed, ShoppingBag, Bike, Shield } from 'lucide-react';

export const Home = () => {
  const { isAuthenticated, role } = useAuthStore();

  const getRoleDashboard = () => {
    switch (role) {
      case 'customer':
        return '/stores';
      case 'restaurant':
        return '/store/dashboard';
      case 'rider':
        return '/rider/orders';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/stores';
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to BiteDash</h1>
          <p className="text-xl text-gray-600 mb-8">
            Your food delivery platform for Kenya
          </p>
          <Link to={getRoleDashboard()}>
            <Button size="lg">Go to Dashboard</Button>
          </Link>
        </div>
      ) : (
        <div>
          <div className="text-center py-12 mb-12">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">BiteDash</h1>
            <p className="text-xl text-gray-600 mb-8">
              Order food from your favorite restaurants in Kenya
            </p>
            <div className="flex gap-4 justify-center">
              <Link to="/register">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg">Sign In</Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <UtensilsCrossed className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Restaurants</h3>
              <p className="text-gray-600">
                Browse and order from a variety of restaurants
              </p>
            </Card>
            <Card>
              <ShoppingBag className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Easy Ordering</h3>
              <p className="text-gray-600">
                Simple and fast ordering process
              </p>
            </Card>
            <Card>
              <Bike className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-gray-600">
                Quick and reliable delivery service
              </p>
            </Card>
            <Card>
              <Shield className="h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h3>
              <p className="text-gray-600">
                Safe M-Pesa payment integration
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
