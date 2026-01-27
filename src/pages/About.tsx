import { Card } from '../components/common/Card';
import { UtensilsCrossed, Heart, Target, Users } from 'lucide-react';

export const About = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About BiteDash</h1>
        <p className="text-xl text-gray-600">
          Your trusted food delivery platform in Kenya
        </p>
      </div>

      <Card className="p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Story</h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          BiteDash was founded with a simple mission: to connect Kenyans with their favorite
          restaurants and make food delivery fast, reliable, and affordable. We believe that
          everyone deserves access to great food, delivered right to their doorstep.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Since our launch, we've partnered with hundreds of restaurants across Kenya,
          helping them reach more customers while providing an exceptional dining experience
          for food lovers everywhere.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <Target className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Mission</h3>
          <p className="text-gray-600">
            To revolutionize food delivery in Kenya by making it fast, reliable, and accessible to everyone.
          </p>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <Heart className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Values</h3>
          <p className="text-gray-600">
            We value quality, reliability, and customer satisfaction above all else.
          </p>
        </Card>

        <Card className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-100 rounded-full">
              <Users className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Our Community</h3>
          <p className="text-gray-600">
            We're building a community of food lovers, restaurants, and delivery partners.
          </p>
        </Card>
      </div>
    </div>
  );
};
