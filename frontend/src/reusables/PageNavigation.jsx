import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// 1. Export the skeleton matching the exact height, padding, and elements
export const PageNavigationSkeleton = () => (
  <div className="flex items-center gap-2.5 py-5 animate-pulse">
    <div className="h-10 w-24 rounded-lg bg-ink-200" />
    <div className="h-6 w-px bg-ink-200" />
    <div className="h-10 w-24 rounded-lg bg-ink-200" />
  </div>
);

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
    'group inline-flex h-10 items-center gap-2 border border-ink-300 bg-white rounded-lg px-3.5 text-sm font-bold text-ink-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50/60 hover:text-primary-700 hover:shadow-md cursor-pointer';

  return (
    <div className={`flex items-center gap-2.5 py-5 ${className}`}>
      {showBack && (
        <button
          type="button"
          onClick={handleBack}
          className={buttonClass}
          aria-label="Go back"
        >
          <i className="bi bi-arrow-left text-[15px] transition-transform duration-200 group-hover:-translate-x-0.5" />
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
          <i className="bi bi-house-door text-[15px] transition-transform duration-200 group-hover:scale-105" />
          <span>{homeLabel}</span>
        </button>
      )}
    </div>
  );
};