import React, {
  useEffect,
  useState,
} from 'react';

import { createPortal } from 'react-dom';

import {
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';

import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const getInitialLocation = (profile) => {
  const location = profile?.location;

  if (
    !location ||
    typeof location !== 'object' ||
    Array.isArray(location)
  ) {
    return {
      country: '',
      country_code: '',
      state: '',
      state_code: '',
      city: '',
      postal_code: '',
    };
  }

  return {
    country: location.country || '',
    country_code: location.country_code || '',
    state: location.state || '',
    state_code: location.state_code || '',
    city: location.city || '',
    postal_code: location.postal_code || '',
  };
};

const LocationModal = ({
  open,
  onClose,
}) => {
  const {
    profile,
    updateLocation,
  } = useAuth();

  const [formData, setFormData] = useState(
    () => getInitialLocation(profile)
  );

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData(
      getInitialLocation(profile)
    );

    setErrors({});
  }, [open, profile]);

  /*
   * Prevent the page behind the modal from scrolling.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.country.trim()) {
      nextErrors.country =
        'Country is required';
    }

    if (!formData.state.trim()) {
      nextErrors.state =
        'State is required';
    }

    if (!formData.city.trim()) {
      nextErrors.city =
        'City is required';
    }

    setErrors(nextErrors);

    return (
      Object.keys(nextErrors).length === 0
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const {
        error,
      } = await updateLocation({
        country:
          formData.country.trim(),

        country_code:
          formData.country_code.trim() ||
          null,

        state:
          formData.state.trim(),

        state_code:
          formData.state_code.trim() ||
          null,

        city:
          formData.city.trim(),

        postal_code:
          formData.postal_code.trim() ||
          null,

        latitude: null,
        longitude: null,

        source: 'manual',
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success(
        'Your location has been saved'
      );

      onClose?.();
    } catch (error) {
      console.error(
        '[LOCATION] Save failed:',
        error
      );

      toast.error(
        error.message ||
          'Could not save your location'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) {
      return;
    }

    onClose?.();
  };

  const modal = (
    <div
      className="
        fixed
        inset-0
        z-[99999]
        flex
        items-end
        justify-center
        sm:items-center
        sm:p-4
      "
    >

      {/* ============================================== */}
      {/* BACKDROP */}
      {/* ============================================== */}

      <div
        className="
          absolute
          inset-0
          bg-black/50
          backdrop-blur-sm
        "
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ============================================== */}
      {/* MODAL */}
      {/* ============================================== */}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        className="
          relative
          z-10
          flex
          w-full
          max-h-[90vh]
          flex-col
          overflow-hidden
          rounded-t-3xl
          bg-white
          shadow-2xl
          dark:bg-gray-900

          sm:max-w-lg
          sm:rounded-3xl
        "
      >

        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}

        <div className="shrink-0 border-b border-gray-200 p-5 dark:border-gray-800 sm:p-6">

          <div className="flex items-start justify-between gap-4">

            <div className="flex min-w-0 items-start gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>

              <div className="min-w-0">

                <h2
                  id="location-modal-title"
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                >
                  Add your location
                </h2>

                <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  Tell us your general area so we
                  can connect you with relevant
                  community activity nearby.
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              aria-label="Close"
              className="
                shrink-0
                rounded-xl
                p-2
                text-gray-500
                transition
                hover:bg-gray-100
                hover:text-gray-700
                disabled:opacity-50
                dark:hover:bg-gray-800
                dark:hover:text-gray-300
              "
            >
              <X className="h-5 w-5" />
            </button>

          </div>

        </div>

        {/* ============================================ */}
        {/* PRIVACY */}
        {/* ============================================ */}

        <div className="shrink-0 px-5 pt-5 sm:px-6">

          <div className="flex gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60">

            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

            <div>

              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Your privacy comes first
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                We only need your general area.
                You don't need to provide your home
                address, and your exact address will
                not be shown to other members.
              </p>

            </div>

          </div>

        </div>

        {/* ============================================ */}
        {/* SCROLLABLE CONTENT */}
        {/* ============================================ */}

        <div className="min-h-0 flex-1 overflow-y-auto">

          <form
            id="location-form"
            onSubmit={handleSubmit}
            className="p-5 sm:p-6"
          >

            <div className="space-y-5">

              {/* Country */}
              <div>

                <label
                  htmlFor="location-country"
                  className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  Country
                </label>

                <input
                  id="location-country"
                  name="country"
                  type="text"
                  autoComplete="country-name"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="e.g. Nigeria"
                  disabled={loading}
                  className={`
                    w-full
                    rounded-xl
                    border
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:ring-2
                    focus:ring-primary/20
                    dark:bg-gray-900
                    dark:text-white
                    ${
                      errors.country
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }
                  `}
                />

                {errors.country && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.country}
                  </p>
                )}

              </div>

              {/* State */}
              <div>

                <label
                  htmlFor="location-state"
                  className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  State
                </label>

                <input
                  id="location-state"
                  name="state"
                  type="text"
                  autoComplete="address-level1"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Rivers"
                  disabled={loading}
                  className={`
                    w-full
                    rounded-xl
                    border
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:ring-2
                    focus:ring-primary/20
                    dark:bg-gray-900
                    dark:text-white
                    ${
                      errors.state
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }
                  `}
                />

                {errors.state && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.state}
                  </p>
                )}

              </div>

              {/* City */}
              <div>

                <label
                  htmlFor="location-city"
                  className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  City
                </label>

                <input
                  id="location-city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Port Harcourt"
                  disabled={loading}
                  className={`
                    w-full
                    rounded-xl
                    border
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:ring-2
                    focus:ring-primary/20
                    dark:bg-gray-900
                    dark:text-white
                    ${
                      errors.city
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-700'
                    }
                  `}
                />

                {errors.city && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.city}
                  </p>
                )}

              </div>

              {/* Postal code */}
              <div>

                <label
                  htmlFor="location-postal-code"
                  className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                >
                  Postal code

                  <span className="ml-1 font-normal text-gray-400">
                    (optional)
                  </span>
                </label>

                <input
                  id="location-postal-code"
                  name="postal_code"
                  type="text"
                  autoComplete="postal-code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="Optional"
                  disabled={loading}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-gray-300
                    bg-white
                    px-4
                    py-3
                    text-sm
                    text-gray-900
                    outline-none
                    transition
                    placeholder:text-gray-400
                    focus:ring-2
                    focus:ring-primary/20
                    dark:border-gray-700
                    dark:bg-gray-900
                    dark:text-white
                  "
                />

              </div>

            </div>

            {/* ========================================== */}
            {/* ACTIONS */}
            {/* ========================================== */}

<div className="flex gap-3 border-t border-gray-200 p-6 dark:border-gray-800">
  <button
    type="button"
    onClick={handleClose}
    disabled={loading}
    className="
      flex-1
      rounded-xl
      border
      border-gray-300
      px-4
      py-3
      text-sm
      font-medium
      text-gray-700
      transition
      hover:bg-gray-50
      disabled:opacity-50
      dark:border-gray-700
      dark:text-gray-300
      dark:hover:bg-gray-800
    "
  >
    Maybe later
  </button>

  <button
    type="submit"
    form="location-form"
    disabled={loading}
    className="
      flex-1
      rounded-xl
      bg-gray-900
      px-4
      py-3
      text-sm
      font-semibold
      text-white
      transition
      hover:bg-gray-800
      disabled:cursor-not-allowed
      disabled:opacity-50
      dark:bg-white
      dark:text-gray-900
      dark:hover:bg-gray-100
    "
  >
    {loading ? 'Saving...' : 'Save location'}
  </button>
</div>
          </form>

        </div>

      </div>

    </div>
  );

  /*
   * IMPORTANT:
   * Render directly under <body>, outside CommunityPage
   * and outside any parent that may have overflow/transform.
   */
  return createPortal(
    modal,
    document.body
  );
};

export default LocationModal;