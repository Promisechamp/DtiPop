import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import GoogleLogin from './GoogleLogin';

const Login = ({ app = 'dti' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useGoogle, setUseGoogle] = useState(false);

  const { signIn, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine the basename for the current app
  const basename = app === 'pop' ? '/app/pop' : '/app/dti';

  // Get raw `from` from state or query param
  const rawFrom =
    location.state?.from ||
    new URLSearchParams(location.search).get('redirect') ||
    '/';

  // Strip basename if present so the path is relative to the basename router
  const from = rawFrom.startsWith(basename)
    ? rawFrom.slice(basename.length) || '/'
    : rawFrom;

  const searchParams = new URLSearchParams(location.search);
  const showApplyModal = searchParams.get('show-apply-modal');

  const getDefaultRedirect = () => {
    if (isAdmin) return '/admin';
    if (app === 'pop') return '/dashboard';
    return '/dashboard';
  };

  const getRedirectPath = () => {
    if (isAdmin) return '/admin';
    if (!from || from === '/' || from === '/login' || from === '/register') {
      return getDefaultRedirect();
    }
    return from;
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let redirectPath = getRedirectPath();
    if (showApplyModal) {
      redirectPath += `?show-apply-modal=${showApplyModal}`;
    }

    const currentPath = location.pathname + location.search;
    if (currentPath !== redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [authLoading, user, isAdmin, showApplyModal, location, navigate, from, app]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message || 'Invalid credentials');
        setLoading(false);
        return;
      }
      toast.success('Welcome back! 🎉');
      // No manual navigation; useEffect handles it
    } catch (err) {
      console.error('Sign-in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-2 py-12 mt-10 bg-ink-50/30">
      <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold mt-4 text-ink-900">Welcome Back</h2>
          <p className="text-ink-600 font-medium">Sign in to continue giving</p>
        </div>

        {useGoogle && (
          <div className="bg-primary-50 border border-primary-200/60 rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-start gap-2">
              <i className="bi bi-info-circle text-primary-600 mt-0.5"></i>
              <div>
                <p className="text-sm font-bold text-primary-700">
                  This email is registered with Google
                </p>
                <p className="text-sm font-medium text-primary-600">
                  Please use the "Continue with Google" button below to sign in.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && !useGoogle && (
          <div className="bg-rose-50 border border-rose-200/60 text-rose-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 shadow-sm">
            <i className="bi bi-exclamation-triangle-fill text-rose-500"></i>
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {!useGoogle && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-bold text-ink-700 mb-1">Email Address</label>
              <div className="relative">
                <i className="bi bi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"></i>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-ink-700 mb-1">Password</label>
              <div className="relative">
                <i className="bi bi-lock absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"></i>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign In <i className="bi bi-arrow-right"></i>
                </>
              )}
            </button>
          </form>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink-100"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-ink-500 font-medium">Or continue with</span>
          </div>
        </div>

        <GoogleLogin
          redirectTo={
            app === 'pop'
              ? `${window.location.origin}/app/pop/auth/callback`
              : `${window.location.origin}/app/dti/auth/callback`
          }
        />

        <div className="mt-6 text-center space-y-2">
          <p className="text-ink-600 font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-600 font-extrabold hover:text-primary-700 transition">
              Sign Up
            </Link>
          </p>
          <p>
            <Link to="/forgot-password" className="underline text-sm font-bold text-ink-500 hover:text-ink-700 transition">
              Forgot password?
            </Link>
          </p>
          {useGoogle && (
            <button
              onClick={() => {
                setUseGoogle(false);
                setError('');
              }}
              className="text-sm font-bold text-ink-500 hover:text-ink-700 transition"
            >
              ← Back to email login
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;