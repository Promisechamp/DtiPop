import React, { useState } from 'react';
import { toast } from 'sonner';
import { Info, Clock, Truck, Wallet, Send, Loader2 } from 'lucide-react';
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
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'Failed to submit application';
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
      {/* INFO BOX */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
          <Info size={16} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-extrabold text-primary-900">
            You're applying for this item. The donor will review your
            application and choose a winner.
          </p>

          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-primary-700">
            <Clock size={12} />
            Applications are reviewed within 48 hours
          </p>
        </div>
      </div>

      {/* MESSAGE */}
      <div>
        <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
          Why do you need this item?{' '}
          <span className="text-xs font-medium text-ink-400">
            (min. 10 characters)
          </span>
          <span className="ml-1 text-danger-500">*</span>
        </label>

        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={5}
          placeholder="Tell the donor why you need this item, how you'll use it, and why you're the right person to receive it..."
          required
          className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
        />

        <div className="mt-1.5 flex justify-between text-xs font-bold text-ink-400">
          <span>{formData.message.length} characters</span>
          <span>Minimum 10 characters</span>
        </div>
      </div>

      {/* SHIPPING NOTE */}
      <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Truck size={14} className="text-ink-600" />

          <span className="text-sm font-extrabold text-ink-800">
            Shipping Information
          </span>
        </div>

        <p className="text-sm font-medium leading-6 text-ink-600">
          <Info size={12} className="mr-1 inline-block align-middle text-ink-400" />
          The donor has indicated that the winner will pay for shipping.
          You'll be responsible for the shipping cost if selected.
        </p>

        <div className="mt-2 flex items-center gap-2 text-sm">
          <Wallet size={14} className="shrink-0 text-primary-600" />

          <span className="font-bold text-ink-700">
            Estimated shipping cost will be provided after selection
          </span>
        </div>
      </div>

      {/* TERMS */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          name="agree_to_terms"
          checked={formData.agree_to_terms}
          onChange={handleChange}
          required
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-ink-300 text-primary-600 accent-primary-600 focus:ring-2 focus:ring-primary-300"
        />

        <div className="min-w-0">
          <label className="cursor-pointer text-sm font-extrabold text-ink-700">
            I agree to the{' '}
            <a
              href="/terms"
              className="font-extrabold text-primary-600 transition hover:text-primary-700"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              className="font-extrabold text-primary-600 transition hover:text-primary-700"
            >
              Privacy Policy
            </a>
          </label>

          <p className="mt-1 text-xs font-medium leading-5 text-ink-400">
            By applying, you confirm that you'll use this item responsibly and
            cover any shipping costs if selected.
          </p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send size={16} />
              Submit Application
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ApplicationForm;