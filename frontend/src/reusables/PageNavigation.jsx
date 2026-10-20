import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/* =========================================================
   SKELETON
   Mirrors the real component's structure so there's no jump
   when data loads.
========================================================= */

export const PageNavigationSkeleton = () => (
  <div className="flex animate-pulse items-center gap-2.5 px-0 py-5">
    <div className="h-10 w-24 rounded-lg bg-ink-200" />
    <div className="h-6 w-px bg-ink-200" />
    <div className="h-10 w-24 rounded-lg bg-ink-200" />
  </div>
);

/* =========================================================
   MAIN
========================================================= */

export const PageNavigation = ({
  showBack = true,
  showHome = true,
  backPath,
  className = '',
  backLabel = 'Back',
  homeLabel = 'Home',
}) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const handleHome = () => {
    if (isAuthenticated && isAdmin) {
      navigate('/admin');
    } else if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const buttonClass =
    'group inline-flex h-10 items-center gap-2 rounded-lg border border-ink-300 bg-white px-3.5 text-sm font-bold text-ink-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-700 hover:shadow-md cursor-pointer';

  return (
    <div className={`flex items-center gap-2.5 px-4 py-10 -mb-8 ${className}`}>
      {showBack && (
        <button
          type="button"
          onClick={handleBack}
          className={buttonClass}
          aria-label="Go back"
        >
          <ArrowLeft
            size={15}
            className="transition-transform duration-200 group-hover:-translate-x-0.5"
          />
          <span>{backLabel}</span>
        </button>
      )}

      {showBack && showHome && (
        <div className="h-6 w-px bg-ink-100/80" aria-hidden="true" />
      )}

      {showHome && (
        <button
          type="button"
          onClick={handleHome}
          className={buttonClass}
          aria-label="Go to home"
        >
          <Home
            size={15}
            className="transition-transform duration-200 group-hover:scale-105"
          />
          <span>{homeLabel}</span>
        </button>
      )}
    </div>
  );
};