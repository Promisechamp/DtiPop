import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import GoogleLogin from './GoogleLogin';
import popLogo from '@/assets/popLogo3.png';
import dtiLogo from '@/assets/dti.png';

const Login = ({ app = 'dti' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useGoogle, setUseGoogle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastLoginMethod, setLastLoginMethod] = useState(null);

  const { signIn, user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentApp = app === 'pop' ? 'pop' : 'dti';
  const basename = currentApp === 'pop' ? '/app/pop' : '/app/dti';

  /* ------------------------------------------------------------
     App switcher
     ------------------------------------------------------------ */
  const switchApp = (targetApp) => {
    const targetBase = targetApp === 'pop' ? '/app/pop' : '/app/dti';
    window.location.assign(`${targetBase}/login`);
  };

  /* ------------------------------------------------------------
     Last login method
     ------------------------------------------------------------ */
  useEffect(() => {
    try {
      const savedMethod = localStorage.getItem('lastLoginMethod');

      if (savedMethod === 'email' || savedMethod === 'google') {
        setLastLoginMethod(savedMethod);
      }
    } catch (err) {
      console.warn('Unable to read last login method:', err);
    }
  }, []);

  const rememberLoginMethod = (method) => {
    try {
      localStorage.setItem('lastLoginMethod', method);
      setLastLoginMethod(method);
    } catch (err) {
      console.warn('Unable to save last login method:', err);
    }
  };

  /* ------------------------------------------------------------
     Redirect handling
     ------------------------------------------------------------ */
  const rawFrom =
    location.state?.from ||
    new URLSearchParams(location.search).get('redirect') ||
    '/';

  const from = rawFrom.startsWith(basename)
    ? rawFrom.slice(basename.length) || '/'
    : rawFrom;

  const searchParams = new URLSearchParams(location.search);
  const showApplyModal = searchParams.get('show-apply-modal');

  const getDefaultRedirect = () => (
    isAdmin ? '/admin' : '/dashboard'
  );

  const getRedirectPath = () => {
    if (isAdmin) return '/admin';

    if (
      !from ||
      from === '/' ||
      from === '/login' ||
      from === '/register'
    ) {
      return getDefaultRedirect();
    }

    return from;
  };

  useEffect(() => {
    if (authLoading || !user) return;

    let redirectPath = getRedirectPath();

    if (showApplyModal) {
      redirectPath += `?show-apply-modal=${showApplyModal}`;
    }

    const currentPath = location.pathname + location.search;

    if (currentPath !== redirectPath) {
      navigate(redirectPath, { replace: true });
    }
  }, [
    authLoading,
    user,
    isAdmin,
    showApplyModal,
    location,
    navigate,
    from,
    currentApp,
  ]);

  /* ------------------------------------------------------------
     Email / password login
     ------------------------------------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setUseGoogle(false);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const { error: signInError } = await signIn(
        cleanEmail,
        password
      );

      if (signInError) {
        if (
          signInError.useGoogle ||
          signInError.code === 'GOOGLE_ACCOUNT'
        ) {
          setUseGoogle(true);
          setError(
            'This email is registered with Google. Please continue with Google.'
          );
        } else {
          setError(
            signInError.message || 'Invalid credentials'
          );
        }

        setLoading(false);
        return;
      }

      rememberLoginMethod('email');
      toast.success('Welcome back! 🎉');
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = () => {
    rememberLoginMethod('google');
  };

  if (authLoading) return null;

  const googleRedirect =
    currentApp === 'pop'
      ? `${window.location.origin}/app/pop/auth/callback`
      : `${window.location.origin}/app/dti/auth/callback`;

  const isPop = currentApp === 'pop';

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">

      {/* ========================================================
          LEFT PANEL — brand / context (hidden below lg)
      ======================================================== */}
      <div className="relative hidden overflow-hidden bg-primary-600 lg:flex lg:w-[45%] lg:flex-col lg:justify-between">

        {/* Dot-grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            color: '#ffffff',
          }}
        />

        {/* Soft glow accents */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-500/40 blur-3xl" />
          <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-primary-700/60 blur-3xl" />
        </div>

        {/* NAV */}
        <div className="relative z-10 flex items-center justify-between px-10 pt-10">
          <Link
            to="/"
            aria-label="Home"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <i className="bi bi-house text-[17px]" />
          </Link>

          <div className="inline-flex items-center gap-1 rounded-2xl bg-white/10 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => switchApp('dti')}
              disabled={currentApp === 'dti'}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                currentApp === 'dti'
                  ? 'bg-white text-ink-900 shadow-xs'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-ink-200">
                <img src={dtiLogo} alt="" className="logo h-full w-full object-contain" />
              </span>
              <span>DTI</span>
            </button>

            <button
              type="button"
              onClick={() => switchApp('pop')}
              disabled={currentApp === 'pop'}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                currentApp === 'pop'
                  ? 'bg-white text-ink-900 shadow-xs'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-primary-700">
                <img src={popLogo} alt="" className="logo h-full w-full object-contain" />
              </span>
              <span>POP</span>
            </button>
          </div>
        </div>

        {/* MID — floating preview card */}
        <div className="relative z-10 my-auto px-10">
          <div className="w-full max-w-xs -rotate-2 rounded-2xl border border-white/15 bg-white/10 p-5 shadow-large backdrop-blur-md transition-transform duration-500 hover:rotate-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
                <img
                  src={isPop ? popLogo : dtiLogo}
                  alt=""
                  className="logo h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="h-2.5 w-24 rounded-full bg-white/60" />
                <div className="mt-2 h-2 w-16 rounded-full bg-white/30" />
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <div className="h-2 w-full rounded-full bg-white/20" />
              <div className="h-2 w-5/6 rounded-full bg-white/20" />
              <div className="h-2 w-3/5 rounded-full bg-white/20" />
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5">
              <span className="text-[11px] font-bold text-white/80">
                {isPop ? 'Warranty active' : 'Status: verified'}
              </span>
              <i className="bi bi-check-circle-fill text-sm text-white" />
            </div>
          </div>
        </div>

        {/* BOTTOM — headline + features */}
        <div className="relative z-10 px-10 pb-14">
          <h2 className="max-w-sm text-3xl font-black leading-tight tracking-tight text-white">
            {isPop ? 'Proof of purchase, sorted.' : 'Welcome to DTI.'}
          </h2>

          <p className="mt-3 max-w-xs text-sm leading-6 text-white/70">
            {isPop
              ? 'Track purchases, manage warranties, and keep every receipt where you can find it.'
              : 'Sign in to pick up right where you left off.'}
          </p>

          <ul className="mt-6 space-y-3">
            {(isPop
              ? ['Warranty tracking, automated', 'Receipts, always searchable', 'One login for every purchase']
              : ['Secure, single sign-on access', 'Your dashboard, saved and synced', 'Built for how you already work']
            ).map((line) => (
              <li key={line} className="flex items-center gap-3 text-sm font-semibold text-white/85">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <i className="bi bi-check2 text-xs text-white" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ========================================================
          RIGHT PANEL — form
      ======================================================== */}
      <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-16 xl:px-24">

        {/* Mobile-only top nav */}
        <div className="mb-8 flex items-center justify-center lg:hidden">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-ink-200 bg-white p-1 shadow-xs">
            <Link
              to="/"
              aria-label="Home"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-400 transition-all hover:bg-ink-50 hover:text-ink-800"
            >
              <i className="bi bi-house text-[17px]" />
            </Link>

            <div className="mx-0.5 h-6 w-px bg-ink-200" />

            <button
              type="button"
              onClick={() => switchApp('dti')}
              disabled={currentApp === 'dti'}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                currentApp === 'dti'
                  ? 'bg-ink-50 text-ink-900 shadow-xs'
                  : 'text-ink-400 hover:bg-ink-50 hover:text-ink-700'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-ink-200">
                <img src={dtiLogo} alt="" className="logo h-full w-full object-contain" />
              </span>
              <span className="hidden sm:inline">DTI</span>
            </button>

            <button
              type="button"
              onClick={() => switchApp('pop')}
              disabled={currentApp === 'pop'}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition-all ${
                currentApp === 'pop'
                  ? 'bg-ink-50 text-ink-900 shadow-xs'
                  : 'text-ink-400 hover:bg-ink-50 hover:text-ink-700'
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-primary-600">
                <img src={popLogo} alt="" className="logo h-full w-full object-contain" />
              </span>
              <span className="hidden sm:inline">POP</span>
            </button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm">

          <div className="rounded-[1.75rem] border border-ink-200 bg-white p-6 shadow-large sm:p-8">

          <div className="mb-6 h-1.5 w-16 rounded-full bg-primary-600" />

          <div className="mb-8">
            <h1 className="text-2xl font-black tracking-tight text-ink-900 sm:text-[28px]">
              Sign in to your account
            </h1>
            <p className="mt-2 text-sm leading-6 text-ink-500">
              Enter your details below to continue.
            </p>
          </div>

          {/* Google account notice */}
          {useGoogle && (
            <div className="mb-5 rounded-2xl border border-primary-200 bg-primary-50 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-xs">
                  <i className="bi bi-google text-base" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-ink-900">
                    Continue with Google
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-600">
                    This email is registered with Google. Use Google below to sign in.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && !useGoogle && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-xs">
                <i className="bi bi-exclamation-circle-fill" />
              </div>
              <p className="pt-1 text-sm font-semibold leading-5 text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Google — moved above the form as primary path */}
          <div className="relative mb-5">
            <GoogleLogin
              redirectTo={googleRedirect}
              onSuccess={handleGoogleSuccess}
              lastUsed={lastLoginMethod === 'google'}
            />
          </div>

          <div className="mb-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-ink-200" />
            <span className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
              Or sign in with email
            </span>
            <div className="h-px flex-1 bg-ink-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-bold text-ink-800"
              >
                Email address
              </label>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-400">
                  <i className="bi bi-envelope text-[17px]" />
                </div>

                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                    setUseGoogle(false);
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 py-3.5 pl-11 pr-4 text-sm font-semibold text-ink-900 outline-none transition-all placeholder:text-ink-400 hover:border-ink-300 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-bold text-ink-800"
                >
                  Password
                </label>

                <Link
                  to={`${basename}/forgot-password`}
                  className="text-xs font-bold text-primary-600 transition hover:text-primary-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-400">
                  <i className="bi bi-lock text-[17px]" />
                </div>

                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                    setUseGoogle(false);
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-ink-200 bg-ink-50 py-3.5 pl-11 pr-12 text-sm font-semibold text-ink-900 outline-none transition-all placeholder:text-ink-400 hover:border-ink-300 focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-400 transition hover:text-ink-700 disabled:cursor-not-allowed"
                >
                  <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-lg`} />
                </button>
              </div>
            </div>

            {/* SIGN IN */}
            <div className="relative pt-2">
              <button
                type="submit"
                disabled={loading}
                className="relative flex min-h-[52px] w-full items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-black text-white shadow-primary transition-all hover:-translate-y-0.5 hover:bg-primary-700 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <i className="bi bi-arrow-right ml-2 text-base" />
                  </>
                )}

                {!loading && lastLoginMethod === 'email' && (
                  <span className="absolute -top-3 right-4 z-20 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-ink-200 bg-white px-3 py-1 text-center text-[9px] font-black uppercase leading-none tracking-wide text-ink-500 shadow-xs">
                    Last used
                  </span>
                )}
              </button>
            </div>
          </form>

          {/* REGISTER */}
          <p className="mt-7 text-center text-sm text-ink-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-black text-primary-600 transition hover:text-primary-700 hover:underline"
            >
              Create one
            </Link>
          </p>

          {/* Back to email (kept for parity, though email is already default) */}
          {useGoogle && (
            <button
              type="button"
              onClick={() => {
                setUseGoogle(false);
                setError('');
              }}
              className="mx-auto mt-4 flex items-center gap-2 text-xs font-bold text-ink-500 transition hover:text-ink-800"
            >
              <i className="bi bi-arrow-left" />
              Back to email login
            </button>
          )}
          </div>

          <p className="mt-8 text-center text-[11px] leading-5 text-ink-400">
            By continuing, you agree to our terms and policies.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
