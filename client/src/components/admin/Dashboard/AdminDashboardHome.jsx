import { Link } from "react-router-dom";

const AdminDashboardHome = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Manage system settings and branches
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              to="/admin/branches"
              className="block w-full px-4 py-3 text-center text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              🏢 Manage Branches
            </Link>
            <Link
              to="/admin/reception"
              className="block w-full px-4 py-3 text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              👥 Reception Management
            </Link>
            <Link
              to="/admin/dentist"
              className="block w-full px-4 py-3 text-center text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              🦷 Dentist Management
            </Link>
            <Link
              to="/admin/xray"
              className="block w-full px-4 py-3 text-center text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors font-medium"
            >
              📷 X-Ray Management
            </Link>
          </div>
        </div>

        {/* System Information */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
            System Information
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Role:</strong> Administrator
            </p>
            <p>
              <strong>Access Level:</strong> Full System Access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;

