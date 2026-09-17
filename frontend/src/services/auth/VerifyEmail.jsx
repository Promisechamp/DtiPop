import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { authAPI } from '@/services/api/dtiApi';
import Modal from '@/reusables/Modal';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Resend modal state
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState("");

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get("token");

      console.log(
        "🔍 Verifying email with token:",
        token?.substring(0, 20) + "...",
      );

      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.verifyEmail(token);

        if (response.data.success) {
          setStatus("success");
          setMessage("Your email has been verified successfully! 🎉");
          setUserEmail(response.data.user?.email);

          // Update user in localStorage
          const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          const updatedUser = { ...currentUser, ...response.data.user };
          localStorage.setItem("user", JSON.stringify(updatedUser));

          toast.success("Email verified successfully! 🎉");

          // Auto-login after 2 seconds
          setTimeout(() => {
            navigate("/dashboard");
          }, 3000);
        }
      } catch (err) {
        console.error("❌ Verification error:", err);
        setStatus("error");
        setMessage(err.response?.data?.error || "Failed to verify email");

        if (err.response?.data?.expired) {
          setStatus("expired");
        }

        toast.error(err.response?.data?.error || "Verification failed");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [searchParams, navigate]);

  const handleResend = async () => {
    if (!resendEmail) {
      setResendError("Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resendEmail)) {
      setResendError("Please enter a valid email address");
      return;
    }

    setResendLoading(true);
    setResendError("");

    try {
      await authAPI.resendVerification(resendEmail);
      toast.success("Verification email resent! Please check your inbox.");
      setShowResendModal(false);
      setResendEmail("");
    } catch (err) {
      setResendError(
        err.response?.data?.error || "Failed to resend verification email",
      );
    } finally {
      setResendLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-ink-50/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-ink-600 font-medium">Verifying your email...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-ink-50/30">
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full text-center">
          <div className="bg-primary-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary-200/60">
            <i className="bi bi-check-circle-fill text-4xl text-primary-600"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-ink-900 mb-2">
            Email Verified! 🎉
          </h2>
          <p className="text-ink-600 font-medium mb-2">{message}</p>
          {userEmail && (
            <p className="text-sm font-medium text-ink-500 mb-4">
              Verified: <strong className="text-ink-900">{userEmail}</strong>
            </p>
          )}
          <p className="text-sm font-medium text-ink-400 mb-6">
            Redirecting to dashboard...
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2"
          >
            Go to Dashboard <i className="bi bi-arrow-right"></i>
          </button>
        </div>
      </div>
    );
  }

  // Expired state
  if (status === "expired") {
    return (
      <>
        <div className="min-h-[80vh] flex items-center justify-center px-4 bg-ink-50/30">
          <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full text-center">
            <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200/60">
              <i className="bi bi-clock-history text-4xl text-amber-600"></i>
            </div>
            <h2 className="text-2xl font-extrabold text-ink-900 mb-2">
              Verification Link Expired
            </h2>
            <p className="text-ink-600 font-medium mb-4">
              {message ||
                "The verification link has expired. Please request a new one."}
            </p>
            <button
              onClick={() => setShowResendModal(true)}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2"
            >
              <i className="bi bi-arrow-repeat"></i>
              Resend Verification Email
            </button>
            <Link
              to="/login"
              className="text-sm font-bold text-ink-500 hover:text-ink-700 mt-4 block transition"
            >
              Back to Login
            </Link>
          </div>
        </div>

        {/* Resend Modal - using unified Modal component */}
        <Modal
          isOpen={showResendModal}
          onClose={() => {
            setShowResendModal(false);
            setResendEmail("");
            setResendError("");
          }}
          title="Resend Verification Email"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm font-medium text-ink-600">
              Enter your email address to receive a new verification link.
            </p>
            <div>
              <label className="block text-sm font-bold text-ink-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => {
                  setResendEmail(e.target.value);
                  if (resendError) setResendError("");
                }}
                placeholder="you@example.com"
                className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white ${
                  resendError ? "border-rose-500" : "border-ink-200"
                }`}
              />
              {resendError && (
                <p className="text-sm font-bold text-rose-500 mt-1 flex items-center gap-1">
                  <i className="bi bi-exclamation-circle"></i>
                  {resendError}
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowResendModal(false);
                  setResendEmail("");
                  setResendError("");
                }}
                className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
                disabled={resendLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleResend}
                disabled={resendLoading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {resendLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send"></i>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // Error state
  return (
    <>
      <div className="min-h-[80vh] flex items-center justify-center px-4 bg-ink-50/30">
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-8 max-w-md w-full text-center">
          <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-200/60">
            <i className="bi bi-x-circle-fill text-4xl text-rose-600"></i>
          </div>
          <h2 className="text-2xl font-extrabold text-ink-900 mb-2">
            Verification Failed
          </h2>
          <p className="text-ink-600 font-medium mb-4">
            {message || "Something went wrong"}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setShowResendModal(true)}
              className="w-full py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2"
            >
              <i className="bi bi-arrow-repeat"></i>
              Resend Verification
            </button>
            <Link
              to="/login"
              className="text-sm font-bold text-ink-500 hover:text-ink-700 block transition"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>

      {/* Resend Modal - using unified Modal component */}
      <Modal
        isOpen={showResendModal}
        onClose={() => {
          setShowResendModal(false);
          setResendEmail("");
          setResendError("");
        }}
        title="Resend Verification Email"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium text-ink-600">
            Enter your email address to receive a new verification link.
          </p>
          <div>
            <label className="block text-sm font-bold text-ink-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => {
                setResendEmail(e.target.value);
                if (resendError) setResendError("");
              }}
              placeholder="you@example.com"
              className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white ${
                resendError ? "border-rose-500" : "border-ink-200"
              }`}
            />
            {resendError && (
              <p className="text-sm font-bold text-rose-500 mt-1 flex items-center gap-1">
                <i className="bi bi-exclamation-circle"></i>
                {resendError}
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowResendModal(false);
                setResendEmail("");
                setResendError("");
              }}
              className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              disabled={resendLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleResend}
              disabled={resendLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {resendLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Sending...
                </>
              ) : (
                <>
                  <i className="bi bi-send"></i>
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default VerifyEmail;