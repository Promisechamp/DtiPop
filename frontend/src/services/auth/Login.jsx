import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Home,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Check,
  Loader2,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { DTI_BASE, POP_BASE } from "@/utils/routeBases";
import GoogleLogin from "./GoogleLogin";

import popLogo from "@/assets/popLogo3.png";
import dtiLogo from "@/assets/dti.png";

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

const detectAppFromPath = () => {
  if (typeof window === "undefined") return "dti";
  const path = window.location.pathname || "";
  if (path === POP_BASE || path.startsWith(`${POP_BASE}/`)) return "pop";
  if (path === DTI_BASE || path.startsWith(`${DTI_BASE}/`)) return "dti";
  return "dti";
};

const getErrorMessage = (error) => {
  if (!error) return "";
  if (typeof error === "string") return error.trim();
  if (typeof error.message === "string" && error.message.trim())
    return error.message.trim();
  if (typeof error.error === "string" && error.error.trim())
    return error.error.trim();
  if (typeof error.details === "string" && error.details.trim())
    return error.details.trim();
  if (typeof error.hint === "string" && error.hint.trim())
    return error.hint.trim();
  return "";
};

/* ---------------------------------------------------------
   Component
--------------------------------------------------------- */

const Login = ({ app }) => {
  const resolvedApp = app || detectAppFromPath();
  const currentApp = resolvedApp === "pop" ? "pop" : "dti";
  const isPop = currentApp === "pop";
  const basename = isPop ? POP_BASE : DTI_BASE;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [useGoogle, setUseGoogle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastLoginMethod, setLastLoginMethod] = useState(null);

  const {
    signIn,
    user,
    isAdmin,
    profileReady,
    loading: authLoading,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const getAppHomeUrl = () => "/";

  /* ---- remember selected app ---- */
  useEffect(() => {
    try {
      localStorage.setItem("selectedApp", currentApp);
    } catch (err) {
      console.warn("Unable to save selected app:", err);
    }
  }, [currentApp]);

  /* ---- remember last login method ---- */
  useEffect(() => {
    try {
      const savedMethod = localStorage.getItem("lastLoginMethod");
      if (savedMethod === "email" || savedMethod === "google") {
        setLastLoginMethod(savedMethod);
      }
    } catch (err) {
      console.warn("Unable to read last login method:", err);
    }
  }, []);

  const rememberLoginMethod = (method) => {
    try {
      localStorage.setItem("lastLoginMethod", method);
      setLastLoginMethod(method);
    } catch (err) {
      console.warn("Unable to save last login method:", err);
    }
  };

  /* ---- app switching ---- */
  const switchApp = (targetApp) => {
    if (targetApp !== "pop" && targetApp !== "dti") return;
    if (targetApp === currentApp) return;

    const targetBase = targetApp === "pop" ? POP_BASE : DTI_BASE;
    const params = new URLSearchParams(location.search);

    // Preserve only safe, app-independent context when switching apps.
    const applyModal = params.get("show-apply-modal");
    if (targetApp === "dti" && applyModal) {
      params.set("show-apply-modal", applyModal);
    } else {
      params.delete("show-apply-modal");
    }

    // Never carry an arbitrary redirect across apps.
    params.delete("redirect");

    const query = params.toString();
    navigate(`${targetBase}/login${query ? `?${query}` : ""}`);
  };

  /* ---- safe redirect resolver ---- */
  const getSafeRedirect = () => {
    const fallback = "/dashboard";
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get("redirect");
    const from = location.state?.from;

    let pathname;
    let search = "";
    let hash = "";

    const parseLocalUrl = (value) => {
      const parsed = new URL(value, window.location.origin);
      if (parsed.origin !== window.location.origin) return null;
      return {
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
      };
    };

    if (typeof from === "string") {
      const parsed = parseLocalUrl(from);
      if (!parsed) return fallback;
      ({ pathname, search, hash } = parsed);
    } else if (from && typeof from === "object") {
      pathname = from.pathname;
      search = from.search || "";
      hash = from.hash || "";
    } else if (redirectParam) {
      const parsed = parseLocalUrl(redirectParam);
      if (!parsed) return fallback;
      ({ pathname, search, hash } = parsed);
    } else {
      return fallback;
    }

    if (
      typeof pathname !== "string" ||
      !pathname.startsWith("/") ||
      pathname.startsWith("//") ||
      pathname.includes("\\")
    ) {
      return fallback;
    }

    if (pathname.startsWith("/app/")) {
      if (pathname === basename || pathname.startsWith(`${basename}/`)) {
        pathname = pathname.slice(basename.length) || "/";
      } else {
        return fallback;
      }
    }

    if (
      isPop &&
      (pathname === "/admin" || pathname.startsWith("/admin/"))
    ) {
      return fallback;
    }

    if (
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/auth/callback" ||
      pathname === "/forgot-password"
    ) {
      return fallback;
    }

    if (typeof search !== "string" || (search && !search.startsWith("?"))) {
      search = "";
    }
    if (typeof hash !== "string" || (hash && !hash.startsWith("#"))) {
      hash = "";
    }

    return `${pathname}${search}${hash}`;
  };

  const googleRedirect = `${window.location.origin}${basename}/auth/callback`;

  /* ---- already signed in? ---- */
  useEffect(() => {
    if (authLoading || !user || !profileReady) return;

    const destination =
      currentApp === "dti" && isAdmin ? "/admin" : getSafeRedirect();

    const params = new URLSearchParams(location.search);
    const applyModal = params.get("show-apply-modal");

    let finalDestination = `${basename}${destination}`;

    if (currentApp === "dti" && applyModal) {
      const destinationUrl = new URL(destination, window.location.origin);
      destinationUrl.searchParams.set("show-apply-modal", applyModal);
      finalDestination =
        `${basename}${destinationUrl.pathname}` +
        destinationUrl.search +
        destinationUrl.hash;
    }

    const currentUrl = location.pathname + location.search + location.hash;
    if (currentUrl !== finalDestination) {
      navigate(finalDestination, { replace: true });
    }
  }, [
    authLoading,
    user,
    profileReady,
    isAdmin,
    currentApp,
    basename,
    location.pathname,
    location.search,
    location.hash,
    navigate,
  ]);

  /* ---- change handler (clears inline errors) ---- */
  const handleChange = (field) => (e) => {
    const value = e.target.value;

    if (field === "email") setEmail(value);
    else if (field === "password") setPassword(value);

    // Clear any server-level error + Google prompt on edit
    setServerError("");
    setUseGoogle(false);

    // Clear the field error
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  /* ---- client-side field validation ---- */
  const validateForm = () => {
    const next = {};
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      next.email = "Please enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      next.email = "Please enter a valid email address.";
    }

    if (!password) {
      next.password = "Please enter your password.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /* ---- submit ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    setServerError("");
    setUseGoogle(false);

    if (!validateForm()) {
      toast.error("Please fix the errors before continuing.");
      return;
    }

    const cleanEmail = email.trim();
    setLoading(true);

    try {
      const result = await signIn(cleanEmail, password);

      const signInError =
        result?.error || (result?.success === false ? result : null);

      if (signInError) {
        const message =
          getErrorMessage(signInError) ||
          getErrorMessage(result) ||
          "Unable to sign in. Please try again.";

        const errorCode =
          signInError?.code ||
          signInError?.errorCode ||
          result?.code ||
          result?.errorCode;

        const googleRequired =
          signInError?.useGoogle === true ||
          result?.useGoogle === true ||
          errorCode === "GOOGLE_ACCOUNT" ||
          errorCode === "GOOGLE_SIGN_IN_REQUIRED";

        const normalized = message.toLowerCase();

        // Map well-known auth failures to the relevant field so users see
        // the message right where the mistake happened.
        if (
          normalized.includes("invalid login") ||
          normalized.includes("invalid credentials") ||
          normalized.includes("wrong password") ||
          normalized.includes("incorrect password")
        ) {
          setErrors((prev) => ({ ...prev, password: message }));
        } else if (
          normalized.includes("email not") ||
          normalized.includes("no user") ||
          normalized.includes("user not found") ||
          normalized.includes("account not found")
        ) {
          setErrors((prev) => ({ ...prev, email: message }));
        } else {
          // Everything else (Google required, network, etc.) → banner
          setServerError(message);
        }

        setUseGoogle(googleRequired);
        toast.error(message);
        return;
      }

      rememberLoginMethod("email");
      toast.success("Welcome back! 🎉");
    } catch (err) {
      console.error("Sign-in error:", err);

      const message =
        getErrorMessage(err) ||
        "An unexpected error occurred. Please try again.";

      const errorCode = err?.code || err?.errorCode;
      const googleRequired =
        err?.useGoogle === true ||
        errorCode === "GOOGLE_ACCOUNT" ||
        errorCode === "GOOGLE_SIGN_IN_REQUIRED";

      setServerError(message);
      setUseGoogle(googleRequired);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = () => {
    rememberLoginMethod("google");
    setServerError("");
    setErrors({});
    setUseGoogle(false);
  };

  /* ---- input styling (mirrors Register) ---- */
  const inputClasses = (field) =>
    `w-full rounded-xl border bg-white py-2.5 pl-11 text-sm font-medium text-ink-900 outline-none transition placeholder:text-ink-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
      errors[field]
        ? "border-danger-300 focus:border-danger-400 focus:ring-danger-200"
        : "border-ink-200 focus:border-primary-400 focus:ring-primary-200"
    }`;

  if (authLoading) return null;
  if (user && !profileReady) return null;

  return (
    <div className="min-h-screen bg-ink-50 lg:flex">
      {/* LEFT PANEL */}
      <div className="relative hidden overflow-hidden bg-primary-600 lg:flex lg:w-[45%] lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(currentColor 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            color: "#ffffff",
          }}
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary-500/40 blur-3xl" />
          <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-primary-700/60 blur-3xl" />
        </div>

        {/* DESKTOP NAVIGATION */}
        <div className="relative z-10 flex items-center justify-between px-10 pt-10">
          <Link
            to={getAppHomeUrl()}
            aria-label={`${isPop ? "POP" : "DTI"} home`}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Home size={17} />
          </Link>

          <div className="inline-flex items-center gap-1 rounded-2xl bg-white/10 p-1 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => switchApp("pop")}
              aria-current={isPop ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                isPop
                  ? "bg-white text-ink-950 shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-primary-700">
                <img
                  src={popLogo}
                  alt=""
                  className="logo h-full w-full object-contain"
                />
              </span>
              <span>POP</span>
            </button>

            <button
              type="button"
              onClick={() => switchApp("dti")}
              aria-current={!isPop ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                !isPop
                  ? "bg-white text-ink-950 shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-ink-200">
                <img
                  src={dtiLogo}
                  alt=""
                  className="logo h-full w-full object-contain"
                />
              </span>
              <span>DTI</span>
            </button>
          </div>
        </div>

        <div className="relative z-10 my-auto px-10">
          <div className="w-full max-w-xs -rotate-2 rounded-[26px] border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur-md transition-transform duration-500 hover:rotate-0">
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
                {isPop ? "Warranty active" : "Status: verified"}
              </span>
              <CheckCircle2
                size={15}
                fill="currentColor"
                className="text-white"
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 px-10 pb-14">
          <h2 className="max-w-sm text-3xl font-black leading-tight tracking-tight text-white">
            {isPop ? "Proof of purchase, sorted." : "Welcome to DTI."}
          </h2>

          <p className="mt-3 max-w-xs text-sm font-medium leading-6 text-white/70">
            {isPop
              ? "Track purchases, manage warranties, and keep every receipt where you can find it."
              : "Sign in to pick up right where you left off."}
          </p>

          <ul className="mt-6 space-y-3">
            {(isPop
              ? [
                  "Warranty tracking, automated",
                  "Receipts, always searchable",
                  "One login for every purchase",
                ]
              : [
                  "Secure, single sign-on access",
                  "Your dashboard, saved and synced",
                  "Built for how you already work",
                ]
            ).map((line) => (
              <li
                key={line}
                className="flex items-center gap-3 text-sm font-semibold text-white/85"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Check size={11} strokeWidth={3} className="text-white" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:px-16 xl:px-24">
        {/* MOBILE NAVIGATION */}
        <div className="mb-8 flex items-center justify-center lg:hidden">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-ink-200 bg-white p-1 shadow-sm">
            <Link
              to={getAppHomeUrl()}
              aria-label={`${isPop ? "POP" : "DTI"} home`}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-800"
            >
              <Home size={17} />
            </Link>

            <div className="mx-0.5 h-6 w-px bg-ink-200" />

            <button
              type="button"
              onClick={() => switchApp("pop")}
              aria-current={isPop ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                isPop
                  ? "bg-ink-50 border-2 border-primary-500 text-ink-950 shadow-sm"
                  : "text-ink-400 hover:bg-ink-50 hover:text-ink-700"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-primary-600">
                <img
                  src={popLogo}
                  alt=""
                  className="logo h-full w-full object-contain"
                />
              </span>
              <span className="hidden sm:inline">POP</span>
            </button>

            <button
              type="button"
              onClick={() => switchApp("dti")}
              aria-current={!isPop ? "page" : undefined}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                !isPop
                  ? "bg-ink-50 border-2 border-primary-500 text-ink-950 shadow-sm"
                  : "text-ink-400 hover:bg-ink-50 hover:text-ink-700"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-ink-200">
                <img
                  src={dtiLogo}
                  alt=""
                  className="logo h-full w-full object-contain"
                />
              </span>
              <span className="hidden sm:inline">DTI</span>
            </button>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-md sm:p-8">
            <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-[28px]">
              Sign in to {isPop ? "POP" : "DTI"}
            </h1>

            <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
              {isPop
                ? "Enter your details to access your POP account."
                : "Enter your details to access your DTI account."}
            </p>

            {/* Google-required notice (server-level, tied to sign-in flow) */}
            {useGoogle && (
              <div className="mt-6 rounded-2xl border border-primary-100 bg-primary-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
                    <i className="bi bi-google text-base" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-ink-950">
                      Continue with Google
                    </p>
                    <p className="mt-1 text-xs font-medium leading-5 text-ink-600">
                      {serverError ||
                        "This email is registered with Google. Use Google below to sign in."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Server-level error banner (never for field errors) */}
            {serverError && !useGoogle && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-6 flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
                  <AlertCircle size={16} />
                </div>
                <p className="pt-1 text-sm font-bold leading-5 text-danger-700">
                  {serverError}
                </p>
              </div>
            )}

            <div className="mt-6">
              <GoogleLogin
                redirectTo={googleRedirect}
                onSuccess={handleGoogleSuccess}
                lastUsed={lastLoginMethod === "google"}
              />
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-ink-100" />
              <span className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
                Or sign in with email
              </span>
              <div className="h-px flex-1 bg-ink-100" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-sm font-extrabold text-ink-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-400">
                    <Mail size={16} />
                  </div>

                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={handleChange("email")}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={
                      errors.email ? "login-email-error" : undefined
                    }
                    className={`${inputClasses("email")} pr-4`}
                  />
                </div>

                {errors.email && (
                  <p
                    id="login-email-error"
                    className="mt-1.5 flex items-center gap-1 text-xs font-bold text-danger-700"
                  >
                    <AlertCircle size={12} />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-extrabold text-ink-700"
                  >
                    Password
                  </label>

                  <Link
                    to={`${basename}/forgot-password`}
                    className="text-xs font-extrabold text-primary-600 transition hover:text-primary-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-400">
                    <Lock size={16} />
                  </div>

                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handleChange("password")}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "login-password-error" : undefined
                    }
                    className={`${inputClasses("password")} pr-12`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-400 transition hover:text-ink-700 disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p
                    id="login-password-error"
                    className="mt-1.5 flex items-center gap-1 text-xs font-bold text-danger-700"
                  >
                    <AlertCircle size={12} />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="relative pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight size={16} />
                    </>
                  )}

                  {!loading && lastLoginMethod === "email" && (
                    <span className="absolute -top-3 right-4 z-20 inline-flex items-center justify-center whitespace-nowrap rounded-full border border-ink-200 bg-white px-3 py-1 text-center text-[9px] font-black uppercase leading-none tracking-wide text-ink-500 shadow-sm">
                      Last used
                    </span>
                  )}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm font-medium text-ink-500">
              Don&apos;t have an account?{" "}
              <Link
                to={`${basename}/register`}
                className="font-extrabold text-primary-600 transition hover:text-primary-700 hover:underline"
              >
                Create one
              </Link>
            </p>

            {useGoogle && (
              <button
                type="button"
                onClick={() => {
                  setUseGoogle(false);
                  setServerError("");
                  setErrors({});
                }}
                className="mx-auto mt-4 flex items-center gap-2 text-xs font-extrabold text-ink-500 transition hover:text-ink-800"
              >
                <ArrowLeft size={13} />
                Back to email login
              </button>
            )}
          </div>

          <p className="mt-8 text-center text-[11px] font-medium leading-5 text-ink-400">
            By continuing, you agree to our{" "}
            <Link className="text-primary-600 underline" to="#">
              terms
            </Link>{" "}
            and{" "}
            <Link className="text-primary-600 underline" to="#">
              policies
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;