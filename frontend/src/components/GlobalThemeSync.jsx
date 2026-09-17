import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const GlobalThemeSync = () => {
  const { changeTheme } = useTheme();

  useEffect(() => {
    // Apply the saved theme immediately on application startup.
    const cachedTheme = localStorage.getItem('theme');

    if (cachedTheme) {
      changeTheme(cachedTheme);
    }
  }, [changeTheme]);

  useEffect(() => {
    // Keep the theme synchronized if another part of the application
    // changes localStorage.
    const handleStorageChange = (event) => {
      if (event.key !== 'theme') return;

      const nextTheme = event.newValue;

      if (nextTheme) {
        changeTheme(nextTheme);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [changeTheme]);

  return null;
};

export default GlobalThemeSync;