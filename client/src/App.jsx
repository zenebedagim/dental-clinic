import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import { ToastProvider } from "./context/ToastContext";
import { PatientProvider } from "./context/PatientContext";
import { ReceptionProvider } from "./context/ReceptionContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";
import SkeletonLoader from "./components/common/SkeletonLoader";

// Code splitting - lazy load reception components
const ReceptionDashboardLayout = lazy(() =>
  import("./components/reception/Dashboard/ReceptionDashboardLayout")
);
const ReceptionDashboardHome = lazy(() =>
  import("./components/reception/Dashboard/ReceptionDashboardHome")
);
const ReceptionPatientSearchView = lazy(() =>
  import("./components/reception/Patients/ReceptionPatientSearchView")
);
const ReceptionAddAppointmentView = lazy(() =>
  import("./components/reception/Appointments/ReceptionAddAppointmentView")
);
const ReceptionAppointmentListView = lazy(() =>
  import("./components/reception/Appointments/ReceptionAppointmentListView")
);
const ReceptionPaymentsView = lazy(() =>
  import("./components/reception/Payments/ReceptionPaymentsView")
);
const PrivatePaymentsView = lazy(() =>
  import("./components/reception/Payments/PrivatePaymentsView")
);
import DentistDashboardLayout from "./components/dentist/Dashboard/DentistDashboardLayout";
import DentistDashboardHome from "./components/dentist/Dashboard/DentistDashboardHome";
import DentistPatientsView from "./components/dentist/Patients/DentistPatientsView";
import DentistTreatmentView from "./components/dentist/Treatments/DentistTreatmentView";
import DentistXrayRequestsView from "./components/dentist/Xray/DentistXrayRequestsView";
import DentistBillingPaymentView from "./components/dentist/Billing/DentistBillingPaymentView";
import XrayDashboardLayout from "./components/xray/Dashboard/XrayDashboardLayout";
import XrayDashboardHome from "./components/xray/Dashboard/XrayDashboardHome";
import XrayRequestsView from "./components/xray/Requests/XrayRequestsView";
import XrayPatientSearchView from "./components/xray/Patients/XrayPatientSearchView";
import XrayViewerPublic from "./pages/XrayViewerPublic";
import Login from "./components/auth/Login";
import FirstTimePasswordChange from "./components/admin/FirstTimePasswordChange";
import AdminDashboardLayout from "./components/admin/Dashboard/AdminDashboardLayout";
import AdminDashboardHome from "./components/admin/Dashboard/AdminDashboardHome";
import AdminBranchManagement from "./components/admin/Branches/AdminBranchManagement";
import AdminReceptionManagement from "./components/admin/Reception/AdminReceptionManagement";
import AdminDentistManagement from "./components/admin/Dentist/AdminDentistManagement";
import AdminXrayManagement from "./components/admin/Xray/AdminXrayManagement";

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
      // Invalid user data, clear it
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null; // No redirect, just clear data
    }

    // Check if branch is selected (should be set during login from user.branch)
    // ADMIN users don't require branch selection
    if (user?.role !== "ADMIN" && !selectedBranchStr) {
      // Branch should be set from login response, if missing, clear data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null; // No redirect, just clear data
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
        // For admin users, check passwordChanged flag
        if (user.role === "ADMIN" && user.passwordChanged === false) {
          return <Navigate to="/admin/change-password" replace />;
        }
        // For other roles or admin with password changed, redirect to their dashboard
        return <Navigate to={redirectPath} replace />;
      }
    }

    // If user data is invalid or role doesn't exist, clear it
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  // Redirect to login if no token
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ErrorBoundary>
          <PatientProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/xray-share/:token"
                  element={<XrayViewerPublic />}
                />
                <Route
                  path="/reception"
                  element={
                    <ProtectedRoute role="RECEPTION">
                      <ReceptionProvider>
                        <Suspense
                          fallback={
                            <div className="flex items-center justify-center min-h-screen">
                              <SkeletonLoader type="card" count={3} />
                            </div>
                          }
                        >
                          <ReceptionDashboardLayout />
                        </Suspense>
                      </ReceptionProvider>
                    </ProtectedRoute>
                  }
                >
                  <Route
                    index
                    element={
                      <Suspense
                        fallback={
                          <div className="p-6">
                            <SkeletonLoader type="card" count={3} />
                          </div>
                        }
                      >
                        <ReceptionDashboardHome />
                      </Suspense>
                    }
                  />
                  <Route
                    path="patients"
                    element={
                      <Suspense
                        fallback={
                          <div className="p-6">
                            <SkeletonLoader type="card" count={2} />
                          </div>
                        }
                      >
                        <ReceptionPatientSearchView />
                      </Suspense>
                    }
                  />
                  <Route
                    path="appointments"
                    element={
                      <Suspense
                        fallback={
                          <div className="p-6">
                            <SkeletonLoader type="table" count={5} />
                          </div>
                        }
                      >
                        <ReceptionAppointmentListView />
                      </Suspense>
                    }
                  />
                  <Route
                    path="appointments/new"
                    element={
                      <Suspense
                        fallback={
                          <div className="p-6">
                            <SkeletonLoader type="card" count={1} />
                          </div>
                        }
                      >
                        <ReceptionAddAppointmentView />
                      </Suspense>
                    }
                  />
                  <Route
                    path="payments"
                    element={
                      <Suspense
                        fallback={
                          <div className="p-6">
                            <SkeletonLoader type="table" count={5} />
                          </div>
                        }
                      >
                        <ReceptionPaymentsView />
                      </Suspense>
                    }
                  />
                  <Route
                    path="payments/private"
                    element={
                      <Suspense
                        fallback={
                          <div className="p-6">
                            <SkeletonLoader type="table" count={5} />
                          </div>
                        }
                      >
                        <PrivatePaymentsView />
                      </Suspense>
                    }
                  />
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
                  <Route
                    path="xray-requests"
                    element={<DentistXrayRequestsView />}
                  />
                  <Route
                    path="xray"
                    element={<Navigate to="/dentist/xray-requests" replace />}
                  />
                  <Route
                    path="billing-payment"
                    element={<DentistBillingPaymentView />}
                  />
                  {/* Redirect removed routes to patients page */}
                  <Route
                    path="search"
                    element={<Navigate to="/dentist/patients" replace />}
                  />
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
                  <Route
                    path="change-password"
                    element={<FirstTimePasswordChange />}
                  />
                  <Route path="branches" element={<AdminBranchManagement />} />
                  <Route
                    path="reception"
                    element={<AdminReceptionManagement />}
                  />
                  <Route path="dentist" element={<AdminDentistManagement />} />
                  <Route path="xray" element={<AdminXrayManagement />} />
                </Route>
                <Route path="/" element={<RootRoute />} />
              </Routes>
            </Router>
          </PatientProvider>
        </ErrorBoundary>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
