import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";

import {
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useLocation,
} from "react-router-dom";
import { systemSettingsAPI } from '@/services/api/sharedApi';

import { Toaster } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { WebSocketProvider } from "@/reusables/Websocket";
import { NotificationProvider } from "@/context/NotificationContext";

import ErrorBoundary from "@/components/ErrorBoundary";
import MaintenancePage from "@/components/MaintenancePage";

import { adminAPI } from "@/services/api/dtiApi";
import { DTI_BASE, makePaths } from "@/utils/routeBases";

import UsersAppShell from "./components/appShell/UsersAppShell";
import AdminAppShell from "./components/appShell/AdminAppShell";

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
import ItemDiscussionPage from "./pages/ItemDiscussionPage";

import SettingsPage from "@/pages/SettingsPage";
import ChatPage from "@/pages/chat/ChatPage";

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

/* =========================================================
   ROUTE HELPERS
   to("/x")  -> "/app/dti/x"   (build absolute app URLs)
   strip(p)  -> "/x"           (read app-relative path)
========================================================= */

const { to, strip } = makePaths(DTI_BASE);

const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
];

/* =========================================================
   MAINTENANCE CONTEXT
========================================================= */

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

/* =========================================================
   MAINTENANCE PROVIDER

   Fail-closed behavior:
   - Valid response: use the actual maintenance status.
   - Request failure: restrict ordinary application access.
   - Authentication routes remain available so an administrator
     can sign in and access the admin area.
========================================================= */

const MaintenanceProvider = ({ children }) => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  const checkMaintenance = useCallback(async () => {
    setChecking(true);
    setError(null);

    try {
      const response = await systemSettingsAPI.getMaintenanceStatus();
      const status = response?.data?.maintenance_mode;

      if (typeof status !== "boolean") {
        throw new Error(
          "Invalid maintenance status response: maintenance_mode must be a boolean."
        );
      }

      setMaintenanceMode(status);

      return status;
    } catch (err) {
      console.error("[MAINTENANCE] Status check failed:", err);

      setError(err);

      // Preserve your fail-closed policy.
      setMaintenanceMode(true);

      return true;
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
    [maintenanceMode, checking, error, checkMaintenance]
  );

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
};



/* =========================================================
   LOADING SCREEN
========================================================= */

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-ink-50/40">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />

      <p className="text-sm font-medium text-ink-500">Loading...</p>
    </div>
  </div>
);

/* =========================================================
   MAINTENANCE GUARD

   Rules:
   - Wait for authentication and maintenance checks.
   - Banned/deleted users go to /banned.
   - Administrators may access admin routes during maintenance.
   - Authentication routes remain accessible.
   - Ordinary users are redirected to /maintenance.
========================================================= */

const MaintenanceGuard = ({ children }) => {
  const { loading, isAdmin, user, profileReady } = useAuth();

  const { maintenanceMode, checking, error } = useMaintenance();

  const location = useLocation();
  const path = strip(location.pathname);

  if (loading || checking) {
    return <LoadingScreen />;
  }

  if (user && !profileReady) {
    return <LoadingScreen />;
  }

  const isAdminRoute =
    path === "/admin" || path.startsWith("/admin/");

  const isMaintenancePage = path === "/maintenance";
  const isBannedPage = path === "/banned";

  const authRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/confirm-email",
    "/verify-email",
    "/auth/callback",
  ];

  const isAuthRoute = authRoutes.includes(path);

  const isBanned =
    user?.ban_status === "banned" ||
    user?.ban_status === "deleted";

  if (isBanned) {
    if (isBannedPage) {
      return children;
    }

    return <Navigate to={to("/banned")} replace />;
  }

  if (isBannedPage) {
    return <Navigate to={to("/")} replace />;
  }

  // During maintenance, allow administrators into admin routes.
  if (maintenanceMode && isAdmin && isAdminRoute) {
    return children;
  }

  // Keep authentication pages accessible during maintenance.
  if (maintenanceMode && isAuthRoute) {
    return children;
  }

  // Always allow the maintenance page to render when maintenance
  // is enabled OR when the maintenance status request has failed.
  if (isMaintenancePage) {
    if (maintenanceMode || error) {
      return children;
    }

    // Maintenance was successfully checked and is disabled.
    return <Navigate to={to("/dashboard")} replace />;
  }

  if (maintenanceMode) {
    return <Navigate to={to("/maintenance")} replace />;
  }

  return children;
};




/* =========================================================
   AUTHENTICATION GUARDS
========================================================= */

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user, profileReady } = useAuth();

  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && !profileReady) {
    return <LoadingScreen />;
  }

  const isBanned =
    user?.ban_status === "banned" || user?.ban_status === "deleted";

  if (isBanned) {
    return <Navigate to={to("/banned")} replace />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={to("/login")}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, isAdmin, user, profileReady } =
    useAuth();

  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && !profileReady) {
    return <LoadingScreen />;
  }

  const isBanned =
    user?.ban_status === "banned" || user?.ban_status === "deleted";

  if (isBanned) {
    return <Navigate to={to("/banned")} replace />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={to("/login")}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to={to("/dashboard")} replace />;
  }

  return children;
};

const BannedGuard = ({ children }) => {
  const { user, loading, profileReady } = useAuth();

  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && !profileReady) {
    return <LoadingScreen />;
  }

  const isBanned =
    user?.ban_status === "banned" || user?.ban_status === "deleted";

  if (isBanned && strip(location.pathname) !== "/banned") {
    return <Navigate to={to("/banned")} replace />;
  }

  return children;
};

/* =========================================================
   ROUTE GATES (layout routes: declared once per group)

   PublicGate:  BannedGuard -> MaintenanceGuard
   PrivateGate: MaintenanceGuard -> ProtectedRoute
========================================================= */

const PublicGate = () => (
  <BannedGuard>
    <MaintenanceGuard>
      <Outlet />
    </MaintenanceGuard>
  </BannedGuard>
);

const PrivateGate = () => (
  <MaintenanceGuard>
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  </MaintenanceGuard>
);

/* =========================================================
   AUTH LAYOUT
========================================================= */

const LayoutAuth = () => {
  const { loading, user, isAuthenticated, isAdmin, profileReady } =
    useAuth();

  const location = useLocation();

  if (loading || (user && !profileReady)) {
    return <LoadingScreen />;
  }

  const isBanned =
    user?.ban_status === "banned" || user?.ban_status === "deleted";

  if (isBanned) {
    return <Navigate to={to("/banned")} replace />;
  }

  // Authenticated users should not see login or registration pages.
  if (isAuthenticated && AUTH_PATHS.includes(strip(location.pathname))) {
    const from = location.state?.from;
    const fromPath =
      typeof from === "object" ? from?.pathname || "" : "";

    // Only return to a page that lives inside this app.
    const isInsideApp =
  fromPath.startsWith(`${DTI_BASE}/`) &&
  !fromPath.startsWith("//") &&
  !AUTH_PATHS.includes(strip(fromPath));

const destination = isAdmin
  ? to("/admin")
  : isInsideApp
    ? `${fromPath}${from.search || ""}${from.hash || ""}`
    : to("/dashboard");

    return <Navigate to={destination} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-500/40">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

/* =========================================================
   BANNED LAYOUT
========================================================= */

const LayoutBanned = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-ink-50/40">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

/* =========================================================
   404 PAGE
========================================================= */

const NotFoundPage = () => {
  const { isAuthenticated, isAdmin, user, profileReady } = useAuth();

  if (user && !profileReady) {
    return <LoadingScreen />;
  }

  const isBanned =
    user?.ban_status === "banned" || user?.ban_status === "deleted";

  if (isBanned) {
    return <Navigate to={to("/banned")} replace />;
  }

  const destination = !isAuthenticated
    ? to()
    : isAdmin
      ? to("/admin")
      : to("/dashboard");

  const destinationLabel = !isAuthenticated
    ? "Go Home"
    : isAdmin
      ? "Go to Admin Dashboard"
      : "Go to Dashboard";

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
          to={destination}
          className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-brand-600 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
        >
          <i className="bi bi-arrow-left" />
          {destinationLabel}
        </Link>
      </div>
    </div>
  );
};

/* =========================================================
   ROUTES
========================================================= */

const DtiRoutes = () => (
  <Routes>
    {/* /app/dti -> /app/dti/dashboard */}
    <Route index element={<Navigate to={to("/dashboard")} replace />} />

    {/* USER APPLICATION */}
    <Route element={<UsersAppShell />}>
      {/* Public pages */}
      <Route element={<PublicGate />}>
        <Route path="browse" element={<BrowseItemsPage />} />
        <Route path="item/:id" element={<ItemDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="winners" element={<WinnersPage />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<FAQ />} />
        <Route
          path="discussions/item/:itemId"
          element={<ItemDiscussionPage />}
        />
      </Route>

      <Route path="maintenance" element={<MaintenancePage />} />

      {/* Authenticated pages */}
      <Route element={<PrivateGate />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="create" element={<CreateItemPage />} />
        <Route path="my-listed-items" element={<MyListedItemsPage />} />
        <Route
          path="my-listed-items/applications"
          element={<ApplicationsToMyItem />}
        />
        <Route path="edit-item/:id" element={<EditItemPage />} />
        <Route path="my-applications" element={<MyApplicationsPage />} />
        <Route
          path="redeclare-interest/:applicationId"
          element={<ReDeclareInterestPage />}
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<Notification />} />
        <Route path="support-tickets" element={<SupportTicketsPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="ratings" element={<RatingsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="chat/:conversation" element={<ChatPage />} />
      </Route>
    </Route>

    {/* AUTHENTICATION PAGES */}
    <Route element={<LayoutAuth />}>
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="confirm-email" element={<ConfirmEmail />} />
      <Route path="verify-email" element={<VerifyEmail />} />
      <Route path="auth/callback" element={<AuthCallback />} />
    </Route>

    {/* BANNED USERS */}
    <Route element={<LayoutBanned />}>
      <Route path="banned" element={<BannedPage />} />
    </Route>

    {/* ADMIN APPLICATION */}
    <Route
      path="admin"
      element={
        <AdminRoute>
          <AdminAppShell />
        </AdminRoute>
      }
    >
      <Route index element={<AdminDashboard />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="users-profile/:userId" element={<AdminUserProfile />} />
      <Route path="items" element={<AdminItems />} />
      <Route path="applications" element={<AdminApplications />} />
      <Route path="winners" element={<AdminWinners />} />
      <Route path="support" element={<ReportsModerations />} />
      <Route path="moderation" element={<ReportsModerations />} />
      <Route
        path="discussions/item/:itemId"
        element={<ItemDiscussionPage />}
      />
      <Route path="notifications" element={<Notification />} />
      <Route path="api-reference" element={<ApiReferencePage />} />
      <Route path="analytics" element={<Overview />} />
      <Route path="analytics/funnel" element={<Funnel />} />
      <Route
        path="analytics/items-performance"
        element={<ItemPerformance />}
      />
      <Route
        path="analytics/user-insights"
        element={<UserInsights />}
      />
      <Route path="analytics/fulfilment" element={<Fulfilment />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="chat" element={<ChatPage />} />
      <Route path="chat/:conversation" element={<ChatPage />} />
    </Route>

    {/* LEGAL PAGES */}
    <Route path="terms" element={<TermsOfServicePage />} />
    <Route path="privacy" element={<PrivacyPolicyPage />} />

    {/* 404 */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

/* =========================================================
   APP CONTENT
========================================================= */

const AppContent = () => {
  const { loading, user, profileReady } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && !profileReady) {
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

            actionButton: "!bg-ink-100 !text-ink-700 hover:!bg-ink-200",

            cancelButton: "!bg-ink-50 !text-ink-500 hover:!bg-ink-100",
          },
        }}
      />

      <DevTool />
    </>
  );
};

/* =========================================================
   ROOT DTI APP
   No router here: RootApp owns the single BrowserRouter.
========================================================= */

const App = () => (
  <WebSocketProvider>
    <MaintenanceProvider>
      <NotificationProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col px-2">
            <AppContent />
          </div>
        </ErrorBoundary>
      </NotificationProvider>
    </MaintenanceProvider>
  </WebSocketProvider>
);

export default App;