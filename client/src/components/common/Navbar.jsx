import { useNavigate } from "react-router-dom";
import useBranch from "../../hooks/useBranch";

const Navbar = ({ user }) => {
  const navigate = useNavigate();
  const { selectedBranch } = useBranch();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedBranch");
    // Dispatch custom event to trigger socket disconnection
    window.dispatchEvent(new Event("tokenChanged"));
    navigate("/login");
  };

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
              Benas Specialiality Dental Clinc Management
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
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm font-bold text-white bg-red-500 rounded hover:bg-red-700 sm:px-4 sm:text-base"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
