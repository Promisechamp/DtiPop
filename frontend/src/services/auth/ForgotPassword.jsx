import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { authAPI, usersAPI } from '@/services/api/dtiApi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const checkResponse = await authAPI.checkUserExists(email);
      
      if (!checkResponse.data.exists) {
        setError('No account found with this email address');
        toast.error('No account found with this email address');
        setLoading(false);
        return;
      }

      await usersAPI.forgotPassword(email);
      setSent(true);
      toast.success('Password reset email sent!');
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to send reset email';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-ink-50/30">
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full text-center">
          <div className="bg-primary-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-200/60">
            <i className="bi bi-envelope-check text-4xl text-primary-600"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-ink-900 mb-2">
            Check Your Email
          </h2>
          <p className="text-ink-600 font-medium mb-4">
            We've sent a password reset link to <strong className="text-primary-600">{email}</strong>
          </p>
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 mb-6 text-left shadow-sm">
            <p className="text-sm font-bold text-amber-700">
              <i className="bi bi-info-circle mr-2"></i>
              If you don't see the email in your inbox, please check your spam or junk folder.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              to="/login"
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition inline-block text-center"
            >
              Back to Login
            </Link>
            <button
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
              className="text-sm font-bold text-ink-500 hover:text-ink-700 w-full transition"
            >
              <i className="bi bi-arrow-left mr-1"></i>
              Try a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 bg-ink-50/30">
      <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold mt-4 text-ink-900">Forgot Password</h2>
          <p className="text-ink-600 text-sm font-medium">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200/60 text-rose-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 shadow-sm">
            <i className="bi bi-exclamation-triangle-fill text-rose-500"></i>
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-bold text-ink-700 mb-1">Email Address</label>
            <div className="relative">
              <i className="bi bi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"></i>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white pl-10 ${
                  error ? 'border-rose-500' : 'border-ink-200'
                }`}
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs font-medium text-ink-400 mt-1">
              We'll check if this email is registered before sending the reset link
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                Checking...
              </>
            ) : (
              <>
                Send Reset Link <i className="bi bi-arrow-right"></i>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-ink-600 font-medium">
            Remember your password?{' '}
            <Link to="/login" className="text-primary-600 font-extrabold hover:text-primary-700 transition">
              Sign In
            </Link>
          </p>
          <p className="text-xs font-medium text-ink-400 mt-4">
            <i className="bi bi-shield-check mr-1"></i>
            We'll only send a reset link if the email is registered with us
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;