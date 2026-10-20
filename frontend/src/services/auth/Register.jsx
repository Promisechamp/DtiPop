import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Home,
  AlertCircle,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Check,
  Loader2,
  ShieldCheck,
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

const PasswordRule = ({ valid, text }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-bold ${
      valid ? "text-emerald-600" : "text-ink-400"
    }`}
  >
    <CheckCircle2 size={11} />
    {text}
  </span>
);

/* ---------------------------------------------------------
   Component
--------------------------------------------------------- */

const Register = ({ app }) => {
  const resolvedApp = app || detectAppFromPath();
  const currentApp = resolvedApp === "pop" ? "pop" : "dti";
  const isPop = currentApp === "pop";
  const basename = isPop ? POP_BASE : DTI_BASE;

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    agree_to_terms: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signUp, user, profileReady, loading: authLoading } = useAuth();
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

  /* ---- already signed in? bounce to dashboard ---- */
  useEffect(() => {
    if (authLoading || !user || !profileReady) return;
    navigate(`${basename}/dashboard`, { replace: true });
  }, [authLoading, user, profileReady, basename, navigate]);

  const switchApp = (targetApp) => {
    if (targetApp !== "pop" && targetApp !== "dti") return;
    if (targetApp === currentApp) return;
    const targetBase = targetApp === "pop" ? POP_BASE : DTI_BASE;
    navigate(`${targetBase}/register`);
  };

  /* ---- password strength ---- */
  const passwordStrength = useMemo(() => {
    const password = formData.password;
    if (!password) return { score: 0, label: "" };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: "Weak" };
    if (score <= 3) return { score, label: "Good" };
    return { score, label: "Strong" };
  }, [formData.password]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setServerError("");
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (name === "password" || name === "confirmPassword") {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const cleanEmail = formData.email.trim();

    if (!formData.fullName.trim())
      newErrors.fullName = "Full name is required.";
    if (!cleanEmail) newErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))
      newErrors.email = "Please enter a valid email address.";
    if (!formData.password) newErrors.password = "Password is required.";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters.";
    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Please confirm your password.";
    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match.";
    if (!formData.agree_to_terms)
      newErrors.agree_to_terms =
        "You must agree to the Terms of Service and Privacy Policy.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getSafeDestination = (destination, fallback) => {
    if (typeof destination !== "string" || !destination) return fallback;
    try {
      const parsed = new URL(destination, window.location.origin);
      if (parsed.origin !== window.location.origin) return fallback;
      const pathname = parsed.pathname;
      if (!pathname.startsWith("/") || pathname.startsWith("//"))
        return fallback;
      if (
        pathname.startsWith("/app/") &&
        pathname !== basename &&
        !pathname.startsWith(`${basename}/`)
      ) {
        return fallback;
      }
      return `${pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return fallback;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validateForm()) {
      toast.error("Please fix the errors before continuing.");
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = formData.email.trim();
      const result = await signUp(
        cleanEmail,
        formData.password,
        formData.fullName.trim(),
        {
          phone: formData.phone.trim(),
          agree_to_terms: formData.agree_to_terms,
        }
      );

      const registrationError =
        result?.error || (result?.success === false ? result : null);

      if (registrationError) {
        const message =
          getErrorMessage(registrationError) ||
          getErrorMessage(result) ||
          "Registration failed. Please try again.";

        console.error("Registration error:", registrationError);

        const normalized = message.toLowerCase();
        if (
          normalized.includes("already registered") ||
          normalized.includes("already exists") ||
          normalized.includes("duplicate key") ||
          normalized.includes("user already registered")
        ) {
          setErrors((prev) => ({ ...prev, email: message }));
        } else {
          setServerError(message);
        }
        toast.error(message);
        return;
      }

      if (result?.success === false) {
        const message =
          getErrorMessage(result) ||
          "Registration failed. Please try again.";
        setServerError(message);
        toast.error(message);
        return;
      }

      toast.success("Registration successful! 🎉");

      const data = result?.data ?? result;
      const requiresEmailVerification =
        data?.requiresEmailVerification === true;

      if (requiresEmailVerification) {
        navigate(`${basename}/verify-email-sent`, {
          replace: true,
          state: { email: cleanEmail, app: currentApp },
        });
      } else {
        const requestedDestination = new URLSearchParams(
          location.search
        ).get("redirect");
        const destination = getSafeDestination(
          requestedDestination,
          `${basename}/dashboard`
        );
        navigate(destination, { replace: true });
      }
    } catch (err) {
      console.error("Registration error:", err);
      const message =
        getErrorMessage(err) ||
        "An unexpected error occurred during registration. Please try again.";
      setServerError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = (field) =>
    `w-full rounded-xl border bg-white py-2.5 pl-11 pr-4 text-sm font-medium text-ink-900 outline-none transition placeholder:text-ink-400 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
      errors[field]
        ? "border-danger-300 focus:border-danger-400 focus:ring-danger-200"
        : "border-ink-200 focus:border-primary-400 focus:ring-primary-200"
    }`;

  const googleRedirect = `${window.location.origin}${basename}/auth/callback`;

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
              : "Create your account to pick up right where you left off."}
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
              Create your {isPop ? "POP" : "DTI"} account
            </h1>

            <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
              {isPop
                ? "Set up your POP account to start tracking purchases."
                : "Set up your DTI account to get started."}
            </p>

            {/* Server-level error banner (only for non-field errors) */}
            {serverError && (
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

            {/* Google first, matches login */}
            <div className="mt-6">
              <GoogleLogin
                redirectTo={googleRedirect}
                onSuccess={() => {
                  setServerError("");
                  setErrors({});
                }}
              />
            </div>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-ink-100" />
              <span className="whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
                Or sign up with email
              </span>
              <div className="h-px flex-1 bg-ink-100" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <div>
                <label
                  htmlFor="reg-full-name"
                  className="mb-1.5 block text-sm font-extrabold text-ink-700"
                >
                  Full name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-400">
                    <User size={16} />
                  </div>
                  <input
                    id="reg-full-name"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="John Doe"
                    autoComplete="name"
                    className={inputClasses("fullName")}
                  />
                </div>
                {errors.fullName && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-danger-700">
                    <AlertCircle size={12} />
                    {errors.fullName}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="mb-1.5 block text-sm font-extrabold text-ink-700"
                >
                  Email address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-400">
                    <Mail size={16} />
                  </div>
                  <input
                    id="reg-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={inputClasses("email")}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-danger-700">
                    <AlertCircle size={12} />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="mb-1.5 block text-sm font-extrabold text-ink-700"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-400">
                    <Lock size={16} />
                  </div>
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Create a password"
                    autoComplete="new-password"
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
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {formData.password && (
                  <div className="mt-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-ink-500">
                        Password strength
                      </span>
                      <span
                        className={`text-[11px] font-bold ${
                          passwordStrength.label === "Strong"
                            ? "text-emerald-600"
                            : passwordStrength.label === "Good"
                            ? "text-amber-600"
                            : "text-danger-600"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((bar) => (
                        <div
                          key={bar}
                          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                            bar <= passwordStrength.score
                              ? "bg-primary-600"
                              : "bg-ink-100"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      <PasswordRule
                        valid={formData.password.length >= 6}
                        text="6+ characters"
                      />
                      <PasswordRule
                        valid={/[A-Z]/.test(formData.password)}
                        text="Uppercase"
                      />
                      <PasswordRule
                        valid={/[0-9]/.test(formData.password)}
                        text="Number"
                      />
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-danger-700">
                    <AlertCircle size={12} />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="reg-confirm-password"
                  className="mb-1.5 block text-sm font-extrabold text-ink-700"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-400">
                    <ShieldCheck size={16} />
                  </div>
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    className={`${inputClasses("confirmPassword")} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    disabled={loading}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-400 transition hover:text-ink-700 disabled:cursor-not-allowed"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {formData.confirmPassword && (
                  <div
                    className={`mt-2 flex items-center gap-1 text-xs font-bold ${
                      formData.password === formData.confirmPassword
                        ? "text-emerald-600"
                        : "text-danger-600"
                    }`}
                  >
                    {formData.password === formData.confirmPassword ? (
                      <CheckCircle2 size={12} />
                    ) : (
                      <AlertCircle size={12} />
                    )}
                    {formData.password === formData.confirmPassword
                      ? "Passwords match"
                      : "Passwords do not match"}
                  </div>
                )}

                {errors.confirmPassword && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-danger-700">
                    <AlertCircle size={12} />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div
                className={`rounded-2xl border p-4 transition-all duration-200 ${
                  errors.agree_to_terms
                    ? "border-danger-200 bg-danger-50"
                    : formData.agree_to_terms
                    ? "border-primary-200 bg-primary-50/40"
                    : "border-ink-200 bg-ink-50/30"
                }`}
              >
                <label className="flex cursor-pointer select-none items-start gap-3">
                  <input
                    type="checkbox"
                    name="agree_to_terms"
                    checked={formData.agree_to_terms}
                    onChange={handleChange}
                    disabled={loading}
                    className="mt-1 h-4 w-4 accent-primary-600"
                  />
                  <span className="flex-1 text-sm font-medium leading-5 text-ink-500">
                    I agree to the{" "}
                    <Link
                      to={`${basename}/terms`}
                      className="font-extrabold text-primary-600 transition hover:text-primary-700 hover:underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to={`${basename}/privacy`}
                      className="font-extrabold text-primary-600 transition hover:text-primary-700 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.agree_to_terms && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-bold text-danger-700">
                    <AlertCircle size={12} />
                    {errors.agree_to_terms}
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
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create account</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm font-medium text-ink-500">
              Already have an account?{" "}
              <Link
                to={`${basename}/login`}
                className="font-extrabold text-primary-600 transition hover:text-primary-700 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-8 text-center text-[11px] font-medium leading-5 text-ink-400">
            By creating an account, you agree to our{" "}
            <Link className="text-primary-600 underline" to={`${basename}/terms`}>
              terms
            </Link>{" "}
            and{" "}
            <Link className="text-primary-600 underline" to={`${basename}/privacy`}>
              policies
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;