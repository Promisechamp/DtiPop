import React, { useEffect } from "react";
import DtiApp from "./apps/dti/App";
import PopApp from "./apps/pop/App";
import LandingPage from "./pages/LandingPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";

const ThemeSync = () => {
  const { settings, loading } = useAuth();
  const { changeTheme } = useTheme();

  useEffect(() => {
    const cachedTheme = localStorage.getItem("theme");

    if (cachedTheme) {
      changeTheme(cachedTheme);
    }
  }, [changeTheme]);

  useEffect(() => {
    if (loading || !settings?.theme) {
      return;
    }

    const databaseTheme = settings.theme;

    changeTheme(databaseTheme);
    localStorage.setItem("theme", databaseTheme);
  }, [settings?.theme, loading, changeTheme]);

  return null;
};

const RootContent = () => {
  const path = window.location.pathname;

  if (path.startsWith("/app/dti")) {
    return <DtiApp />;
  }

  if (path.startsWith("/app/pop")) {
    return <PopApp />;
  }

  return <LandingPage />;
};

const RootApp = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ThemeSync />
        <RootContent />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default RootApp;