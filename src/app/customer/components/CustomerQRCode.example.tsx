/**
 * Example usage of CustomerQRCode component
 *
 * This file demonstrates how to use the CustomerQRCode component in your customer dashboard
 */

'use client';

import CustomerQRCode from './CustomerQRCode';

export default function CustomerDashboardExample() {
  // Example user data - replace with actual user from your auth store
  const exampleUser = {
    id: 'user_12345',
    username: 'johndoe'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Dashboard Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Customer Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your payments and view purchase history
          </p>
        </div>

        {/* QR Code Section */}
        <div className="mb-8">
          <CustomerQRCode user={exampleUser} />
        </div>

        {/* Additional Dashboard Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Purchases */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Recent Purchases
            </h2>
            <p className="text-gray-600 text-sm">
              Your recent purchases will appear here
            </p>
          </div>

          {/* Payment Methods */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Payment Methods
            </h2>
            <p className="text-gray-600 text-sm">
              Manage your linked payment methods
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Usage with Zustand store:
 *
 * import { useAuthStore } from '@/lib/store';
 * import CustomerQRCode from './CustomerQRCode';
 *
 * export default function CustomerDashboard() {
 *   const { user } = useAuthStore();
 *
 *   if (!user) {
 *     return <div>Please log in</div>;
 *   }
 *
 *   return (
 *     <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 py-8 px-4">
 *       <div className="max-w-4xl mx-auto">
 *         <CustomerQRCode user={user} />
 *       </div>
 *     </div>
 *   );
 * }
 */
