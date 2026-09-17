import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { authAPI } from '@/services/api/dtiApi';

const ConfirmEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const confirmEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type') || 'email';

      if (!token) {
        setStatus('error');
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.confirmEmail(token, type);
        setStatus('success');
        toast.success('Email confirmed successfully! You can now login.');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err) {
        setStatus('error');
        toast.error(err.response?.data?.error || 'Failed to confirm email');
      } finally {
        setLoading(false);
      }
    };

    confirmEmail();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-ink-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-ink-600 font-medium">Confirming your email...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-ink-50/30">
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full text-center">
          <div className="bg-primary-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-200/60">
            <i className="bi bi-check-circle-fill text-4xl text-primary-600"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-ink-900 mb-2">
            Email Confirmed! 🎉
          </h2>
          <p className="text-ink-600 font-medium mb-4">
            Your email has been successfully verified.
          </p>
          <p className="text-sm font-medium text-ink-400 mb-6">
            You will be redirected to login shortly...
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition"
          >
            Go to Login Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-ink-50/30">
      <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full text-center">
        <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200/60">
          <i className="bi bi-x-circle-fill text-4xl text-rose-600"></i>
        </div>
        <h2 className="text-2xl font-extrabold text-ink-900 mb-2">
          Confirmation Failed
        </h2>
        <p className="text-ink-600 font-medium mb-4">
          The confirmation link is invalid or has expired.
        </p>
        <p className="text-sm font-medium text-ink-400 mb-6">
          Please try registering again or contact support.
        </p>
        <button
          onClick={() => navigate('/register')}
          className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition"
        >
          Register Again
        </button>
      </div>
    </div>
  );
};

export default ConfirmEmail;