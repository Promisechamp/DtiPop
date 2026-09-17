// src/hooks/useBreakpoint.js
import { useState, useEffect } from 'react';

export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('lg');

  useEffect(() => {
    const breakpoints = {
      xs: '(max-width: 639px)',
      sm: '(min-width: 640px) and (max-width: 767px)',
      md: '(min-width: 768px) and (max-width: 1023px)',
      lg: '(min-width: 1024px) and (max-width: 1279px)',
      xl: '(min-width: 1280px) and (max-width: 1535px)',
      '2xl': '(min-width: 1536px)',
    };

    const getBreakpoint = () => {
      for (const [key, query] of Object.entries(breakpoints)) {
        if (window.matchMedia(query).matches) {
          return key;
        }
      }
      return 'lg';
    };

    const update = () => setBreakpoint(getBreakpoint());
    update();

    const listeners = Object.values(breakpoints).map((query) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', update);
      return mql;
    });

    return () => {
      listeners.forEach((mql) => mql.removeEventListener('change', update));
    };
  }, []);

  return breakpoint;
};