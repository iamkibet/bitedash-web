import { Card } from '../components/common/Card';
import {
  ShoppingBag,
  UtensilsCrossed,
  Bike,
  Shield,
  Clock,
  Headphones,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const services = [
  {
    icon: ShoppingBag,
    title: 'Food ordering',
    description: 'Browse restaurants, build your order, and checkout in minutes. Filter by cuisine, ratings, and delivery time.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Restaurant partners',
    description: 'List your menu, manage orders from one dashboard, and reach more customers. Assign riders and update availability in one place.',
  },
  {
    icon: Bike,
    title: 'Fast delivery',
    description: 'Reliable delivery with real-time tracking. Orders are matched with nearby riders so food arrives fresh and on time.',
  },
  {
    icon: Shield,
    title: 'Secure payments',
    description: 'Pay with M-Pesa or other supported methods. Transactions are protected with industry-standard security.',
  },
  {
    icon: Clock,
    title: '24/7 ordering',
    description: 'Place orders anytime. See who’s open and when they deliver—restaurants set their own hours.',
  },
  {
    icon: Headphones,
    title: 'Customer care',
    description: 'Need help with an order or your account? Our support team handles refunds, issues, and enquiries.',
  },
] as const;

export const Services = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
      {/* Hero */}
      <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 py-10 sm:py-14 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 text-primary-600 mb-6 shadow-sm">
            <UtensilsCrossed className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Our services
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Everything you need for seamless food delivery—whether you’re ordering, selling, or delivering.
          </p>
        </div>
      </section>

      {/* Service grid */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          What we offer
        </h2>
        <p className="text-sm text-gray-600 mb-6 sm:mb-8 max-w-2xl">
          From ordering to delivery and support—here’s how BiteDash works for you.
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <li key={index}>
                <Card
                  className="h-full p-5 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-sm hover:shadow-md hover:border-primary-200/80 transition-all duration-200"
                  padding="none"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 ring-1 ring-primary-100/50"
                      aria-hidden
                    >
                      <Icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h3 className="font-semibold text-gray-900 text-base sm:text-lg">
                        {service.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {/* CTA */}
      <section className="pb-4">
        <Card
          className="relative p-6 sm:p-8 overflow-hidden bg-white border border-primary-100 rounded-2xl shadow-sm"
          padding="none"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-50/80 via-white to-primary-50/40 pointer-events-none" aria-hidden />
          <div className="relative">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
              Ready to get started?
            </h2>
            <p className="text-sm sm:text-base text-gray-700 mb-6 max-w-xl">
              Whether you’re a customer, restaurant, or delivery partner—we’ve got you covered. Sign up or get in touch.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors shadow-sm"
              >
                Sign up
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Contact us
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
