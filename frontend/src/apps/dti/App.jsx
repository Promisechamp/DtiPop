import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { WebSocketProvider } from "@/reusables/Websocket";
import { NotificationProvider } from "@/context/NotificationContext";

import ErrorBoundary from "@/components/ErrorBoundary";
import MaintenancePage from "@/components/MaintenancePage";

import { adminAPI } from "@/services/api/dtiApi";

import Navbar from "./components/common/Navbar";
import Footer from "./components/common/Footer";
import AdminLayout from "./admin/AdminLayout";

import HomePage from "./pages/HomePage";
import BrowseItemsPage from "./pages/BrowseItemsPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import CreateItemPage from "./pages/CreateItemPage";
import ApplicationsToMyItem from "./pages/ApplicationsToMyItem";
import EditItemPage from "./pages/EditItemPage";
import MyListedItemsPage from "./pages/MyListedItemsPage";
import MyApplicationsPage from "./pages/MyApplicationsPage";
import ReDeclareInterestPage from "./pages/ReDeclareInterestPage";
import WinnersPage from "./pages/WinnersPage";
import FavoritesPage from "./pages/FavoritesPage";
import AboutPage from "./pages/AboutPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import Notification from "./pages/NotificationPage";
import SupportTicketsPage from "./pages/SupportTicketsPage";
import BannedPage from "./pages/BannedPage";
import RatingsPage from "./pages/RatingsPage";
import SettingsPage from "@/pages/SettingsPage";
import ItemDiscussionPage from "./pages/ItemDiscussionPage";

import Login from "@/services/auth/Login";
import Register from "@/services/auth/Register";
import ForgotPassword from "@/services/auth/ForgotPassword";
import ResetPassword from "@/services/auth/ResetPassword";
import ConfirmEmail from "@/services/auth/ConfirmEmail";
import VerifyEmail from "@/services/auth/VerifyEmail";
import AuthCallback from "@/services/auth/AuthCallback";

import AdminDashboard from "./admin/AdminDashboard";
import AdminUsers from "./admin/Users";
import AdminUserProfile from "./admin/Users-profile";
import AdminItems from "./admin/Items";
import ReportsModerations from "./admin/chats_itemDiscussions_tickets/AdminModeration";
import AdminApplications from "./admin/Applications";
import AdminWinners from "./admin/Winners";
import ApiReferencePage from "./admin/ApiReferencePage";

import Overview from "./admin/analytics";
import Funnel from "./admin/analytics/Funnel";
import ItemPerformance from "./admin/analytics/ItemPerformance";
import UserInsights from "./admin/analytics/UserInsights";
import Fulfilment from "./admin/analytics/Fulfilment";

import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import RatingModal from "./components/common/RatingModal";
import DevTool from "@/devTools/TestTools";
import TermsOfServicePage from "@/pages/TermsOfService";
import PrivacyPolicyPage from "@/pages/PrivacyPolicy";

const MaintenanceContext = createContext(null);

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);

  if (!context) {
    throw new Error(
      "useMaintenance must be used within MaintenanceProvider"
    );
  }

  return context;
};

const MaintenanceProvider = ({ children }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  const checkMaintenance = useCallback(async () => {
    const startTime = performance.now();

    try {
      setChecking(true);
      setError(null);

      const response = await adminAPI.getMaintenanceStatus();
      const enabled = Boolean(
        response?.data?.maintenance_mode
      );

      setMaintenanceMode(enabled);

      if (import.meta.env.DEV) {
        console.log(
          `[MAINTENANCE] Status check: ${(
            performance.now() - startTime
          ).toFixed(0)}ms`
        );
      }

      return enabled;
    } catch (err) {
      console.error(
        "[MAINTENANCE] Error checking maintenance:",
        err
      );

      setMaintenanceMode(false);
      setError(err);

      return false;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkMaintenance();
  }, [checkMaintenance]);

  const value = useMemo(
    () => ({
      maintenanceMode,
      checking,
      error,
      refreshMaintenance: checkMaintenance,
    }),
    [
      maintenanceMode,
      checking,
      error,
      checkMaintenance,
    ]
  );

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
};

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50/40">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm font-medium text-ink-500">
          Loading...
        </p>
      </div>
    </div>
  );
};

const MaintenanceGuard = ({ children }) => {
  const {
    isAuthenticated,
    loading,
    isAdmin,
    user,
  } = useAuth();

  const {
    maintenanceMode,
    checking,
  } = useMaintenance();

  const location = useLocation();

  if (loading || checking) {
    return null;
  }

  const isAdminRoute =
    location.pathname.startsWith("/admin");

  const isMaintenancePage =
    location.pathname === "/maintenance";

  const authRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/confirm-email",
    "/verify-email",
    "/auth/callback",
  ];

  const isAuthRoute = authRoutes.includes(
    location.pathname
  );

  const isBannedPage =
    location.pathname === "/banned";

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    if (!isBannedPage) {
      return <Navigate to="/banned" replace />;
    }

    return children;
  }

  if (
    isBannedPage &&
    user?.ban_status !== "banned" &&
    user?.ban_status !== "deleted"
  ) {
    return <Navigate to="/" replace />;
  }

  if (
    maintenanceMode &&
    !isAdmin &&
    !isAdminRoute &&
    !isMaintenancePage &&
    !isAuthRoute
  ) {
    return <Navigate to="/maintenance" replace />;
  }

  if (
    !maintenanceMode &&
    isMaintenancePage
  ) {
    return <Navigate to="/" replace />;
  }

  if (
    isAdmin &&
    isMaintenancePage
  ) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

const ProtectedRoute = ({
  children,
  adminOnly = false,
}) => {
  const {
    isAuthenticated,
    loading,
    isAdmin,
    user,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return null;
  }

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    return <Navigate to="/banned" replace />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const {
    isAuthenticated,
    loading,
    isAdmin,
    user,
  } = useAuth();

  const location = useLocation();

  if (loading) {
    return null;
  }

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    return <Navigate to="/banned" replace />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const BannedGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    if (location.pathname !== "/banned") {
      return <Navigate to="/banned" replace />;
    }
  }

  return children;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const LayoutPublic = () => {
  const {
    loading,
    user,
    isAuthenticated,
    isAdmin,
  } = useAuth();

  const [showFooter, setShowFooter] =
    useState(false);

  const [pageLoaded, setPageLoaded] =
    useState(false);

  useEffect(() => {
    if (!loading) {
      setPageLoaded(true);
    }
  }, [loading]);

  useEffect(() => {
    if (!pageLoaded) {
      return;
    }

    const timer = setTimeout(() => {
      setShowFooter(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [pageLoaded]);

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    return <Navigate to="/banned" replace />;
  }

  if (loading) {
    return null;
  }

  if (isAuthenticated && isAdmin) {
    return (
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50/40">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-0 sm:px-6 lg:px-8 py-8 pt-[68px]">
        <Outlet />
      </main>

      {showFooter && <Footer />}
    </div>
  );
};

const LayoutAuthenticated = () => {
  const {
    loading,
    user,
    isAuthenticated,
    isAdmin,
  } = useAuth();

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    return <Navigate to="/banned" replace />;
  }

  if (loading) {
    return null;
  }

  if (isAuthenticated && isAdmin) {
    return (
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50/40">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-[68px]">
        <Outlet />
      </main>
    </div>
  );
};

const LayoutWithNavbar = () => {
  const {
    loading,
    user,
    isAuthenticated,
    isAdmin,
  } = useAuth();

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    return <Navigate to="/banned" replace />;
  }

  if (loading) {
    return null;
  }

  if (isAuthenticated && isAdmin) {
    return (
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50/40">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-[68px]">
        <Outlet />
      </main>
    </div>
  );
};

const LayoutWithoutNavbar = () => {
  const { loading, user } = useAuth();

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    return <Navigate to="/banned" replace />;
  }

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50/40">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

const LayoutBanned = () => {
  const { loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50/40">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

const NotFoundPage = () => {
  const { isAuthenticated, user } = useAuth();

  if (
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted"
  ) {
    return <Navigate to="/banned" replace />;
  }

  return (
    <div className="min-h-[80vh] p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 text-center">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-6">
          <i className="bi bi-exclamation-triangle text-4xl" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-ink-900">
          404
        </h1>

        <p className="mt-2 text-ink-600 text-sm sm:text-base">
          Oops! The page you're looking for doesn't exist.
        </p>

        <Link
          to={
            isAuthenticated
              ? "/dashboard"
              : "/"
          }
          className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-brand-600 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <i className="bi bi-arrow-left" />

          {isAuthenticated
            ? "Go to Dashboard"
            : "Go Home"}
        </Link>
      </div>
    </div>
  );
};

const DtiRoutes = () => {
  return (
    <Routes>
      <Route element={<LayoutPublic />}>
        <Route
          index
          element={
            <BannedGuard>
              <MaintenanceGuard>
                <HomePage />
              </MaintenanceGuard>
            </BannedGuard>
          }
        />

        <Route
          path="browse"
          element={
            <BannedGuard>
              <MaintenanceGuard>
                <BrowseItemsPage />
              </MaintenanceGuard>
            </BannedGuard>
          }
        />

        <Route
          path="item/:id"
          element={
            <BannedGuard>
              <MaintenanceGuard>
                <ItemDetailPage />
              </MaintenanceGuard>
            </BannedGuard>
          }
        />

        <Route
          path="about"
          element={
            <BannedGuard>
              <MaintenanceGuard>
                <AboutPage />
              </MaintenanceGuard>
            </BannedGuard>
          }
        />

        <Route
          path="how-it-works"
          element={
            <BannedGuard>
              <MaintenanceGuard>
                <HowItWorksPage />
              </MaintenanceGuard>
            </BannedGuard>
          }
        />

        <Route
          path="winners"
          element={
            <BannedGuard>
              <MaintenanceGuard>
                <WinnersPage />
              </MaintenanceGuard>
            </BannedGuard>
          }
        />

        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="forgot-password"
          element={<ForgotPassword />}
        />
        <Route
          path="reset-password"
          element={<ResetPassword />}
        />
        <Route
          path="confirm-email"
          element={<ConfirmEmail />}
        />
        <Route
          path="verify-email"
          element={<VerifyEmail />}
        />
        <Route
          path="auth/callback"
          element={<AuthCallback />}
        />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<FAQ />} />
        <Route
          path="maintenance"
          element={<MaintenancePage />}
        />
      </Route>

      <Route element={<LayoutBanned />}>
        <Route
          path="banned"
          element={<BannedPage />}
        />
      </Route>

      <Route element={<LayoutAuthenticated />}>
        <Route
          path="dashboard"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="create"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <CreateItemPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="my-listed-items"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <MyListedItemsPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="edit-item/:id"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <EditItemPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="applications-to-my-item"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <ApplicationsToMyItem />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="my-applications"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <MyApplicationsPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="redeclare-interest/:applicationId"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <ReDeclareInterestPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="profile"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="notifications"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <Notification />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="support-tickets"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <SupportTicketsPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="favorites"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <FavoritesPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="ratings"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <RatingsPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />

        <Route
          path="settings"
          element={
            <MaintenanceGuard>
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            </MaintenanceGuard>
          }
        />
      </Route>

      <Route element={<LayoutWithNavbar />}>
        <Route
          path="discussions/item/:itemId"
          element={
            <BannedGuard>
              <MaintenanceGuard>
                <ItemDiscussionPage />
              </MaintenanceGuard>
            </BannedGuard>
          }
        />
      </Route>

      <Route element={<LayoutWithoutNavbar />}>
        <Route
          path="admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route
            index
            element={<AdminDashboard />}
          />
          <Route
            path="users"
            element={<AdminUsers />}
          />
          <Route
            path="users-profile/:userId"
            element={<AdminUserProfile />}
          />
          <Route
            path="items"
            element={<AdminItems />}
          />
          <Route
            path="applications"
            element={<AdminApplications />}
          />
          <Route
            path="winners"
            element={<AdminWinners />}
          />
          <Route
            path="support"
            element={<ReportsModerations />}
          />
          <Route
            path="moderation"
            element={<ReportsModerations />}
          />
          <Route
            path="discussions/item/:itemId"
            element={<ItemDiscussionPage />}
          />
          <Route
            path="notifications"
            element={<Notification />}
          />
          <Route
            path="api-reference"
            element={<ApiReferencePage />}
          />
          <Route
            path="analytics"
            element={<Overview />}
          />
          <Route
            path="analytics/funnel"
            element={<Funnel />}
          />
          <Route
            path="analytics/items-performance"
            element={<ItemPerformance />}
          />
          <Route
            path="analytics/user-insights"
            element={<UserInsights />}
          />
          <Route
            path="analytics/fulfilment"
            element={<Fulfilment />}
          />
          <Route
            path="settings"
            element={<SettingsPage />}
          />
        </Route>
      </Route>

      <Route
        path="terms"
        element={<TermsOfServicePage />}
      />

      <Route
        path="privacy"
        element={<PrivacyPolicyPage />}
      />

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
};

const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <DtiRoutes />

      <RatingModal />

      <Toaster
        position="top-right"
        expand
        closeButton={false}
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "Nunito, system-ui, sans-serif",
            borderRadius: "1rem",
            padding: "1rem 1.25rem",
            fontSize: "0.875rem",
            background: "var(--color-ink-50)",
            color: "var(--color-ink-900)",
            border: "1px solid var(--color-ink-200)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          },
          classNames: {
            toast: "group",
            success:
              "!bg-[var(--color-primary-50)] !text-[var(--color-primary-800)] !border-[var(--color-primary-200)] dark:!bg-[var(--color-primary-900)] dark:!text-[var(--color-primary-100)] dark:!border-[var(--color-primary-700)]",
            error:
              "!bg-rose-50 !text-rose-900 !border-rose-200 dark:!bg-rose-950 dark:!text-rose-100 dark:!border-rose-800",
            warning:
              "!bg-amber-50 !text-amber-900 !border-amber-200 dark:!bg-amber-950 dark:!text-amber-100 dark:!border-amber-800",
            info:
              "!bg-sky-50 !text-sky-900 !border-sky-200 dark:!bg-sky-950 dark:!text-sky-100 dark:!border-sky-800",
            icon: "mr-3 flex-shrink-0",
            actionButton:
              "!bg-ink-100 !text-ink-700 hover:!bg-ink-200",
            cancelButton:
              "!bg-ink-50 !text-ink-500 hover:!bg-ink-100",
          },
        }}
      />

      <DevTool />
    </>
  );
};

const App = () => {
  return (
    <Router basename="/app/dti">
      <ScrollToTop />

      <WebSocketProvider>
        <MaintenanceProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <div className="min-h-screen flex flex-col">
                <AppContent />
              </div>
            </ErrorBoundary>
          </NotificationProvider>
        </MaintenanceProvider>
      </WebSocketProvider>
    </Router>
  );
};

export default App;