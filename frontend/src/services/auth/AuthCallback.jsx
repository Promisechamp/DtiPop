import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/services/api/supabase';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  // Determine app from current URL path
  const isPopApp = window.location.pathname.startsWith('/app/pop');
  const appName = isPopApp ? 'POP' : 'DTI';

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const error = searchParams.get('error');

      if (error) {
        console.error('❌ Auth error:', error);
        toast.error(`Authentication failed: ${error}`);
        setStatus('error');
        setMessage(error);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Try Supabase session first
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
        }

        if (session) {
          // Store tokens
          localStorage.setItem('token', session.access_token);
          localStorage.setItem('refresh_token', session.refresh_token);
          localStorage.setItem('user', JSON.stringify(session.user));

          // Fetch profile from backend to get role (if DTI)
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const response = await fetch(`${apiUrl}/auth/me`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              const userData = data.user;
              localStorage.setItem('user', JSON.stringify(userData));

              // Determine redirect based on app and role
              let redirectPath = '/dashboard'; // default DTI
              if (isPopApp) {
                redirectPath = '/dashboard'; // POP dashboard (corrected)
              } else {
                // DTI: admin goes to /admin, else /dashboard
                if (userData?.is_admin || userData?.role === 'admin' || userData?.role === 'super_admin') {
                  redirectPath = '/admin';
                }
              }

              toast.success('Login successful! 🎉');
              setStatus('success');
              setMessage(`Welcome to ${isPopApp ? 'Proof of Purchase' : "Don't Trash It"}!`);
              setTimeout(() => navigate(redirectPath, { replace: true }), 1000);
              return;
            } else {
              console.warn('⚠️ Profile fetch returned:', response.status);
              // Fallback: no profile, use session data only
              const redirectPath = isPopApp ? '/dashboard' : '/dashboard';
              toast.success('Login successful! 🎉');
              setStatus('success');
              setMessage(`Welcome to ${isPopApp ? 'Proof of Purchase' : "Don't Trash It"}!`);
              setTimeout(() => navigate(redirectPath, { replace: true }), 1000);
              return;
            }
          } catch (fetchError) {
            console.warn('⚠️ Profile fetch failed, using session data:', fetchError.message);
            // Continue with session data, no role info
            const redirectPath = isPopApp ? '/dashboard' : '/dashboard';
            toast.success('Login successful! 🎉');
            setStatus('success');
            setMessage(`Welcome to ${isPopApp ? 'Proof of Purchase' : "Don't Trash It"}!`);
            setTimeout(() => navigate(redirectPath, { replace: true }), 1000);
            return;
          }
        }
      } catch (err) {
        console.error('❌ Session error:', err);
      }

      // Fallback: Try tokens from URL (if no Supabase session)
      if (accessToken && refreshToken) {
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);

        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          const response = await fetch(`${apiUrl}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user', JSON.stringify(data.user));

            // Determine redirect
            let redirectPath = '/dashboard';
            if (isPopApp) redirectPath = '/dashboard'; // corrected
            else if (data.user?.is_admin || data.user?.role === 'admin' || data.user?.role === 'super_admin') redirectPath = '/admin';

            toast.success('Login successful! 🎉');
            setStatus('success');
            setTimeout(() => navigate(redirectPath, { replace: true }), 1000);
            return;
          } else {
            console.error('❌ Failed to fetch user:', response.status);
          }
        } catch (err) {
          console.error('❌ Fetch error:', err.message);
        }
      }

      // If we get here, authentication failed
      toast.error('Authentication failed. Please try again.');
      setStatus('error');
      setMessage('No authentication data received');
      setTimeout(() => navigate('/login'), 3000);
    };

    handleCallback();
  }, [searchParams, navigate, isPopApp]);

  if (status === 'loading') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-ink-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-ink-600 font-medium">Completing authentication...</p>
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
          <h2 className="text-2xl font-extrabold text-ink-900 mb-2">Login Successful! 🎉</h2>
          <p className="text-ink-600 font-medium">{message}</p>
          <p className="text-sm font-medium text-ink-400 mt-2">Redirecting...</p>
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
        <h2 className="text-2xl font-extrabold text-ink-900 mb-2">Authentication Failed</h2>
        <p className="text-ink-600 font-medium mb-2">{message || 'Please try again'}</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default AuthCallback;