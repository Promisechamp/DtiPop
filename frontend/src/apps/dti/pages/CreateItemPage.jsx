import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Plus,
  Image as ImageIcon,
  Upload,
  X,
  Truck,
  Gift,
  Wallet,
  Info,
  Check,
  ChevronUp,
  ChevronDown,
  Mailbox,
  Package,
  Globe,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { itemsAPI } from '@/services/api/dtiApi';
import {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  SHIPPING_OPTIONS,
} from '@/utils/constants';

import Select from '@/reusables/Select';

/* =========================================================
   SKELETON
========================================================= */

const CreateItemSkeleton = () => (
  <div className="min-h-full bg-transparent">
    <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">


      <div className="space-y-7">
        {/* HEADER */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-32 animate-pulse rounded bg-ink-200" />
            </div>
            <div className="h-8 w-48 animate-pulse rounded bg-ink-200" />
            <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-ink-200" />
          </div>
        </div>

        {/* IMAGES */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          <div className="h-5 w-24 animate-pulse rounded bg-ink-200" />

          <div className="mt-4 rounded-2xl border-2 border-dashed border-ink-200 p-8">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-ink-200" />
              <div className="h-4 w-40 animate-pulse rounded bg-ink-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-ink-200" />
              <div className="mt-3 h-10 w-36 animate-pulse rounded-xl bg-ink-200" />
            </div>
          </div>
        </div>

        {/* BASIC INFO */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded bg-ink-200" />

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 h-4 w-14 animate-pulse rounded bg-ink-200" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-ink-200" />
            </div>

            <div>
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-ink-200" />
              <div className="h-28 w-full animate-pulse rounded-xl bg-ink-200" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-16 animate-pulse rounded-xl bg-ink-200" />
              <div className="h-16 animate-pulse rounded-xl bg-ink-200" />
            </div>
          </div>
        </div>

        {/* SHIPPING */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded bg-ink-200" />

          <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
            <div className="mb-3 h-5 w-44 animate-pulse rounded bg-ink-200" />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <div className="mb-2 h-3 w-20 animate-pulse rounded bg-ink-200" />
                  <div className="h-10 animate-pulse rounded-xl bg-ink-200" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-7 w-7 animate-pulse rounded-xl bg-ink-200" />
              <div className="h-5 w-44 animate-pulse rounded bg-ink-200" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-11 animate-pulse rounded-xl bg-ink-200" />
              <div className="h-11 animate-pulse rounded-xl bg-ink-200" />
            </div>
          </div>
        </div>

        {/* SUBMIT */}
        <div className="flex flex-col gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
          <div className="h-11 w-full animate-pulse rounded-xl bg-ink-200 sm:w-32" />
          <div className="h-11 w-full animate-pulse rounded-xl bg-ink-200 sm:w-32" />
        </div>
      </div>
    </div>
  </div>
);

/* =========================================================
   SHIPPING ESTIMATE
========================================================= */

const ShippingEstimate = ({ weight, dimensions, fromCountry, toRegion }) => {
  const [estimates] = useState([
    { carrier: 'USPS', price: 12.5, days: '3-5' },
    { carrier: 'FedEx', price: 18.75, days: '2-3' },
    { carrier: 'UPS', price: 15.25, days: '3-4' },
  ]);

  const hasDimensions =
    dimensions?.length && dimensions?.width && dimensions?.height;

  const getCarrierIcon = (carrier) => {
    if (carrier === 'USPS') return Mailbox;
    if (carrier === 'FedEx') return Truck;
    return Package;
  };

  return (
    <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-black text-ink-950">Shipping Estimates</h4>

      <div className="mt-3 space-y-2">
        {estimates.map((est, idx) => {
          const CarrierIcon = getCarrierIcon(est.carrier);

          return (
            <div
              key={idx}
              className="flex items-center justify-between rounded-xl bg-ink-50/60 p-2.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-ink-600 shadow-sm">
                  <CarrierIcon size={14} />
                </span>

                <div>
                  <p className="text-sm font-extrabold text-ink-900">
                    {est.carrier}
                  </p>

                  <p className="text-[11px] font-bold text-ink-400">
                    {est.days} business days
                  </p>
                </div>
              </div>

              <span className="text-sm font-black text-primary-600">
                ${est.price.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-start gap-2 text-[11px] font-bold text-ink-400">
        <Info size={12} className="mt-0.5 shrink-0" />

        <span>
          Estimated from {fromCountry || 'your location'} to {toRegion}
          {hasDimensions &&
            ` • ${dimensions.length}×${dimensions.width}×${dimensions.height}cm`}
          {weight && ` • ${weight}kg`}
        </span>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN
========================================================= */

const CreateItemPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    condition: '',
    weight_kg: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    donor_pays_shipping: false,
    shipping_region: '',
    exclude_countries: [],
  });

  const [selectedRegion, setSelectedRegion] = useState('');
  const [excludedCountries, setExcludedCountries] = useState([]);
  const [showShippingEstimate, setShowShippingEstimate] = useState(false);

  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djda2nagd';

  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_ITEMS ||
    'donttrashit_items';

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 800);

    return () => clearTimeout(timer);
  }, []);

  const regionOptions = useMemo(
    () => [
      {
        value: '',
        label: 'Select Region',
        icon: Globe,
      },
      ...SHIPPING_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        icon: option.icon,
        color: option.color,
      })),
    ],
    []
  );

  if (pageLoading) {
    return <CreateItemSkeleton />;
  }

  /* =========================================================
     HANDLERS
  ========================================================= */

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    setExcludedCountries([]);

    setFormData((prev) => ({
      ...prev,
      shipping_region: region,
      exclude_countries: [],
    }));
  };

  const handleExcludeToggle = (country) => {
    const newExcludes = excludedCountries.includes(country)
      ? excludedCountries.filter((c) => c !== country)
      : [...excludedCountries, country];

    setExcludedCountries(newExcludes);

    setFormData((prev) => ({
      ...prev,
      exclude_countries: newExcludes,
    }));
  };

  const handleShippingToggle = (value) => {
    setFormData((prev) => ({
      ...prev,
      donor_pays_shipping: value,
      ...(value
        ? {}
        : {
            shipping_region: '',
            exclude_countries: [],
          }),
    }));

    if (!value) {
      setSelectedRegion('');
      setExcludedCountries([]);
    }
  };

  /* =========================================================
     IMAGES
  ========================================================= */

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const invalidFiles = files.filter((file) => file.size > 5 * 1024 * 1024);

    if (invalidFiles.length > 0) {
      toast.error('Each image must be less than 5MB');
      return;
    }

    const invalidTypes = files.filter(
      (file) =>
        ![
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ].includes(file.type)
    );

    if (invalidTypes.length > 0) {
      toast.error('Only JPG, PNG, GIF, and WEBP images are allowed');
      return;
    }

    setImages((prev) => [...prev, ...files]);

    setImagePreviews((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);

    e.target.value = '';
  };

  const removeImage = (index) => {
    const preview = imagePreviews[index];

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setImages((prev) => prev.filter((_, i) => i !== index));

    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  /* =========================================================
     CLOUDINARY
  ========================================================= */

  const uploadImagesToCloudinary = async (imageFiles) => {
    const uploadedUrls = [];

    let completed = 0;
    const total = imageFiles.length;

    for (const file of imageFiles) {
      const fd = new FormData();

      fd.append('file', file);
      fd.append('upload_preset', uploadPreset);
      fd.append('folder', 'donttrashit/items');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: fd,
        }
      );

      if (!res.ok) {
        const err = await res.json();

        throw new Error(err.error?.message || 'Upload failed');
      }

      const data = await res.json();

      uploadedUrls.push(data.secure_url);

      completed++;

      setUploadProgress(Math.round((completed / total) * 100));
    }

    return {
      success: true,
      urls: uploadedUrls,
    };
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.description ||
      !formData.category ||
      !formData.condition
    ) {
      toast.error('Please fill in all required fields');

      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setUploadProgress(0);

    try {
      let imageUrls = [];

      if (images.length > 0) {
        toast.info('Uploading images...');

        const uploadResult = await uploadImagesToCloudinary(images);

        if (!uploadResult.success) {
          toast.error(`Upload failed: ${uploadResult.error}`);

          return;
        }

        imageUrls = uploadResult.urls;

        toast.success(`${imageUrls.length} image(s) uploaded!`);
      }

      const itemData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,

        weight_kg: formData.weight_kg || null,

        length_cm: formData.length_cm || null,

        width_cm: formData.width_cm || null,

        height_cm: formData.height_cm || null,

        donor_pays_shipping: formData.donor_pays_shipping,

        images: imageUrls,

        shipping_region: formData.donor_pays_shipping
          ? formData.shipping_region
          : null,

        exclude_countries: formData.donor_pays_shipping
          ? formData.exclude_countries
          : [],
      };

      toast.info('Creating your listing...');

      const response = await itemsAPI.create(itemData);

      toast.success('Item listed successfully! 🎉');

      navigate(`/item/${response.data.item.id}`);
    } catch (err) {
      console.error('Error creating item:', err);

      toast.error(err.response?.data?.error || 'Failed to list item');
    } finally {
      setIsSubmitting(false);
      setLoading(false);
      setUploadProgress(0);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-full bg-transparent">

      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="mb-7"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-600">
                <Plus size={14} strokeWidth={2.5} />
                <span>New listing</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                List Your Item
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                Give your item a second life.
              </p>
            </div>
          </div>
        </motion.div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* =================================================
              IMAGES
          ================================================= */}

          <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black tracking-tight text-ink-950">
              Images
            </h3>

            <div className="mt-4 rounded-2xl border-2 border-dashed border-ink-300 p-8 transition-colors hover:border-primary-300">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
                  <ImageIcon size={22} />
                </div>

                <p className="mt-3 text-sm font-bold text-ink-600">
                  Upload up to 5 images (JPG, PNG, GIF, WEBP)
                </p>

                <p className="mt-0.5 text-xs font-bold text-ink-400">
                  Max 5MB each
                </p>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />

                <label
                  htmlFor="image-upload"
                  className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  <Upload size={14} />
                  Choose Images
                </label>
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="h-24 w-full rounded-xl border border-ink-300 object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-white shadow-sm transition hover:bg-danger-600"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X size={13} />
                    </button>

                    <span className="absolute bottom-1 right-1 rounded bg-ink-950/60 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {isSubmitting && (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-500">
                    Uploading...
                  </span>

                  <span className="text-xs font-extrabold text-ink-700">
                    {uploadProgress}%
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-2 rounded-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black tracking-tight text-ink-950">
              Basic Information
            </h3>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                  Title <span className="text-danger-500">*</span>
                </label>

                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., iPhone 12 Pro Max"
                  required
                  className="input-field text-sm font-medium"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-extrabold text-ink-700">
                  Description <span className="text-danger-500">*</span>
                </label>

                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Describe your item in detail..."
                  required
                  className="input-field text-sm font-medium"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Category"
                  value={formData.category}
                  onChange={(value) => handleSelectChange('category', value)}
                  options={ITEM_CATEGORIES}
                  placeholder="Select Category"
                  required
                  searchable
                  showIcon
                />

                <Select
                  label="Condition"
                  value={formData.condition}
                  onChange={(value) => handleSelectChange('condition', value)}
                  options={ITEM_CONDITIONS}
                  placeholder="Select Condition"
                  required
                  searchable
                  showIcon
                />
              </div>
            </div>
          </div>

          {/* =================================================
              SHIPPING
          ================================================= */}

          <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
            <h3 className="text-base font-black tracking-tight text-ink-950">
              Shipping Details
            </h3>

            {/* DIMENSIONS */}
            <div className="mt-5 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
              <label className="mb-2 block text-sm font-extrabold text-ink-700">
                Item Dimensions{' '}
                <span className="text-xs font-medium text-ink-400">
                  (Optional)
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ['weight_kg', 'Weight (kg)', '2.5'],
                  ['length_cm', 'Length (cm)', '30'],
                  ['width_cm', 'Width (cm)', '20'],
                  ['height_cm', 'Height (cm)', '15'],
                ].map(([name, label, placeholder]) => (
                  <div key={name}>
                    <label className="mb-1 block text-[11px] font-bold text-ink-500">
                      {label}
                    </label>

                    <input
                      type="number"
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      step={name === 'weight_kg' ? '0.1' : undefined}
                      min="0"
                      className="input-field px-3 py-2 text-sm font-medium"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* WHO PAYS */}
            <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    formData.donor_pays_shipping
                      ? 'bg-primary-50 text-primary-600'
                      : 'bg-ink-100 text-ink-400'
                  }`}
                >
                  <Truck size={16} />
                </span>

                <label className="flex-1 text-sm font-extrabold text-ink-700">
                  Who pays for shipping?
                </label>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                <button
                  type="button"
                  onClick={() => handleShippingToggle(true)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 transition ${
                    formData.donor_pays_shipping
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-ink-300 text-ink-600 hover:border-primary-300 hover:bg-ink-50'
                  }`}
                >
                  <Gift size={14} />

                  <span className="text-sm font-extrabold">I'll Pay</span>

                  <span className="text-xs font-bold text-ink-500">
                    (Free for winner)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShippingToggle(false)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 transition ${
                    !formData.donor_pays_shipping
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-ink-300 text-ink-600 hover:border-primary-300 hover:bg-ink-50'
                  }`}
                >
                  <Wallet size={14} />

                  <span className="text-sm font-extrabold">Winner Pays</span>

                  <span className="text-xs font-bold text-ink-500">
                    (Free for you)
                  </span>
                </button>
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[11px] font-bold text-ink-500">
                <Info size={12} className="mt-0.5 shrink-0 text-ink-400" />

                {formData.donor_pays_shipping
                  ? 'You will cover shipping costs. Choose which regions you want to ship to.'
                  : "The winner will pay for shipping. You don't need to specify shipping regions."}
              </p>
            </div>

            {/* REGION */}
            {formData.donor_pays_shipping && (
              <>
                <div className="mt-4">
                  <Select
                    label="Shipping Region"
                    value={selectedRegion}
                    onChange={handleRegionChange}
                    options={regionOptions}
                    placeholder="Select shipping region"
                    searchable
                    showIcon
                    showDescription
                  />
                </div>

                {/* EXCLUSIONS */}
                {selectedRegion && (
                  <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-4">
                    <label className="mb-2 block text-sm font-extrabold text-ink-700">
                      Exclude Countries{' '}
                      <span className="text-xs font-medium text-ink-400">
                        (Optional)
                      </span>
                    </label>

                    <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3">
                      {SHIPPING_OPTIONS.find(
                        (opt) => opt.value === selectedRegion
                      )
                        ?.description?.split(', ')
                        .map((country) => (
                          <label
                            key={country}
                            className="flex cursor-pointer items-center gap-2 rounded-xl p-1.5 text-sm transition hover:bg-ink-100"
                          >
                            <input
                              type="checkbox"
                              checked={excludedCountries.includes(country)}
                              onChange={() => handleExcludeToggle(country)}
                              className="h-4 w-4 shrink-0 cursor-pointer rounded border-ink-400 text-primary-600 accent-primary-600 focus:ring-2 focus:ring-primary-300"
                            />

                            <span className="font-bold text-ink-700">
                              {country.trim()}
                            </span>
                          </label>
                        ))}
                    </div>

                    {excludedCountries.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink-500">
                        <Info size={11} />
                        {excludedCountries.length} countries excluded
                      </div>
                    )}
                  </div>
                )}

                {/* ESTIMATE */}
                {selectedRegion && formData.weight_kg && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() =>
                        setShowShippingEstimate(!showShippingEstimate)
                      }
                      className="inline-flex items-center gap-2 text-sm font-extrabold text-primary-600 transition hover:text-primary-700"
                    >
                      {showShippingEstimate ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                      {showShippingEstimate ? 'Hide' : 'Show'} Shipping Estimates
                    </button>

                    {showShippingEstimate && (
                      <ShippingEstimate
                        weight={formData.weight_kg}
                        dimensions={{
                          length: formData.length_cm,
                          width: formData.width_cm,
                          height: formData.height_cm,
                        }}
                        fromCountry={user?.profile?.country || 'USA'}
                        toRegion={selectedRegion}
                      />
                    )}
                  </div>
                )}
              </>
            )}

            {/* WINNER PAYS INFO */}
            {!formData.donor_pays_shipping && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                  <Info size={16} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-primary-900">
                    Winner Pays Shipping
                  </p>

                  <p className="mt-1 text-xs font-medium leading-5 text-primary-700">
                    The winner will be responsible for shipping costs. You
                    don't need to specify shipping regions.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              SUBMIT
          ================================================= */}

          <div className="flex flex-col-reverse gap-2 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={isSubmitting || loading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-300 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting || loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                  {uploadProgress > 0 && uploadProgress < 100
                    ? `Uploading... ${uploadProgress}%`
                    : 'Listing...'}
                </>
              ) : (
                <>
                  <Check size={16} />
                  List Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateItemPage;