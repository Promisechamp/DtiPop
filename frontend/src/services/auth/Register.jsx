import React, { useState } from 'react';
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
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email) {
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
      newErrors.agree_to_terms = 'You must agree to the Terms of Service';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
          setErrors({ email: 'This email is already registered. Please login instead.' });
          toast.error('Account already exists');
        } else {
          toast.error(error);
        }
        setLoading(false);
        return;
      }

      toast.success('Registration successful! 🎉');
      
      if (data?.requiresEmailVerification) {
        navigate('/verify-email-sent', { state: { email: formData.email } });
      } else {
        // App-aware redirect
        navigate(app === 'pop' ? '/dashboard' : '/dashboard');
      }

    } catch (err) {
      console.error('❌ Registration error:', err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 mt-10 bg-ink-50/30">
      <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6 md:p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold mt-4 text-ink-900">Create Your Account</h2>
          <p className="text-ink-600 text-sm font-medium">Join the giving community and make a difference</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-bold text-ink-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <i className="bi bi-person absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"></i>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10 ${
                  errors.fullName ? 'border-rose-500' : 'border-ink-200'
                }`}
                placeholder="John Doe"
                disabled={loading}
              />
            </div>
            {errors.fullName && (
              <p className="text-rose-500 text-xs font-medium mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-ink-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <i className="bi bi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"></i>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10 ${
                  errors.email ? 'border-rose-500' : 'border-ink-200'
                }`}
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>
            {errors.email && (
              <p className="text-rose-500 text-xs font-medium mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-ink-700 mb-1">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <i className="bi bi-lock absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"></i>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10 ${
                  errors.password ? 'border-rose-500' : 'border-ink-200'
                }`}
                placeholder="Min. 6 characters"
                disabled={loading}
              />
            </div>
            {errors.password && (
              <p className="text-rose-500 text-xs font-medium mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-bold text-ink-700 mb-1">
              Confirm Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <i className="bi bi-shield-lock absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"></i>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10 ${
                  errors.confirmPassword ? 'border-rose-500' : 'border-ink-200'
                }`}
                placeholder="Confirm your password"
                disabled={loading}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-rose-500 text-xs font-medium mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          

          {/* Terms */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              name="agree_to_terms"
              checked={formData.agree_to_terms}
              onChange={handleChange}
              className={`w-5 h-5 text-primary-600 rounded border-ink-300 focus:ring-primary-500 mt-0.5 ${
                errors.agree_to_terms ? 'border-rose-500' : ''
              }`}
              disabled={loading}
            />
            <div>
              <label className="text-sm font-bold text-ink-700 cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </label>
              {errors.agree_to_terms && (
                <p className="text-rose-500 text-xs font-medium mt-1">{errors.agree_to_terms}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                Creating Account...
              </>
            ) : (
              <>
                Create Account <i className="bi bi-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-ink-100"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-ink-500 font-medium">Or continue with</span>
          </div>
        </div>

        {/* Google Login */}
        <GoogleLogin
          redirectTo={
            app === 'pop'
              ? `${window.location.origin}/app/pop/auth/callback`
              : `${window.location.origin}/app/dti/auth/callback`
          }
        />

        {/* Login Link */}
        <p className="text-center text-ink-600 font-medium mt-6 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 font-extrabold hover:text-primary-700 transition">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;