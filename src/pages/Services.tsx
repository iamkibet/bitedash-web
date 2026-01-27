import { Card } from '../components/common/Card';
import { ShoppingBag, UtensilsCrossed, Bike, Shield, Clock, Headphones } from 'lucide-react';

export const Services = () => {
  const services = [
    {
      icon: ShoppingBag,
      title: 'Food Ordering',
      description: 'Browse and order from hundreds of restaurants in your area. Easy ordering with just a few clicks.',
    },
    {
      icon: UtensilsCrossed,
      title: 'Restaurant Partners',
      description: 'Join our platform and reach more customers. We provide tools to manage your menu and orders efficiently.',
    },
    {
      icon: Bike,
      title: 'Fast Delivery',
      description: 'Quick and reliable delivery service. Track your order in real-time and get your food fresh and hot.',
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Safe and secure M-Pesa payment integration. Your transactions are protected with industry-standard security.',
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: 'Round-the-clock customer support. We\'re here to help whenever you need us.',
    },
    {
      icon: Headphones,
      title: 'Customer Care',
      description: 'Dedicated customer service team ready to assist with any questions or concerns.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h1>
        <p className="text-xl text-gray-600">
          Everything you need for a seamless food delivery experience
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => {
          const Icon = service.icon;
          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary-100 rounded-lg">
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{service.title}</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">{service.description}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-8 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Ready to Get Started?</h2>
        <p className="text-gray-700 mb-6">
          Whether you're a customer looking for great food, a restaurant wanting to expand your reach,
          or a delivery partner seeking opportunities, we have something for you.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="/register"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Sign Up Now
          </a>
          <a
            href="/contact"
            className="px-6 py-3 bg-white text-primary-600 rounded-lg font-medium border border-primary-600 hover:bg-primary-50 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </Card>
    </div>
  );
};
