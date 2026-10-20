

import React, { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { DTI_BASE, POP_BASE } from "@/utils/routeBases";

import LandingPage from "./pages/LandingPage";

const DtiApp = lazy(() => import("./apps/dti/App"));
const PopApp = lazy(() => import("./apps/pop/App"));
const UsersAppShell = lazy(
  () => import("./apps/dti/components/appShell/UsersAppShell")
);

/* =========================================================
   APP PATH DETECTION
========================================================= */

const getAppFromPath = (pathname) => {
  if (pathname === DTI_BASE || pathname.startsWith(`${DTI_BASE}/`)) {
    return "dti";
  }

  if (pathname === POP_BASE || pathname.startsWith(`${POP_BASE}/`)) {
    return "pop";
  }

  return null;
};

/* =========================================================
   THEME SYNCHRONIZATION
========================================================= */

const ThemeSync = () => {
  const { settings, loading } = useAuth();
  const { changeTheme } = useTheme();

  // Apply the cached theme immediately.
  useEffect(() => {
    const cachedTheme = localStorage.getItem("theme");

    if (cachedTheme) {
      changeTheme(cachedTheme);
    }
  }, [changeTheme]);

  // Synchronize with the user's saved preference.
  useEffect(() => {
    if (loading || !settings?.theme) {
      return;
    }

    changeTheme(settings.theme);

    localStorage.setItem("theme", settings.theme);
  }, [settings?.theme, loading, changeTheme]);

  return null;
};

/* =========================================================
   SCROLL HELPER
========================================================= */

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

/* =========================================================
   SPLASH
========================================================= */

const Splash = ({ text }) => (
  <div className="min-h-screen flex items-center justify-center">
    <p>{text}</p>
  </div>
);

/* =========================================================
   ROOT NOT FOUND
   Shows the unknown path instead of redirecting, so a bad
   redirect can never turn into a loop through "/".
========================================================= */

const RootNotFound = () => {
  const { pathname, search } = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-black">404</h1>

        <p className="mt-2 text-sm">
          No page at <code>{pathname + search}</code>
        </p>

        <Link to="/" className="mt-4 inline-block underline">
          Go home
        </Link>
      </div>
    </div>
  );
};

/* =========================================================
   ROOT ROUTES
========================================================= */

const RootRoutes = () => {
  const { user, loading, profileReady, isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  // Remember the last app the user visited.
  useEffect(() => {
    const app = getAppFromPath(pathname);

    if (app) {
      localStorage.setItem("selectedApp", app);
    }
  }, [pathname]);

  if (loading || (user && !profileReady)) {
    return <Splash text="Loading your workspace..." />;
  }

  const authenticated = Boolean(isAuthenticated || user);

  const home =
    localStorage.getItem("selectedApp") === "pop"
      ? `${POP_BASE}/dashboard`
      : `${DTI_BASE}/dashboard`;

  return (
    <Suspense fallback={<Splash text="Opening your workspace..." />}>
      <Routes>
        {/* Authenticated users skip the landing page.
            Visitors get the landing page inside the DTI shell. */}
        <Route
          path="/"
          element={
            authenticated ? (
              <Navigate to={home} replace />
            ) : (
              <UsersAppShell />
            )
          }
        >
          <Route index element={<LandingPage />} />
        </Route>

        <Route path="/index.html" element={<Navigate to="/" replace />} />

        {/* Apps: the trailing /* is required */}
        <Route path="/app/dti/*" element={<DtiApp />} />
        <Route path="/app/pop/*" element={<PopApp />} />

        <Route path="*" element={<RootNotFound />} />
      </Routes>
    </Suspense>
  );
};

/* =========================================================
   ROOT APPLICATION
========================================================= */

export default function RootApp() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <ThemeProvider>
          <ThemeSync />
          <ScrollToTop />
          <RootRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}