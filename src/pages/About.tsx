import { Card } from '../components/common/Card';
import {
  UtensilsCrossed,
  Heart,
  Target,
  Users,
  Code2,
  Smartphone,
  Store,
  Truck,
  ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const About = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-12">
      {/* Hero */}
      <section className="text-center pt-4 pb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 mb-6">
          <UtensilsCrossed className="h-7 w-7 text-primary-600" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          About BiteDash
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          We connect restaurants with customers and riders to make food delivery fast, reliable, and simple across Kenya.
        </p>
      </section>

      {/* What we do */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">What we do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 border border-gray-100 hover:border-primary-100 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Customers</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Browse restaurants, order from your favorite menus, and pay securely with M-Pesa. Track your order from kitchen to doorstep.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5 border border-gray-100 hover:border-primary-100 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Store className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Restaurants</h3>
                <p className="text-sm text-gray-600 mt-1">
                  List your menu, manage orders, and grow your reach. Update statuses and assign riders from one dashboard.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5 border border-gray-100 hover:border-primary-100 transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Riders</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Accept delivery requests, navigate to customers, and mark orders delivered. Earn on every trip you complete.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* For developers – API */}
      <section id="api">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">For developers</h2>
        <Card className="p-6 border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <Code2 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">REST API</h3>
              <p className="text-sm text-gray-600 mt-1">
                We provide a comprehensive REST API for building integrations, mobile apps, or internal tools. Authenticate with tokens and use standard REST conventions. Documentation and rate limits are available for registered developers—contact us for access.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Mobile app */}
      <section id="mobile">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Mobile app</h2>
        <Card className="p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0">
              <Smartphone className="h-8 w-8 text-primary-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900">BiteDash on the go</h3>
              <p className="text-sm text-gray-600 mt-2">
                Our mobile app brings the full experience to your phone: browse stores, place orders, pay with M-Pesa, and track deliveries in real time. Available for iOS and Android.
              </p>
              <p className="text-sm text-primary-600 font-medium mt-3">
                Download from the App Store and Google Play — coming soon.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Mission, values, community */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Our mission & values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 border border-gray-100 text-center">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <Target className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Mission</h3>
            <p className="text-sm text-gray-600 mt-1">
              Make great food accessible to everyone through fast, reliable delivery and strong restaurant partnerships.
            </p>
          </Card>
          <Card className="p-5 border border-gray-100 text-center">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <Heart className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Values</h3>
            <p className="text-sm text-gray-600 mt-1">
              Quality, reliability, and trust. We put customers and partners first in every decision we make.
            </p>
          </Card>
          <Card className="p-5 border border-gray-100 text-center">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mx-auto mb-3">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Community</h3>
            <p className="text-sm text-gray-600 mt-1">
              A growing network of food lovers, restaurants, and riders across Kenya, all powered by BiteDash.
            </p>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center pt-4">
        <p className="text-gray-600 mb-4">Ready to order or partner with us?</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/stores"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            Browse stores
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Contact us
          </Link>
        </div>
      </section>
    </div>
  );
};
