import { NavLink, useLocation } from "react-router-dom";

const DentistSidebar = ({ onClose }) => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/dentist") {
      return (
        location.pathname === "/dentist" ||
        location.pathname === "/dentist/"
      );
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "🏠",
      path: "/dentist",
      description: "Home View",
    },
    {
      id: "patients",
      label: "My Patients",
      icon: "👥",
      path: "/dentist/patients",
      description: "View appointments",
    },
    {
      id: "treatment",
      label: "Treatment",
      icon: "🦷",
      path: "/dentist/treatment",
      description: "Treatment form",
    },
    {
      id: "patient-search",
      label: "Patient Search",
      icon: "🔍",
      path: "/dentist/search",
      description: "Search patient records",
    },
    {
      id: "xray-requests",
      label: "X-Ray Requests",
      icon: "🩻",
      path: "/dentist/xray-requests",
      description: "Manage X-Ray requests",
    },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">Dentist</h2>
          <p className="text-xs text-gray-400 mt-1">Navigation Menu</p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-gray-400 hover:text-white"
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

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
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
                <div className="font-medium text-sm">{item.label}</div>
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
        <div className="text-xs text-gray-400 text-center">
          Dentist Dashboard v1.0
        </div>
      </div>
    </div>
  );
};

export default DentistSidebar;

