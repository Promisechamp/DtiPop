import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/services/api/supabase';

const GoogleLogin = ({
  redirectTo,
  lastUsed = false,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (loading) return;

    setLoading(true);

    const toastId = toast.loading('🔐 Connecting to Google...', {
      duration: 500,
    });

    try {
      console.log('🔄 Starting Google OAuth flow...');

      /*
       * Record the method immediately before leaving
       * the current page for Google's OAuth screen.
       *
       * This allows Login.jsx to know that Google was the
       * most recently selected login method.
       */
      try {
        localStorage.setItem('lastLoginMethod', 'google');
      } catch (storageError) {
        console.warn(
          'Unable to save last login method:',
          storageError
        );
      }

      /*
       * Notify the parent component as well.
       */
      onSuccess?.();

      const { data, error } =
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo:
              redirectTo ||
              `${window.location.origin}/auth/callback`,

            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

      console.log('📤 Supabase response:', data);

      if (error) {
        console.error(
          '❌ Supabase OAuth error:',
          error
        );

        /*
         * If OAuth failed, remove the Google method we
         * just recorded so the UI does not incorrectly
         * claim Google was the last successful method.
         */
        try {
          localStorage.removeItem('lastLoginMethod');
        } catch (storageError) {
          console.warn(
            'Unable to clear last login method:',
            storageError
          );
        }

        toast.dismiss(toastId);
        toast.error(
          error.message || 'Google login failed'
        );

        setLoading(false);
        return;
      }

      if (data?.url) {
        console.log('✅ Redirecting to Google');

        toast.dismiss(toastId);

        // toast.success('Redirecting to Google...', {
        //   duration: 1000,
        // });

        window.location.href = data.url;
      } else {
        console.error('❌ No URL in response');

        try {
          localStorage.removeItem('lastLoginMethod');
        } catch (storageError) {
          console.warn(
            'Unable to clear last login method:',
            storageError
          );
        }

        toast.dismiss(toastId);

        toast.error(
          'Failed to get Google login URL'
        );

        setLoading(false);
      }
    } catch (err) {
      console.error(
        '❌ Google login error:',
        err
      );

      try {
        localStorage.removeItem('lastLoginMethod');
      } catch (storageError) {
        console.warn(
          'Unable to clear last login method:',
          storageError
        );
      }

      toast.dismiss(toastId);

      toast.error(
        'Google login failed. Please try again.'
      );

      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`google-btn relative flex w-full items-center justify-center gap-3 rounded-2xl border-2 px-4 py-3.5 font-extrabold transition-all ${
        loading ? 'cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <>
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />

          <span>
            Connecting to Google...
          </span>
        </>
      ) : (
        <>
          <svg
            className="h-5 w-5 shrink-0"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />

            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.01c4.51-4.17 7.09-10.4 7.09-17.66z"
            />

            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />

            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6.01c-2.17 1.45-4.94 2.32-8.16 2.32-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>

          <span>
            Continue with Google
          </span>

          {/* Last used tag */}
          {lastUsed && (
            <div className=''>
											 	 <span className="absolute -top-2 right-3 rounded-lg bg-primary-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-primary">
                Last used
              </span>
												</div>
          )}
        </>
      )}
    </button>
  );
};

export default GoogleLogin;