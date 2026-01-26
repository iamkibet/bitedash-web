import { Card } from '../../components/common/Card';

export const AdminDashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <p className="text-sm text-gray-600 mb-1">Total Users</p>
          <p className="text-3xl font-bold text-gray-900">-</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Total Restaurants</p>
          <p className="text-3xl font-bold text-gray-900">-</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">-</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-primary-600">-</p>
        </Card>
      </div>
    </div>
  );
};
