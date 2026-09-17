import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { adminAPI } from '@/services/api/dtiApi';
import LoadingSpinner from '@/reusables/LoadingSpinner';

const MaintenancePage = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [maintenanceData, setMaintenanceData] = useState({
    maintenance_mode: false,
    maintenance_message: 'We are currently undergoing maintenance. Please check back later.'
  });
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const response = await adminAPI.getMaintenanceStatus();
        const data = response.data;
        
        setMaintenanceData({
          maintenance_mode: data.maintenance_mode || false,
          maintenance_message: data.maintenance_message || 'We are currently undergoing maintenance. Please check back later.'
        });
        
        // If maintenance is off, redirect to home
        if (!data.maintenance_mode) {
          setIsRedirecting(true);
          window.location.href = '/';
          return;
        }
        
        // If user is admin, allow access to admin panel
        if (isAdmin && user) {
          setIsRedirecting(true);
          window.location.href = '/admin';
          return;
        }
        
      } catch (error) {
        console.error('Error checking maintenance status:', error);
        // If API fails, assume maintenance is off and redirect
        setIsRedirecting(true);
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    };

    checkMaintenance();
  }, [isAdmin, user]);

  if (loading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50/30">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50/30 px-4">
      <div className="max-w-md w-full text-center">
        {/* Maintenance Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-primary-50 border border-primary-200/60 rounded-2xl flex items-center justify-center shadow-sm">
            <i className="bi bi-tools text-5xl text-primary-600"></i>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-ink-900 mb-4 tracking-[-0.03em]">
          Under Maintenance
        </h1>

        {/* Message */}
        <div className="bg-white border border-ink-100/80 rounded-2xl shadow-sm p-6 mb-6">
          <p className="text-ink-600 leading-relaxed font-medium">
            {maintenanceData.maintenance_message || 'We are currently undergoing maintenance. Please check back later.'}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <span className="text-sm font-bold text-ink-500">Maintenance in progress</span>
        </div>

        {/* Contact Info */}
        <div className="bg-white border border-ink-100/80 rounded-2xl shadow-sm p-4">
          <p className="text-sm font-medium text-ink-500">
            <i className="bi bi-envelope mr-2"></i>
            For urgent inquiries, please contact us at:
          </p>
          <a 
            href="mailto:support@donttrashit.com" 
            className="text-primary-600 hover:text-primary-700 font-extrabold transition"
          >
            support@donttrashit.com
          </a>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white font-extrabold transition"
        >
          <i className="bi bi-arrow-clockwise"></i>
          Check Status
        </button>

        {/* Admin Note */}
        {isAdmin && user && (
          <div className="mt-4 p-4 bg-primary-50/50 border border-primary-200/60 rounded-2xl shadow-sm">
            <p className="text-sm font-bold text-primary-700">
              <i className="bi bi-shield-lock mr-2"></i>
              You are an admin. 
              <Link to="/admin" className="font-extrabold underline ml-1 hover:text-primary-900 transition">
                Go to Admin Panel →
              </Link>
            </p>
          </div>
        )}

        {/* Estimated Time (Optional) */}
        <p className="mt-8 text-xs font-medium text-ink-400">
          We'll be back online shortly. Thank you for your patience.
        </p>
      </div>
    </div>
  );
};

export default MaintenancePage;