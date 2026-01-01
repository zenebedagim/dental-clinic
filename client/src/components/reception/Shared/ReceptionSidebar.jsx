import { NavLink, useLocation } from "react-router-dom";

const ReceptionSidebar = ({ onClose }) => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/reception") {
      return (
        location.pathname === "/reception" ||
        location.pathname === "/reception/"
      );
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "➤",
      path: "/reception",
      description: "Home View",
    },
    {
      id: "patient-search",
      label: "Patient Search & History",
      icon: "🧍‍♂️",
      path: "/reception/patients",
      description: "Search patient records",
    },
    {
      id: "appointments",
      label: "Appointment List",
      icon: "📋",
      path: "/reception/appointments",
      description: "View all appointments",
    },
    {
      id: "add-appointment",
      label: "Add Appointment",
      icon: "➕",
      path: "/reception/appointments/new",
      description: "Schedule new visit",
    },
    {
      id: "payments",
      label: "Payments / Billing",
      icon: "💳",
      path: "/reception/payments",
      description: "Payment collection",
    },
  ];

  return (
    <div className="flex flex-col w-64 min-h-screen text-white bg-gray-900">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-bold">Reception</h2>
          <p className="mt-1 text-xs text-gray-400">Navigation Menu</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 lg:hidden hover:text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={`
                flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200
                ${
                  active
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }
              `}
              title={item.description}
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium">{item.label}</div>
                {item.description && (
                  <div className="text-xs opacity-75 mt-0.5">
                    {item.description}
                  </div>
                )}
              </div>
              {active && <div className="w-2 h-2 bg-white rounded-full"></div>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-center text-gray-400">
          Reception Dashboard v1.0
        </div>
      </div>
    </div>
  );
};

export default ReceptionSidebar;
