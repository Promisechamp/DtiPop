import React, { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { applicationsAPI } from '@/services/api/dtiApi';

const ApplicationForm = ({ itemId, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    shipping_estimate: null,
    agree_to_terms: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.agree_to_terms) {
      toast.error('Please agree to the terms before applying');
      return;
    }
    if (!formData.message || formData.message.trim().length < 10) {
      toast.error('Please provide a detailed message (minimum 10 characters)');
      return;
    }

    setLoading(true);
    try {
      const response = await applicationsAPI.create({
        itemId: itemId,
        message: formData.message,
        shipping_estimate: formData.shipping_estimate,
      });
      toast.success('Application submitted successfully! 🎉');
      if (onSuccess) onSuccess(response.data?.application);
    } catch (err) {
      console.error('Application error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to submit application';
      if (errorMessage.includes('already applied')) {
        toast.error('You have already applied for this item');
      } else if (errorMessage.includes('own item')) {
        toast.error('You cannot apply for your own item');
      } else if (errorMessage.includes('no longer available')) {
        toast.error('This item is no longer available');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Info Box */}
      <div className="bg-primary-50 rounded-2xl p-4 flex items-start gap-3 border border-primary-200/60 shadow-sm">
        <i className="bi bi-info-circle text-primary-600 text-xl mt-0.5"></i>
        <div>
          <p className="text-sm font-bold text-ink-700">
            You're applying for this item. The donor will review your application and choose a winner.
          </p>
          <p className="text-xs font-medium text-ink-500 mt-1">
            <i className="bi bi-clock"></i> Applications are reviewed within 48 hours
          </p>
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-bold text-ink-700 mb-1">
          Why do you need this item? *
          <span className="text-xs font-medium text-ink-400 ml-2">(min. 10 characters)</span>
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400 bg-white"
          rows="5"
          placeholder="Tell the donor why you need this item, how you'll use it, and why you're the right person to receive it..."
          required
        />
        <div className="flex justify-between text-xs font-medium text-ink-400 mt-1">
          <span>{formData.message.length} characters</span>
          <span>Minimum 10 characters</span>
        </div>
      </div>

      {/* Shipping Note */}
      <div className="bg-ink-50/50 rounded-2xl p-4 border border-ink-100/60 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <i className="bi bi-truck text-ink-600"></i>
          <span className="font-bold text-ink-700">Shipping Information</span>
        </div>
        <p className="text-sm text-ink-600">
          <i className="bi bi-info-circle mr-1"></i>
          The donor has indicated that the winner will pay for shipping. You'll be responsible for the shipping cost if selected.
        </p>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <i className="bi bi-wallet text-primary-600"></i>
          <span className="text-ink-700 font-medium">Estimated shipping cost will be provided after selection</span>
        </div>
      </div>

      {/* Terms */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          name="agree_to_terms"
          checked={formData.agree_to_terms}
          onChange={handleChange}
          className="w-5 h-5 text-primary-600 rounded border-ink-300 focus:ring-primary-500 focus:ring-2 mt-0.5"
          required
        />
        <div>
          <label className="text-sm font-bold text-ink-700 cursor-pointer">
            I agree to the{' '}
            <a href="/terms" className="text-primary-600 hover:text-primary-700 font-bold transition">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary-600 hover:text-primary-700 font-bold transition">
              Privacy Policy
            </a>
          </label>
          <p className="text-xs font-medium text-ink-400 mt-1">
            By applying, you confirm that you'll use this item responsibly and cover any shipping costs if selected.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-ink-100/80">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
              Submitting...
            </>
          ) : (
            <>
              <i className="bi bi-send"></i>
              Submit Application
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default ApplicationForm;