import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
Wrench,
Mail,
RefreshCw,
ShieldCheck,
Loader2,
ArrowRight,
AlertCircle,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { systemSettingsAPI } from '@/services/api/sharedApi';
import { DTI_BASE } from '@/utils/routeBases';

const DEFAULT_MESSAGE =
'We are currently undergoing maintenance. Please check back later.';

const MaintenancePage = () => {
const { user, isAdmin } = useAuth();
const navigate = useNavigate();

const [loading, setLoading] = useState(true);
const [isRedirecting, setIsRedirecting] = useState(false);
const [statusError, setStatusError] = useState(false);

const [maintenanceData, setMaintenanceData] = useState({
maintenance_mode: true,
maintenance_message: DEFAULT_MESSAGE,
});

const checkMaintenance = useCallback(
async (signal) => {
setLoading(true);
setStatusError(false);

  try {
    const response = await systemSettingsAPI.getMaintenanceStatus();

    if (signal?.aborted) return;

    const data = response?.data;

    // Do not interpret a missing or malformed response as
    // confirmation that maintenance mode is disabled.
    if (
      !data ||
      typeof data.maintenance_mode !== 'boolean'
    ) {
      throw new Error(
        'The maintenance status response is missing a valid maintenance_mode value.'
      );
    }

    const maintenanceMode = data.maintenance_mode;

    setMaintenanceData({
      maintenance_mode: maintenanceMode,
      maintenance_message:
        data.maintenance_message || DEFAULT_MESSAGE,
    });

    if (!maintenanceMode) {
      // Maintenance has been explicitly confirmed as disabled.
      // Navigate within the DTI application.
      setIsRedirecting(true);
      navigate(`${DTI_BASE}/dashboard`, { replace: true });
      return;
    }

    // When maintenance is enabled, stay on this page.
    // Admin access is handled by the application's route guards.
  } catch (error) {
    if (signal?.aborted) return;

    console.error(
      '[MAINTENANCE] Failed to check maintenance status:',
      error
    );

    setStatusError(true);

    // Fail safely: do not redirect to the dashboard or root
    // because the status could not be verified.
    setMaintenanceData({
      maintenance_mode: true,
      maintenance_message:
        'We could not verify the current system status. Please try checking again shortly.',
    });
  } finally {
    if (!signal?.aborted) {
      setLoading(false);
      setIsRedirecting(false);
    }
  }
},
[navigate]

);

useEffect(() => {
const controller = new AbortController();

checkMaintenance(controller.signal);

return () => {
  controller.abort();
};

}, [checkMaintenance]);

const handleRefresh = () => {
const controller = new AbortController();
checkMaintenance(controller.signal);
};

if (loading || isRedirecting) {
return (
<div className="flex min-h-screen items-center justify-center bg-ink-50/30 px-4">
<div className="flex flex-col items-center gap-3">
<Loader2
size={28}
className="animate-spin text-primary-600"
/>

      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">
        {isRedirecting
          ? 'Redirecting...'
          : 'Checking system status...'}
      </p>
    </div>
  </div>
);

}

return (
<div className="flex min-h-screen items-center justify-center bg-ink-50/30 px-4 py-10">
<div className="w-full max-w-md text-center">
{/* ICON */}
<div className="mb-7">
<div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-3xl border border-primary-100 bg-primary-50 text-primary-600 shadow-sm">
<Wrench size={40} strokeWidth={1.75} />

        <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-2xl border-2 border-white bg-warning-500 text-white shadow-sm">
          <span className="h-2 w-2 rounded-full bg-white" />
        </span>
      </div>
    </div>

    {/* TITLE */}
    <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
      Under Maintenance
    </h1>

    <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
      We're making things better. We'll be back online shortly.
    </p>

    {/* MESSAGE */}
    <div className="mt-6 rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium leading-6 text-ink-600">
        {maintenanceData.maintenance_message}
      </p>
    </div>

    {/* STATUS */}
    <div className="mt-5 flex items-center justify-center gap-2">
      {statusError ? (
        <>
          <AlertCircle
            size={15}
            className="shrink-0 text-warning-500"
          />

          <span className="text-xs font-extrabold uppercase tracking-wider text-warning-600">
            Unable to verify system status
          </span>
        </>
      ) : (
        <>
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning-400 opacity-75" />

            <span className="relative inline-flex h-3 w-3 rounded-full bg-warning-500" />
          </span>

          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-500">
            Maintenance in progress
          </span>
        </>
      )}
    </div>

    {/* CONTACT */}
    <div className="mt-6 rounded-[26px] border border-ink-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium leading-5 text-ink-500">
        For urgent inquiries, contact us at
      </p>

      <a
        href="mailto:support@donttrashit.com"
        className="mt-1 inline-flex items-center gap-1.5 text-sm font-extrabold text-primary-600 transition hover:text-primary-700"
      >
        <Mail size={14} />
        support@donttrashit.com
      </a>
    </div>

    {/* REFRESH */}
    <button
      type="button"
      onClick={handleRefresh}
      disabled={loading}
      className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <RefreshCw size={15} />
      )}

      {statusError ? 'Retry Status Check' : 'Check Status'}
    </button>

    {/* ADMIN NOTE */}
    {isAdmin && user && (
      <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3">
        <ShieldCheck
          size={15}
          className="shrink-0 text-primary-600"
        />

        <p className="text-xs font-bold text-primary-700">
          You're an admin.
        </p>

        <Link
          to={`${DTI_BASE}/admin`}
          className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-700 underline transition hover:text-primary-900 hover:no-underline"
        >
          Go to Admin
          <ArrowRight size={11} />
        </Link>
      </div>
    )}

    {/* FOOTNOTE */}
    <p className="mt-8 text-[11px] font-medium text-ink-400">
      We'll be back online shortly. Thank you for your patience.
    </p>
  </div>
</div>

);
};

export default MaintenancePage;