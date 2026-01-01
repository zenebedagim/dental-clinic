import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastProvider } from "./context/ToastContext";
import { PatientProvider } from "./context/PatientContext";
import { NotificationProvider } from "./context/NotificationContext";
import { NotificationToastContainer } from "./components/common/NotificationToast";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Login from "./components/auth/Login";
import ReceptionDashboardLayout from "./components/reception/Dashboard/ReceptionDashboardLayout";
import ReceptionDashboardHome from "./components/reception/Dashboard/ReceptionDashboardHome";
import ReceptionPatientSearchView from "./components/reception/Patients/ReceptionPatientSearchView";
import ReceptionAddAppointmentView from "./components/reception/Appointments/ReceptionAddAppointmentView";
import ReceptionAppointmentListView from "./components/reception/Appointments/ReceptionAppointmentListView";
import ReceptionPaymentsView from "./components/reception/Payments/ReceptionPaymentsView";
import AllPaymentsView from "./components/reception/Payments/AllPaymentsView";
import PrivatePaymentsView from "./components/reception/Payments/PrivatePaymentsView";
import DentistDashboardLayout from "./components/dentist/Dashboard/DentistDashboardLayout";
import DentistDashboardHome from "./components/dentist/Dashboard/DentistDashboardHome";
import DentistPatientsView from "./components/dentist/Patients/DentistPatientsView";
import DentistPatientSearchView from "./components/dentist/Patients/DentistPatientSearchView";
import DentistTreatmentView from "./components/dentist/Treatments/DentistTreatmentView";
import DentistXrayRequestsView from "./components/dentist/Xray/DentistXrayRequestsView";
import XrayDashboardLayout from "./components/xray/Dashboard/XrayDashboardLayout";
import XrayDashboardHome from "./components/xray/Dashboard/XrayDashboardHome";
import XrayRequestsView from "./components/xray/Requests/XrayRequestsView";
import XrayPatientSearchView from "./components/xray/Patients/XrayPatientSearchView";
import XrayViewerPublic from "./pages/XrayViewerPublic";
import useBranch from "./hooks/useBranch";
import AdminDashboardLayout from "./components/admin/Dashboard/AdminDashboardLayout";
import AdminDashboardHome from "./components/admin/Dashboard/AdminDashboardHome";
import BranchManagementView from "./components/admin/Branches/BranchManagementView";

// Smart root route component that redirects based on auth status
const RootRoute = () => {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  const selectedBranchStr = localStorage.getItem("selectedBranch");

  if (token && userStr) {
    let user = null;
    try {
      user = JSON.parse(userStr);
    } catch {
      // Invalid user data, clear it and go to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }

    // Admin users redirect to admin dashboard (no branch selection needed)
    if (user && user.role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    }

    // Check if branch is selected (should be set during login from user.branch)
    // Admin users don't need branch selection
    if (!selectedBranchStr && user.role !== "ADMIN") {
      // Branch should be set from login response, if missing, redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }

    // Only redirect if user data is valid and has a role
    if (user && user.role) {
      const roleRoutes = {
        RECEPTION: "/reception",
        DENTIST: "/dentist",
        XRAY: "/xray",
        ADMIN: "/admin",
      };
      const redirectPath = roleRoutes[user.role];
      if (redirectPath) {
        return <Navigate to={redirectPath} replace />;
      }
    }

    // If user data is invalid or role doesn't exist, clear it
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ToastProvider>
      <PatientProvider>
        <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/xray-share/:token" element={<XrayViewerPublic />} />
            <Route
              path="/reception"
              element={
                <ProtectedRoute role="RECEPTION">
                  <ReceptionDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ReceptionDashboardHome />} />
              <Route path="patients" element={<ReceptionPatientSearchView />} />
              <Route
                path="appointments"
                element={<ReceptionAppointmentListView />}
              />
              <Route
                path="appointments/new"
                element={<ReceptionAddAppointmentView />}
              />
              <Route path="payments" element={<ReceptionPaymentsView />} />
              <Route path="payments/all" element={<AllPaymentsView />} />
              <Route path="payments/private" element={<PrivatePaymentsView />} />
              {/* Redirect removed routes to dashboard */}
              <Route
                path="settings"
                element={<Navigate to="/reception" replace />}
              />
              <Route
                path="doctors"
                element={<Navigate to="/reception" replace />}
              />
              <Route
                path="branches"
                element={<Navigate to="/reception" replace />}
              />
              <Route
                path="resources"
                element={<Navigate to="/reception" replace />}
              />
            </Route>
            <Route
              path="/dentist"
              element={
                <ProtectedRoute role="DENTIST">
                  <DentistDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DentistDashboardHome />} />
              <Route path="patients" element={<DentistPatientsView />} />
              <Route path="treatment" element={<DentistTreatmentView />} />
              <Route path="search" element={<DentistPatientSearchView />} />
              <Route
                path="xray-requests"
                element={<DentistXrayRequestsView />}
              />
              {/* Redirect removed billing route to dashboard */}
              <Route
                path="billing"
                element={<Navigate to="/dentist" replace />}
              />
            </Route>
            <Route
              path="/xray"
              element={
                <ProtectedRoute role="XRAY">
                  <XrayDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<XrayDashboardHome />} />
              <Route path="requests" element={<XrayRequestsView />} />
              <Route path="search" element={<XrayPatientSearchView />} />
            </Route>
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="ADMIN">
                  <AdminDashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardHome />} />
              <Route path="branches" element={<BranchManagementView />} />
            </Route>
            <Route path="/" element={<RootRoute />} />
          </Routes>
          <NotificationToastContainer />
        </Router>
        </NotificationProvider>
      </PatientProvider>
    </ToastProvider>
  );
}

export default App;
