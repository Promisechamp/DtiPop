// src/pages/BannedPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { authAPI } from '@/services/api/dtiApi';
import SupportModal from '../components/common/SupportModal';

// ============================================
// Live countdown — ticks every second
// ============================================
const useCountdown = (targetDate) => {
  const [parts, setParts] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) {
      setParts(null);
      return;
    }

    const tick = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) {
        setExpired(true);
        setParts({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setExpired(false);
      setParts({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return { parts, expired };
};

const CountdownDigit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-lg shadow-black/20">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -16, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute font-mono text-xl sm:text-2xl font-bold text-white tabular-nums"
        >
          {String(value).padStart(2, '0')}
        </motion.span>
      </AnimatePresence>
    </div>
    <span className="text-[10px] uppercase tracking-wider text-white/60 mt-1.5 font-medium">{label}</span>
  </div>
);

// ============================================
// Main component
// ============================================
const BannedPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [banData, setBanData] = useState(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { parts: countdown, expired: countdownExpired } = useCountdown(
    banData?.duration !== 'permanent' && banData?.duration !== 'Permanent' ? banData?.bannedUntil : null
  );

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await authAPI.getMe();
        const userData = response.data?.user || response.user || response.data;

        if (userData.ban_status !== 'banned') {
          toast.info('Your account is active');
          navigate('/');
          return;
        }

        const banHistory = userData.ban_history || [];
        const activeBan = banHistory.find((record) => record.status === 'active');

        let isExpired = false;
        let bannedUntil = userData.banned_until || activeBan?.banned_until || null;

        if (bannedUntil) {
          isExpired = new Date(bannedUntil) <= new Date();
        }

        setBanData({
          reason: userData.ban_reason || activeBan?.reason || 'Violation of community guidelines',
          bannedAt: userData.banned_at || activeBan?.banned_at || userData.updated_at || new Date().toISOString(),
          duration: userData.ban_duration || activeBan?.duration || 'Permanent',
          supportEmail: 'support@donttrashit.com',
          fullName: userData.full_name || 'User',
          email: userData.email || 'No Email',
          avatar_url: userData.avatar_url || null,
          banCount: userData.ban_count || 0,
          bannedBy: userData.banned_by_name || activeBan?.banned_by_name || 'Admin',
          banHistory: banHistory || [],
          isRepeatBan: (userData.ban_count || 0) > 1,
          bannedUntil,
          isExpired,
          banId: activeBan?.id || null,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load account information');
        setBanData({
          reason: 'Account suspended',
          bannedAt: new Date().toISOString(),
          duration: 'Permanent',
          supportEmail: 'support@donttrashit.com',
          fullName: 'User',
          email: 'No Email',
          avatar_url: null,
          banCount: 0,
          banHistory: [],
          isRepeatBan: false,
          bannedUntil: null,
          isExpired: false,
          banId: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleLogout = async () => {
  try {
    await authAPI.logout();
    // Clear localStorage items
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sb-dchhrzmdskrclzxhztci-auth-token');
    localStorage.removeItem('refresh_token');
    // Navigate to login
    navigate('/login');
    // Show success message
    toast.success('Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    toast.error('Failed to logout');
  }
};

  const handleTicketCreated = () => {
    setSubmitted(true);
    setShowSupportModal(false);
    toast.success('Support ticket submitted successfully!');
    setTimeout(() => setSubmitted(false), 5000);
  };

  const isPermanent = banData?.duration === 'permanent' || banData?.duration === 'Permanent';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
          <p className="text-slate-400 text-sm font-medium">Loading account information...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
            className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
          >
            <i className="bi bi-check-circle text-4xl text-green-600"></i>
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your support ticket has been submitted successfully. Our team will review your case and get back to you within 24-48 hours.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
          >
            Submit Another Request
          </button>
        </motion.div>
      </div>
    );
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 ">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-2xl w-full bg-white rounded-2xl overflow-hidden "
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-700 to-rose-800 px-6 pt-8 pb-7 overflow-hidden">
          {/* Decorative patterns */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}></div>
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
          <div className="absolute -left-6 bottom-0 w-28 h-28 rounded-full bg-black/20 blur-2xl"></div>
          
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>

          <div className="relative flex items-center gap-5">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-sm ring-1 ring-white/20 shadow-lg shadow-black/20"
            >
              <i className="bi bi-shield-exclamation text-3xl text-white"></i>
            </motion.div>
            <div className="text-white">
              <h1 className="text-2xl font-bold tracking-tight">Account Banned</h1>
              <p className="text-red-100/90 text-sm font-medium">Your account has been restricted</p>
            </div>
          </div>

          {/* Live countdown for temporary bans */}
          {!isPermanent && countdown && !countdownExpired && (
            <div className="relative mt-6 flex items-center gap-2 sm:gap-3 justify-center">
              <CountdownDigit value={countdown.days} label="Days" />
              <span className="text-white/30 text-2xl font-bold mb-4">:</span>
              <CountdownDigit value={countdown.hours} label="Hrs" />
              <span className="text-white/30 text-2xl font-bold mb-4">:</span>
              <CountdownDigit value={countdown.minutes} label="Min" />
              <span className="text-white/30 text-2xl font-bold mb-4">:</span>
              <CountdownDigit value={countdown.seconds} label="Sec" />
            </div>
          )}
          
          {!isPermanent && countdown && !countdownExpired && (
            <p className="relative text-center text-red-100/80 text-xs font-medium mt-1 tracking-wide">
              Time remaining until automatic restoration
            </p>
          )}
        </div>

        {/* Content */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } }}
          className="p-6 space-y-5"
        >
          {/* User Info */}
          {banData?.fullName && (
            <motion.div 
              variants={fadeUp} 
              className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-white rounded-xl p-3.5 border border-gray-100 shadow-sm"
            >
              {banData?.avatar_url ? (
                <img src={banData?.avatar_url} alt="" className="w-16 h-16 shadow-md border rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 shadow-sm border p-1 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <i className="bi bi-person text-3xl text-gray-400"></i>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{banData.fullName}</p>
                <p className="text-xs text-gray-500">{banData.email}</p>
              </div>
              <div className="ml-auto">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-red-100 text-red-700 border border-red-200">
                  Banned
                </span>
              </div>
            </motion.div>
          )}

          {/* Ban Details - Card style */}
          <motion.div 
            variants={fadeUp} 
            className="bg-gradient-to-br from-red-50 to-red-50/50 rounded-xl p-4 space-y-3 border border-red-100 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <i className="bi bi-info-circle text-red-500"></i>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Reason for Ban</p>
                <p className="text-sm text-red-700 font-medium mt-0.5">{banData?.reason || 'Violation of community guidelines'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <i className="bi bi-calendar text-red-500"></i>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Banned On</p>
                  <p className="text-sm text-red-700 font-medium">{formatDate(banData?.bannedAt)}</p>
                </div>
              </div>

              
            </div>

            <div className="border-t border-red-200 pt-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                  <i className="bi bi-clock-history text-red-500"></i>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Ban Duration</p>
                  <p className="text-sm text-red-700 font-medium">
                    {isPermanent ? (
                      <span className="flex items-center gap-2">
                        Permanent
                        <span className="text-[10px] font-normal text-red-500 bg-red-100 px-2 py-0.5 rounded-full">No auto-unban</span>
                      </span>
                    ) : (
                      banData?.duration || 'Permanent'
                    )}
                  </p>

                  {banData?.bannedUntil && !isPermanent && (
                    <>
                      {countdownExpired ? (
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-lg">
                          <i className="bi bi-check-circle"></i>
                          Your ban has expired. Please contact support if you still can't access your account.
                        </p>
                      ) : (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg">
                          <i className="bi bi-calendar-check"></i>
                          Auto-restoration on {formatDate(banData.bannedUntil)}
                        </p>
                      )}
                    </>
                  )}

                  {isPermanent && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg">
                      <i className="bi bi-info-circle"></i>
                      This is a permanent ban. You must contact support to appeal.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {banData?.banCount > 0 && (
              <div className="border-t border-red-200 pt-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <i className="bi bi-hash text-red-500"></i>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Previous Bans</p>
                    <p className="text-sm text-red-700 font-medium">Ban #{banData.banCount} for this account</p>
                    {banData.banCount > 1 && (
                      <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                        <i className="bi bi-exclamation-triangle"></i>
                        Repeat violations may result in permanent suspension
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Info Message */}
          <motion.div 
            variants={fadeUp} 
            className={`rounded-xl p-4 border shadow-sm ${
              countdownExpired 
                ? 'bg-green-50 border-green-200' 
                : isPermanent 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <p className={`text-sm leading-relaxed flex items-start gap-2 ${
              countdownExpired 
                ? 'text-green-700' 
                : isPermanent 
                ? 'text-blue-700' 
                : 'text-amber-700'
            }`}>
              <i className={`bi ${
                countdownExpired 
                  ? 'bi-check-circle' 
                  : isPermanent 
                  ? 'bi-info-circle' 
                  : 'bi-clock'
              } text-lg mt-0.5`}></i>
              {countdownExpired
                ? 'Your ban period has expired. If you still cannot access your account, please contact our support team.'
                : isPermanent
                ? 'If you believe this is a mistake or would like to appeal this decision, please contact our support team using the options below.'
                : `Your account is temporarily banned. It will be automatically restored on ${formatDate(banData?.bannedUntil)}. If you believe this is a mistake, please contact our support team.`}
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div variants={fadeUp} className="space-y-3">
            <button
              onClick={() => setShowSupportModal(true)}
              className="w-full px-4 py-3.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl transition-all font-semibold flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.98]"
            >
              <i className="bi bi-envelope text-lg"></i>
              Contact Support
            </button>

            <a
              href={`mailto:${banData?.supportEmail || 'support@donttrashit.com'}?subject=Account Ban Appeal - ${banData?.reason || 'Account Suspended'}`}
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition font-medium flex items-center justify-center gap-2.5 border border-gray-200 hover:border-gray-300"
            >
              <i className="bi bi-envelope-paper text-lg"></i>
              Send Email Directly
            </a>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-white hover:bg-gray-50 text-red-600 rounded-xl transition font-medium flex items-center justify-center gap-2.5 border border-red-200 hover:border-red-300 hover:shadow-sm"
            >
              <i className="bi bi-box-arrow-right text-lg"></i>
              Logout
            </button>
          </motion.div>

          {/* Ban History */}
          {banData?.banHistory && banData.banHistory.length > 1 && (
            <motion.div variants={fadeUp} className="border-t border-gray-200 pt-4">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 transition px-2 py-1.5 rounded-lg hover:bg-gray-50">
                  <span className="flex items-center gap-2">
                    <i className="bi bi-clock-history"></i>
                    View Ban History ({banData.banHistory.length} records)
                  </span>
                  <i className="bi bi-chevron-down group-open:rotate-180 transition-transform"></i>
                </summary>
                <div className="mt-3 space-y-2">
                  {banData.banHistory.map((record, index) => (
                    <div key={record.id || index} className="bg-gray-50 rounded-lg p-3.5 text-sm border border-gray-100 hover:border-gray-200 transition">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-700 flex items-center gap-2">
                          <i className="bi bi-shield text-gray-400"></i>
                          Ban #{record.ban_number || index + 1}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${
                            record.status === 'active'
                              ? 'bg-red-100 text-red-700'
                              : record.status === 'lifted'
                              ? 'bg-green-100 text-green-700'
                              : record.status === 'expired'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {record.status === 'active'
                            ? 'Active'
                            : record.status === 'lifted'
                            ? 'Lifted'
                            : record.status === 'expired'
                            ? 'Expired'
                            : 'Unknown'}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1.5">{record.reason || 'No reason provided'}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <i className="bi bi-calendar"></i>
                          {formatDate(record.banned_at)}
                        </span>
                        {record.lifted_at && (
                          <span className="flex items-center gap-1 text-green-600">
                            <i className="bi bi-check-circle"></i>
                            Lifted: {formatDate(record.lifted_at)}
                          </span>
                        )}
                        {record.expired_at && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <i className="bi bi-clock"></i>
                            Expired: {formatDate(record.expired_at)}
                          </span>
                        )}
                      </div>
                      {record.banned_by_name && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <i className="bi bi-person"></i>
                          By: {record.banned_by_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </motion.div>
          )}

          {/* Footer */}
          <motion.div variants={fadeUp} className="text-center text-xs text-gray-400 pt-2 border-t border-gray-100">
            <p className="">
              Need immediate assistance? Email us at{' '}
              <a href={`mailto:${banData?.supportEmail || 'support@donttrashit.com'}`} className="text-green-600 hover:text-green-700 hover:underline font-medium">
                {banData?.supportEmail || 'support@donttrashit.com'}
              </a>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Support Modal - Ban Appeal */}
      <SupportModal
        isOpen={showSupportModal}
        onClose={() => setShowSupportModal(false)}
        reporterType="unknown"
        onSuccess={handleTicketCreated}
        isBanAppeal={true}
        banData={{
          reason: banData?.reason || 'Not specified',
          bannedAt: banData?.bannedAt || new Date().toISOString(),
          duration: banData?.duration || 'Permanent',
          bannedBy: banData?.bannedBy || 'Admin',
          banCount: banData?.banCount || 0,
        }}
        defaultDescription={`I would like to appeal my account ban.\n\nBan Reason: ${banData?.reason || 'Not specified'}\nBanned On: ${formatDate(banData?.bannedAt)}\nDuration: ${banData?.duration || 'Permanent'}\nBan Count: ${banData?.banCount || 0}\n\nPlease review my case and consider reinstating my account. I understand the violation and will ensure it doesn't happen again.`}
      />
    </div>
  );
};

export default BannedPage;