import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/services/api/supabase';

const ResetPassword = () => {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isRecovery, setIsRecovery] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeRecovery = async () => {
      try {
        console.log('🔐 Initializing password recovery...');

        /*
         * ---------------------------------------------------------
         * 1. Check for PKCE recovery code
         *
         * Supabase PKCE recovery links can arrive as:
         *
         * /reset-password?code=xxxxx
         *
         * The code must be exchanged for a Supabase session.
         * ---------------------------------------------------------
         */
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');

        if (code) {
          console.log('🔑 Recovery code found. Exchanging for session...');

          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error(
              '❌ Failed to exchange recovery code:',
              error
            );

            throw error;
          }

          if (data?.session) {
            console.log('✅ Recovery session created');

            if (mounted) {
              setIsRecovery(true);
              setChecking(false);

              /*
               * Remove the code from the browser URL.
               * The recovery code should not remain visible in the URL.
               */
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );

              toast.info('Please set your new password.');
            }

            return;
          }
        }

        /*
         * ---------------------------------------------------------
         * 2. Handle legacy implicit-flow recovery URLs
         *
         * Example:
         *
         * /reset-password#access_token=...&type=recovery
         *
         * Supabase may already have processed this into a session.
         * ---------------------------------------------------------
         */
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'recovery') {
          console.log('🔑 Recovery access token found');

          /*
           * Explicitly establish the session from the recovery tokens.
           */
          if (refreshToken) {
            const { data, error } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

            if (error) {
              console.error(
                '❌ Failed to establish recovery session:',
                error
              );

              throw error;
            }

            if (data?.session) {
              console.log('✅ Recovery session established');

              if (mounted) {
                setIsRecovery(true);
                setChecking(false);

                /*
                 * Remove sensitive recovery tokens from the URL.
                 */
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );

                toast.info('Please set your new password.');
              }

              return;
            }
          }
        }

        /*
         * ---------------------------------------------------------
         * 3. Check whether Supabase already has a session
         *
         * This is useful when detectSessionInUrl has already
         * processed the recovery URL before this component runs.
         * ---------------------------------------------------------
         */
        console.log('🔎 Checking existing Supabase session...');

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          console.log('✅ Existing Supabase session found');

          if (mounted) {
            setIsRecovery(true);
            setChecking(false);
          }

          return;
        }

        /*
         * ---------------------------------------------------------
         * 4. No recovery session found
         * ---------------------------------------------------------
         */
        console.warn('⚠️ No recovery session found');

        if (mounted) {
          setChecking(false);
        }
      } catch (err) {
        console.error('❌ Recovery initialization error:', err);

        if (mounted) {
          setError(
            err?.message ||
              'This password reset link is invalid or has expired.'
          );

          setChecking(false);
          setIsRecovery(false);
        }
      }
    };

    /*
     * Listen for Supabase's PASSWORD_RECOVERY event.
     *
     * This can happen while the URL is being processed.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event);

        if (!mounted) return;

        if (event === 'PASSWORD_RECOVERY' && session) {
          console.log('✅ PASSWORD_RECOVERY session received');

          setIsRecovery(true);
          setChecking(false);

          toast.info('Please set your new password.');
        }

        /*
         * SIGNED_IN can also occur when Supabase establishes
         * the recovery session.
         */
        if (event === 'SIGNED_IN' && session) {
          console.log('✅ Recovery/sign-in session received');

          /*
           * Don't automatically redirect. The user still needs
           * to set their new password.
           */
          if (!isRecovery) {
            setIsRecovery(true);
            setChecking(false);
          }
        }
      }
    );

    initializeRecovery();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * -----------------------------------------------------------
   * Redirect only after recovery validation has completed.
   * -----------------------------------------------------------
   */
  useEffect(() => {
    if (!checking && !isRecovery) {
      toast.error(
        error ||
          'Invalid or expired reset link. Please request a new one.'
      );

      navigate('/login', { replace: true });
    }
  }, [checking, isRecovery, navigate, error]);

  /*
   * -----------------------------------------------------------
   * Submit new password
   * -----------------------------------------------------------
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      /*
       * Make absolutely sure the recovery session still exists.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          'Your password reset session has expired. Please request a new reset link.'
        );
      }

      console.log('🔐 Updating password...');

      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Password updated successfully');

      toast.success('Password updated successfully!');

      /*
       * The recovery session should no longer be needed.
       */
      await supabase.auth.signOut();

      navigate('/login', { replace: true });
    } catch (err) {
      console.error('❌ Password reset failed:', err);

      const message =
        err?.message ||
        'Unable to reset your password. Please request a new reset link.';

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /*
   * -----------------------------------------------------------
   * Loading / validation screen
   * -----------------------------------------------------------
   */
  if (checking) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-ink-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto" />

          <p className="mt-4 text-ink-600 font-medium">
            Validating reset link...
          </p>
        </div>
      </div>
    );
  }

  /*
   * -----------------------------------------------------------
   * Don't render the form if recovery is invalid.
   * The redirect effect will handle navigation.
   * -----------------------------------------------------------
   */
  if (!isRecovery) {
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-ink-50/30">
      <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-50 flex items-center justify-center">
            <i className="bi bi-shield-lock text-2xl text-primary-600" />
          </div>

          <h2 className="text-2xl font-extrabold mt-4 text-ink-900">
            Reset Password
          </h2>

          <p className="text-ink-600 font-medium">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200/60 text-rose-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 shadow-sm">
            <i className="bi bi-exclamation-triangle-fill text-rose-500" />

            <span className="text-sm font-bold">
              {error}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-bold text-ink-700 mb-1">
              New Password
            </label>

            <div className="relative">
              <i className="bi bi-lock absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10"
                placeholder="•••••••• (min. 6 characters)"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-ink-700 mb-1">
              Confirm New Password
            </label>

            <div className="relative">
              <i className="bi bi-shield-lock absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />

                Resetting...
              </>
            ) : (
              <>
                Reset Password
                <i className="bi bi-arrow-right" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-ink-600 font-medium mt-6">
          Remember your password?{' '}

          <Link
            to="/login"
            className="text-primary-600 font-extrabold hover:text-primary-700 transition"
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;