import { useState, useRef, useEffect } from "react";
import useBranch from "../../hooks/useBranch";
import LogoutMenu from "./LogoutMenu";

const Navbar = ({ user }) => {
  const { selectedBranch } = useBranch();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const logoutButtonRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        logoutButtonRef.current &&
        !logoutButtonRef.current.contains(event.target) &&
        showLogoutMenu
      ) {
        setShowLogoutMenu(false);
      }
    };

    if (showLogoutMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showLogoutMenu]);

  const getRoleDisplayName = (role) => {
    const roleNames = {
      RECEPTION: "Reception",
      DENTIST: "Dentist",
      XRAY: "X-Ray Doctor",
      ADMIN: "Administrator",
    };
    return roleNames[role] || role;
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-gray-800 truncate sm:text-xl">
              Benas specialty dental clinic Management
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {selectedBranch && (
              <span className="hidden text-sm text-gray-600 md:inline-block sm:text-base">
                {selectedBranch.name}
              </span>
            )}
            <span className="hidden text-sm text-gray-700 md:inline-block sm:text-base">
              {user?.name} ({getRoleDisplayName(user?.role)})
            </span>
            <div className="relative" ref={logoutButtonRef}>
              <button
                onClick={() => setShowLogoutMenu(!showLogoutMenu)}
                className="px-3 py-2 text-sm font-bold text-white bg-red-500 rounded hover:bg-red-700 sm:px-4 sm:text-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
              {showLogoutMenu && (
                <LogoutMenu onClose={() => setShowLogoutMenu(false)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
