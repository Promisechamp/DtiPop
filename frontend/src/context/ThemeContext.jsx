// context/ThemeContext.jsx

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  THEMES,
  DEFAULT_THEME,
} from '@/utils/themes';

const ThemeContext = createContext(null);

export const ThemeProvider = ({
  children,
}) => {
  const [theme, setTheme] = useState(() => {
    try {
      const cachedTheme =
        localStorage.getItem('theme');

      if (
        cachedTheme &&
        THEMES.some(
          (item) => item.id === cachedTheme
        )
      ) {
        return cachedTheme;
      }
    } catch (error) {
      console.warn(
        '[Theme] Unable to read cached theme:',
        error
      );
    }

    return DEFAULT_THEME;
  });

  const changeTheme = useCallback(
    (newTheme) => {
      if (!newTheme) {
        return;
      }

      setTheme((currentTheme) => {
        if (currentTheme === newTheme) {
          return currentTheme;
        }

        return newTheme;
      });
    },
    []
  );

  useEffect(() => {
    if (!theme) {
      return;
    }

    document.documentElement.setAttribute(
      'data-theme',
      theme
    );

    try {
      localStorage.setItem(
        'theme',
        theme
      );
    } catch (error) {
      console.warn(
        '[Theme] Unable to save theme:',
        error
      );
    }

    const themeObj = THEMES.find(
      (item) => item.id === theme
    );

    if (!themeObj) {
      return;
    }

    let metaTag =
      document.querySelector(
        'meta[name="theme-color"]'
      );

    if (!metaTag) {
      metaTag =
        document.createElement('meta');

      metaTag.name =
        'theme-color';

      document.head.appendChild(
        metaTag
      );
    }

    // ✅ Fix: use a dark color for dark theme
    let metaColor = themeObj.primary;
    if (theme === 'dark') {
      metaColor = '#0f172a'; // slate-900
    }
    metaTag.content = metaColor;
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      changeTheme,
    }),
    [
      theme,
      changeTheme,
    ]
  );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used within ThemeProvider'
    );
  }

  return context;
};