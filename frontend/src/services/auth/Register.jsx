import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import GoogleLogin from './GoogleLogin';

const Register = ({ app = 'dti' }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    agree_to_terms: true,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  /* -------------------------------------------------------
     Password strength
  ------------------------------------------------------- */

  const passwordStrength = useMemo(() => {
    const password = formData.password;

    if (!password) {
      return {
        score: 0,
        label: '',
      };
    }

    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return {
        score,
        label: 'Weak',
      };
    }

    if (score <= 3) {
      return {
        score,
        label: 'Good',
      };
    }

    return {
      score,
      label: 'Strong',
    };
  }, [formData.password]);

  /* -------------------------------------------------------
     Input change
  ------------------------------------------------------- */

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  /* -------------------------------------------------------
     Validation
  ------------------------------------------------------- */

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agree_to_terms) {
      newErrors.agree_to_terms =
        'You must agree to the Terms of Service';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /* -------------------------------------------------------
     Submit
  ------------------------------------------------------- */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before continuing');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        {
          phone: formData.phone,
          agree_to_terms: formData.agree_to_terms,
        }
      );

      if (error) {
        console.error('❌ Registration error:', error);

        if (error.includes('already registered')) {
          setErrors({
            email:
              'This email is already registered. Please sign in instead.',
          });

          toast.error('Account already exists');
        } else {
          toast.error(error);
        }

        setLoading(false);
        return;
      }

      toast.success('Registration successful! 🎉');

      if (data?.requiresEmailVerification) {
        navigate('/verify-email-sent', {
          state: {
            email: formData.email,
          },
        });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------
     Reusable input classes
  ------------------------------------------------------- */

  const inputClasses = (field) => `
    w-full
    h-12
    rounded-xl
    border
    bg-white
    px-4
    text-sm
    text-ink-900
    placeholder:text-ink-400
    outline-none
    transition-all
    duration-200
    focus:ring-4
    focus:ring-primary-500/10
    focus:border-primary-500
    hover:border-ink-300
    ${
      errors[field]
        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10'
        : 'border-ink-200'
    }
  `;

  const iconClasses = `
    absolute
    left-4
    top-1/2
    -translate-y-1/2
    text-ink-400
    text-[15px]
    pointer-events-none
  `;

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <div className="w-full max-w-lg mx-auto">

        {/* -------------------------------------------------
            Brand / Header
        ------------------------------------------------- */}

        <div className="text-center mb-8">

          <div
            className="
              inline-flex
              items-center
              justify-center
              w-14
              h-14
              rounded-2xl
              bg-gradient-to-br
              from-primary-500
              to-brand-600
              text-white
              shadow-lg
              shadow-primary-500/20
              mb-5
            "
          >
            <i className="bi bi-person-plus-fill text-2xl" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-ink-950">
            Create your account
          </h1>

          <p className="mt-2 text-sm sm:text-base text-ink-500">
            Join the community and start making a difference.
          </p>
        </div>

        {/* -------------------------------------------------
            Card
        ------------------------------------------------- */}

        <div
          className="
            bg-white
            border
            border-ink-100
            rounded-3xl
            shadow-xl
            shadow-ink-900/[0.04]
            p-5
            sm:p-8
          "
        >

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* -------------------------------------------------
                Full Name
            ------------------------------------------------- */}

            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-bold text-ink-700 mb-2"
              >
                Full name
                <span className="text-rose-500 ml-1">*</span>
              </label>

              <div className="relative">
                <i className={`bi bi-person ${iconClasses}`} />

                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="John Doe"
                  autoComplete="name"
                  className={`${inputClasses('fullName')} pl-11`}
                />
              </div>

              {errors.fullName && (
                <p className="mt-1.5 text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* -------------------------------------------------
                Email
            ------------------------------------------------- */}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-ink-700 mb-2"
              >
                Email address
                <span className="text-rose-500 ml-1">*</span>
              </label>

              <div className="relative">
                <i className={`bi bi-envelope ${iconClasses}`} />

                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={`${inputClasses('email')} pl-11`}
                />
              </div>

              {errors.email && (
                <p className="mt-1.5 text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* -------------------------------------------------
                Password
            ------------------------------------------------- */}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-ink-700 mb-2"
              >
                Password
                <span className="text-rose-500 ml-1">*</span>
              </label>

              <div className="relative">
                <i className={`bi bi-lock ${iconClasses}`} />

                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  className={`${inputClasses('password')} pl-11 pr-12`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    w-9
                    h-9
                    rounded-lg
                    flex
                    items-center
                    justify-center
                    text-ink-400
                    hover:text-primary-600
                    hover:bg-primary-50
                    transition
                  "
                >
                  <i
                    className={`bi ${
                      showPassword
                        ? 'bi-eye-slash'
                        : 'bi-eye'
                    } text-base`}
                  />
                </button>
              </div>

              {/* Password strength */}
              {formData.password && (
                <div className="mt-3">

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-ink-500">
                      Password strength
                    </span>

                    <span
                      className={`text-[11px] font-bold ${
                        passwordStrength.label === 'Strong'
                          ? 'text-emerald-600'
                          : passwordStrength.label === 'Good'
                            ? 'text-amber-600'
                            : 'text-rose-500'
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>

                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <div
                        key={bar}
                        className={`
                          h-1.5
                          flex-1
                          rounded-full
                          transition-all
                          duration-300
                          ${
                            bar <= passwordStrength.score
                              ? 'bg-gradient-to-r from-primary-500 to-brand-600'
                              : 'bg-ink-100'
                          }
                        `}
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
                <p className="mt-1.5 text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* -------------------------------------------------
                Confirm Password
            ------------------------------------------------- */}

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-bold text-ink-700 mb-2"
              >
                Confirm password
                <span className="text-rose-500 ml-1">*</span>
              </label>

              <div className="relative">
                <i className={`bi bi-shield-lock ${iconClasses}`} />

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? 'text'
                      : 'password'
                  }
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  className={`${inputClasses(
                    'confirmPassword'
                  )} pl-11 pr-12`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((prev) => !prev)
                  }
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    w-9
                    h-9
                    rounded-lg
                    flex
                    items-center
                    justify-center
                    text-ink-400
                    hover:text-primary-600
                    hover:bg-primary-50
                    transition
                  "
                >
                  <i
                    className={`bi ${
                      showConfirmPassword
                        ? 'bi-eye-slash'
                        : 'bi-eye'
                    } text-base`}
                  />
                </button>
              </div>

              {/* Matching indicator */}
              {formData.confirmPassword && (
                <div
                  className={`mt-2 text-xs font-semibold flex items-center gap-1 ${
                    formData.password ===
                    formData.confirmPassword
                      ? 'text-emerald-600'
                      : 'text-rose-500'
                  }`}
                >
                  <i
                    className={`bi ${
                      formData.password ===
                      formData.confirmPassword
                        ? 'bi-check-circle-fill'
                        : 'bi-x-circle-fill'
                    }`}
                  />

                  {formData.password ===
                  formData.confirmPassword
                    ? 'Passwords match'
                    : 'Passwords do not match'}
                </div>
              )}

              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* -------------------------------------------------
                Terms
            ------------------------------------------------- */}

            <div
              className={`
                rounded-2xl
                border
                p-4
                transition-all
                duration-200
                ${
                  errors.agree_to_terms
                    ? 'border-danger-300 bg-danger-500/40 text-white'
                    : formData.agree_to_terms
                      ? 'border-primary-200 bg-primary-50/40'
                      : 'border-ink-200 bg-ink-50/30'
                }
              `}
            >
              <label className="flex items-start gap-3 cursor-pointer select-none">

                <input
                  type="checkbox"
                  name="agree_to_terms"
                  checked={formData.agree_to_terms}
                  onChange={handleChange}
                  disabled={loading}
                  className="sr-only"
                />

                {/* Custom checkbox */}
                <span
                  className={`
                    flex-shrink-0
                    mt-0.5
                    w-5
                    h-5
                    rounded-md
                    border-2
                    flex
                    items-center
                    justify-center
                    transition-all
                    duration-200
                    ${
                      formData.agree_to_terms
                        ? 'border-primary-500 bg-gradient-to-br from-primary-500 to-brand-600 shadow-sm'
                        : 'border-ink-300 bg-white'
                    }
                  `}
                >
                  <i
                    className={`
                      bi bi-check2
                      text-white
                      text-sm
                      font-bold
                      transition-all
                      duration-200
                      ${
                        formData.agree_to_terms
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 scale-50'
                      }
                    `}
                  />
                </span>

                <span className="flex-1 text-sm leading-5 text-ink-500">
                  I agree to the{' '}
                  <Link
                    to="/terms"
                    onClick={(e) => e.stopPropagation()}
                    className="font-extrabold text-primary-600 hover:text-primary-700 transition"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    to="/privacy"
                    onClick={(e) => e.stopPropagation()}
                    className="font-extrabold text-primary-600 hover:text-primary-700 transition"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              {errors.agree_to_terms && (
                <p className="mt-2 text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle" />
                  {errors.agree_to_terms}
                </p>
              )}
            </div>

            {/* -------------------------------------------------
                Create Account
            ------------------------------------------------- */}

            <button
              type="submit"
              disabled={loading}
              className="
                w-full
                h-12
                rounded-xl
                bg-gradient-to-r
                from-primary-500
                to-brand-600
                hover:from-primary-600
                hover:to-brand-700
                text-white
                font-extrabold
                text-sm
                shadow-lg
                shadow-primary-500/20
                hover:shadow-xl
                hover:shadow-primary-500/25
                active:scale-[0.99]
                transition-all
                duration-200
                flex
                items-center
                justify-center
                gap-2
                disabled:opacity-60
                disabled:cursor-not-allowed
              "
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <i className="bi bi-arrow-right text-base" />
                </>
              )}
            </button>
          </form>

          {/* -------------------------------------------------
              Divider
          ------------------------------------------------- */}

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink-100" />
            </div>

            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-xs font-bold uppercase tracking-wider text-ink-400">
                Or continue with
              </span>
            </div>
          </div>

          {/* -------------------------------------------------
              Google
          ------------------------------------------------- */}

          <GoogleLogin
            redirectTo={
              app === 'pop'
                ? `${window.location.origin}/app/pop/auth/callback`
                : `${window.location.origin}/app/dti/auth/callback`
            }
          />

          {/* -------------------------------------------------
              Login
          ------------------------------------------------- */}

          <p className="text-center text-sm text-ink-500 mt-6">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-extrabold text-primary-600 hover:text-primary-700 transition"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* -------------------------------------------------
            Bottom note
        ------------------------------------------------- */}

        <p className="text-center text-[11px] text-ink-400 mt-6 px-6">
          By creating an account, you agree to our community
          guidelines and policies.
        </p>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------
   Password rule component
--------------------------------------------------------- */

const PasswordRule = ({ valid, text }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
        valid ? 'text-emerald-600' : 'text-ink-400'
      }`}
    >
      <i
        className={`bi ${
          valid ? 'bi-check-circle-fill' : 'bi-circle'
        }`}
      />
      {text}
    </span>
  );
};

export default Register;