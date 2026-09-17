import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { itemsAPI } from '@/services/api/dtiApi';
import {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  SHIPPING_OPTIONS,
} from '@/utils/constants';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import Select from '@/reusables/Select';

/* =========================================================
   SKELETON
   Mirrors the actual page structure and dimensions
========================================================= */

const CreateItemSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30 pb-20">
    <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">

      {/* PAGE NAVIGATION */}
      <div className="animate-pulse">
        <div className="flex items-center gap-2.5 py-10">
          <div className="h-10 w-[86px] rounded-lg bg-ink-200" />
          <div className="h-6 w-px bg-ink-200" />
          <div className="h-10 w-[92px] rounded-lg bg-ink-200" />
        </div>
      </div>

      {/* PAGE HEADER */}
      <div className="animate-pulse">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-ink-200 shrink-0" />

          <div>
            <div className="h-8 w-48 bg-ink-200 rounded-lg" />
            <div className="h-4 w-64 bg-ink-200 rounded mt-2" />
          </div>
        </div>
      </div>

      {/* IMAGE SECTION */}
      <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-6 animate-pulse">
        <div className="h-6 w-24 bg-ink-200 rounded-lg mb-4" />

        <div className="border-2 border-dashed border-ink-200 rounded-lg p-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-lg bg-ink-200" />
            <div className="h-4 w-40 bg-ink-200 rounded" />
            <div className="h-3 w-24 bg-ink-200 rounded" />
            <div className="h-10 w-36 bg-ink-200 rounded-lg mt-3" />
          </div>
        </div>
      </div>

      {/* BASIC INFORMATION */}
      <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-6 mt-6 animate-pulse">
        <div className="h-6 w-36 bg-ink-200 rounded-lg mb-5" />

        <div className="space-y-4">
          <div>
            <div className="h-4 w-14 bg-ink-200 rounded mb-2" />
            <div className="h-[42px] w-full bg-ink-200 rounded-lg" />
          </div>

          <div>
            <div className="h-4 w-24 bg-ink-200 rounded mb-2" />
            <div className="h-[112px] w-full bg-ink-200 rounded-lg" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[68px] bg-ink-200 rounded-lg" />
            <div className="h-[68px] bg-ink-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* SHIPPING */}
      <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-6 mt-6 animate-pulse">
        <div className="h-6 w-36 bg-ink-200 rounded-lg mb-5" />

        <div className="bg-ink-100/70 rounded-lg p-4 mb-4">
          <div className="h-5 w-44 bg-ink-200 rounded mb-3" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item}>
                <div className="h-3 w-20 bg-ink-200 rounded mb-2" />
                <div className="h-[38px] bg-ink-200 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-ink-100/80">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-ink-200" />
            <div className="h-5 w-44 bg-ink-200 rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-11 bg-ink-200 rounded-lg" />
            <div className="h-11 bg-ink-200 rounded-lg" />
          </div>

          <div className="h-4 w-3/4 bg-ink-200 rounded mt-4" />
        </div>
      </div>

      {/* SUBMIT */}
      <div className="flex gap-4 pt-4 mt-6 border-t border-ink-100/80 animate-pulse">
        <div className="flex-1 h-12 bg-ink-200 rounded-lg" />
        <div className="w-32 h-12 bg-ink-200 rounded-lg" />
      </div>

    </div>
  </div>
);

/* =========================================================
   SHIPPING ESTIMATE
========================================================= */

const ShippingEstimate = ({
  weight,
  dimensions,
  fromCountry,
  toRegion,
}) => {
  const [estimates] = useState([
    { carrier: 'USPS', price: 12.5, days: '3-5' },
    { carrier: 'FedEx', price: 18.75, days: '2-3' },
    { carrier: 'UPS', price: 15.25, days: '3-4' },
  ]);

  const hasDimensions =
    dimensions?.length &&
    dimensions?.width &&
    dimensions?.height;

  return (
    <div className="bg-white border border-ink-100/80 rounded-lg p-4 mt-2 shadow-sm">
      <h4 className="font-medium text-ink-700 mb-3">
        Shipping Estimates
      </h4>

      <div className="space-y-2">
        {estimates.map((est, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between p-2 bg-ink-50 rounded-md"
          >
            <div className="flex items-center gap-3">
              <i
                className={`bi bi-${
                  est.carrier === 'USPS'
                    ? 'mailbox'
                    : est.carrier === 'FedEx'
                      ? 'truck'
                      : 'package'
                } text-ink-600`}
              />

              <div>
                <p className="font-medium text-sm">
                  {est.carrier}
                </p>

                <p className="text-xs text-ink-500">
                  {est.days} business days
                </p>
              </div>
            </div>

            <span className="font-semibold text-primary-600">
              ${est.price.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-ink-500 flex items-center gap-2">
        <i className="bi bi-info-circle" />

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
  const [showShippingEstimate, setShowShippingEstimate] =
    useState(false);

  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djda2nagd';

  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_ITEMS ||
    'donttrashit_items';

  useEffect(() => {
    const timer = setTimeout(
      () => setPageLoading(false),
      800
    );

    return () => clearTimeout(timer);
  }, []);

  const regionOptions = useMemo(
    () => [
      {
        value: '',
        label: 'Select Region',
        icon: 'bi-globe',
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
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : value,
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
      ? excludedCountries.filter(
          (c) => c !== country
        )
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

    const invalidFiles = files.filter(
      (file) => file.size > 5 * 1024 * 1024
    );

    if (invalidFiles.length > 0) {
      toast.error(
        'Each image must be less than 5MB'
      );
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
      toast.error(
        'Only JPG, PNG, GIF, and WEBP images are allowed'
      );
      return;
    }

    setImages((prev) => [
      ...prev,
      ...files,
    ]);

    setImagePreviews((prev) => [
      ...prev,
      ...files.map((file) =>
        URL.createObjectURL(file)
      ),
    ]);

    e.target.value = '';
  };

  const removeImage = (index) => {
    const preview = imagePreviews[index];

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setImages((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setImagePreviews((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  /* =========================================================
     CLOUDINARY
  ========================================================= */

  const uploadImagesToCloudinary = async (
    imageFiles
  ) => {
    const uploadedUrls = [];

    let completed = 0;
    const total = imageFiles.length;

    for (const file of imageFiles) {
      const fd = new FormData();

      fd.append('file', file);
      fd.append(
        'upload_preset',
        uploadPreset
      );
      fd.append(
        'folder',
        'donttrashit/items'
      );

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: fd,
        }
      );

      if (!res.ok) {
        const err = await res.json();

        throw new Error(
          err.error?.message ||
            'Upload failed'
        );
      }

      const data = await res.json();

      uploadedUrls.push(data.secure_url);

      completed++;

      setUploadProgress(
        Math.round(
          (completed / total) * 100
        )
      );
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
      toast.error(
        'Please fill in all required fields'
      );

      return;
    }

    setIsSubmitting(true);
    setLoading(true);
    setUploadProgress(0);

    try {
      let imageUrls = [];

      if (images.length > 0) {
        toast.info(
          'Uploading images...'
        );

        const uploadResult =
          await uploadImagesToCloudinary(
            images
          );

        if (!uploadResult.success) {
          toast.error(
            `Upload failed: ${uploadResult.error}`
          );

          return;
        }

        imageUrls =
          uploadResult.urls;

        toast.success(
          `${imageUrls.length} image(s) uploaded!`
        );
      }

      const itemData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,

        weight_kg:
          formData.weight_kg || null,

        length_cm:
          formData.length_cm || null,

        width_cm:
          formData.width_cm || null,

        height_cm:
          formData.height_cm || null,

        donor_pays_shipping:
          formData.donor_pays_shipping,

        images: imageUrls,

        shipping_region:
          formData.donor_pays_shipping
            ? formData.shipping_region
            : null,

        exclude_countries:
          formData.donor_pays_shipping
            ? formData.exclude_countries
            : [],
      };

      toast.info(
        'Creating your listing...'
      );

      const response =
        await itemsAPI.create(
          itemData
        );

      toast.success(
        'Item listed successfully! 🎉'
      );

      navigate(
        `/item/${response.data.item.id}`
      );
    } catch (err) {
      console.error(
        'Error creating item:',
        err
      );

      toast.error(
        err.response?.data?.error ||
          'Failed to list item'
      );
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
    <div className="min-h-screen bg-ink-50/30 pb-20">

      {/* SAME CONTAINER AS EVERYTHING ELSE */}
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">

        {/* =================================================
            PAGE NAVIGATION
        ================================================= */}

        <PageNavigation />

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <motion.div
          initial={{
            opacity: 0,
            y: 12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.3,
          }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="bg-primary-50 p-2.5 rounded-lg border border-primary-100">
            <i className="bi bi-plus-lg text-primary-600 text-xl" />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] text-ink-900">
              List Your Item
            </h1>

            <p className="text-ink-500 text-sm">
              Give your item a second life
            </p>
          </div>
        </motion.div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* =================================================
              IMAGES
          ================================================= */}

          <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-ink-900 mb-4">
              Images
            </h3>

            <div className="border-2 border-dashed border-ink-200 rounded-lg p-8 hover:border-primary-300 transition-colors">
              <div className="text-center">

                <i className="bi bi-image text-4xl text-ink-300" />

                <p className="mt-2 text-sm text-ink-600">
                  Upload up to 5 images
                  (JPG, PNG, GIF, WEBP)
                </p>

                <p className="text-xs text-ink-400">
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
                  className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-lg text-sm font-bold transition cursor-pointer"
                >
                  <i className="bi bi-upload" />
                  Choose Images
                </label>
              </div>
            </div>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                {imagePreviews.map(
                  (preview, index) => (
                    <div
                      key={index}
                      className="relative group"
                    >
                      <img
                        src={preview}
                        alt={`Preview ${
                          index + 1
                        }`}
                        className="w-full h-24 object-cover rounded-lg border border-ink-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(index)
                        }
                        className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-rose-600 transition shadow-sm cursor-pointer"
                      >
                        <i className="bi bi-x" />
                      </button>

                      <span className="absolute bottom-1 right-1 bg-ink-900/50 text-white text-xs px-1 rounded">
                        {index + 1}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}

            {isSubmitting && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-ink-600">
                    Uploading...
                  </span>

                  <span className="text-sm font-medium text-ink-700">
                    {uploadProgress}%
                  </span>
                </div>

                <div className="w-full bg-ink-100 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-brand-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-ink-900 mb-4">
              Basic Information
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-bold text-ink-700 mb-1">
                Title *
              </label>

              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-ink-200 rounded-lg focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400"
                placeholder="e.g., iPhone 12 Pro Max"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-ink-700 mb-1">
                Description *
              </label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-ink-200 rounded-lg focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400"
                rows="4"
                placeholder="Describe your item in detail..."
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Select
                label="Category"
                value={formData.category}
                onChange={(value) =>
                  handleSelectChange(
                    'category',
                    value
                  )
                }
                options={ITEM_CATEGORIES}
                placeholder="Select Category"
                required
                searchable
                showIcon
              />

              <Select
                label="Condition"
                value={formData.condition}
                onChange={(value) =>
                  handleSelectChange(
                    'condition',
                    value
                  )
                }
                options={ITEM_CONDITIONS}
                placeholder="Select Condition"
                required
                searchable
                showIcon
              />
            </div>
          </div>

          {/* =================================================
              SHIPPING
          ================================================= */}

          <div className="bg-white rounded-xl border border-ink-100/80 shadow-sm p-6">
            <h3 className="text-lg font-extrabold text-ink-900 mb-4">
              Shipping Details
            </h3>

            {/* DIMENSIONS */}
            <div className="bg-ink-50/50 rounded-lg p-4 mb-4 border border-ink-100/60">
              <label className="block text-sm font-bold text-ink-700 mb-2">
                Item Dimensions (Optional)
              </label>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                {[
                  ['weight_kg', 'Weight (kg)', '2.5'],
                  ['length_cm', 'Length (cm)', '30'],
                  ['width_cm', 'Width (cm)', '20'],
                  ['height_cm', 'Height (cm)', '15'],
                ].map(
                  ([name, label, placeholder]) => (
                    <div key={name}>
                      <label className="text-xs font-medium text-ink-500">
                        {label}
                      </label>

                      <input
                        type="number"
                        name={name}
                        value={
                          formData[name]
                        }
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm text-ink-900 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition"
                        placeholder={
                          placeholder
                        }
                        step={
                          name ===
                          'weight_kg'
                            ? '0.1'
                            : undefined
                        }
                        min="0"
                      />
                    </div>
                  )
                )}

              </div>
            </div>

            {/* WHO PAYS */}
            <div className="bg-white p-4 rounded-xl border border-ink-100/80 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <i
                  className={`bi bi-truck text-2xl ${
                    formData.donor_pays_shipping
                      ? 'text-primary-600'
                      : 'text-ink-400'
                  }`}
                />

                <div className="flex-1">
                  <label className="text-sm font-extrabold text-ink-700">
                    Who pays for shipping?
                  </label>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">

                <button
                  type="button"
                  onClick={() =>
                    handleShippingToggle(
                      true
                    )
                  }
                  className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                    formData.donor_pays_shipping
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-ink-200 hover:border-primary-200 text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <i className="bi bi-gift" />

                  <span className="font-extrabold">
                    I'll Pay
                  </span>

                  <span className="text-xs font-medium text-ink-500">
                    (Free for winner)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleShippingToggle(
                      false
                    )
                  }
                  className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                    !formData.donor_pays_shipping
                      ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-ink-200 hover:border-primary-200 text-ink-600 hover:bg-ink-50'
                  }`}
                >
                  <i className="bi bi-wallet" />

                  <span className="font-extrabold">
                    Winner Pays
                  </span>

                  <span className="text-xs font-medium text-ink-500">
                    (Free for you)
                  </span>
                </button>

              </div>

              <p className="text-xs font-medium text-ink-500 mt-3 flex items-center gap-1">
                <i className="bi bi-info-circle text-ink-400" />

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
                    onChange={
                      handleRegionChange
                    }
                    options={regionOptions}
                    placeholder="Select shipping region"
                    searchable
                    showIcon
                    showDescription
                  />
                </div>

                {/* EXCLUSIONS */}
                {selectedRegion && (
                  <div className="mt-4 bg-ink-50/50 rounded-lg p-4 border border-ink-100/60">
                    <label className="block text-sm font-bold text-ink-700 mb-2">
                      Exclude Countries
                      (Optional)
                    </label>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {SHIPPING_OPTIONS.find(
                        (opt) =>
                          opt.value ===
                          selectedRegion
                      )
                        ?.description?.split(
                          ', '
                        )
                        .map((country) => (
                          <label
                            key={country}
                            className="flex items-center gap-2 text-sm hover:bg-ink-100 p-1 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={excludedCountries.includes(
                                country
                              )}
                              onChange={() =>
                                handleExcludeToggle(
                                  country
                                )
                              }
                              className="rounded border-ink-300 text-primary-600 focus:ring-primary-500"
                            />

                            <span className="text-ink-700">
                              {country.trim()}
                            </span>
                          </label>
                        ))}
                    </div>

                    {excludedCountries.length >
                      0 && (
                      <div className="mt-2 text-xs text-ink-500">
                        <i className="bi bi-info-circle mr-1" />

                        {excludedCountries.length}{' '}
                        countries excluded
                      </div>
                    )}
                  </div>
                )}

                {/* ESTIMATE */}
                {selectedRegion &&
                  formData.weight_kg && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() =>
                          setShowShippingEstimate(
                            !showShippingEstimate
                          )
                        }
                        className="text-primary-600 hover:text-primary-700 font-bold flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <i
                          className={`bi bi-chevron-${
                            showShippingEstimate
                              ? 'up'
                              : 'down'
                          }`}
                        />

                        {showShippingEstimate
                          ? 'Hide'
                          : 'Show'}{' '}
                        Shipping Estimates
                      </button>

                      {showShippingEstimate && (
                        <ShippingEstimate
                          weight={
                            formData.weight_kg
                          }
                          dimensions={{
                            length:
                              formData.length_cm,
                            width:
                              formData.width_cm,
                            height:
                              formData.height_cm,
                          }}
                          fromCountry={
                            user?.profile
                              ?.country ||
                            'USA'
                          }
                          toRegion={
                            selectedRegion
                          }
                        />
                      )}
                    </div>
                  )}
              </>
            )}

            {/* WINNER PAYS INFO */}
            {!formData.donor_pays_shipping && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <i className="bi bi-info-circle text-primary-600 text-xl mt-0.5" />

                  <div>
                    <p className="text-sm font-bold text-primary-700">
                      Winner Pays Shipping
                    </p>

                    <p className="text-sm text-primary-600">
                      The winner will be responsible
                      for shipping costs. You don't
                      need to specify shipping regions.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              SUBMIT
          ================================================= */}

          <div className="flex gap-4 pt-4 border-t border-ink-100/80">

            <button
              type="submit"
              disabled={
                isSubmitting || loading
              }
              className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting || loading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />

                  {uploadProgress > 0 &&
                  uploadProgress < 100
                    ? `Uploading... ${uploadProgress}%`
                    : 'Listing...'}
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg" />
                  List Item
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="px-6 py-3 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-lg font-bold transition cursor-pointer"
            >
              Cancel
            </button>

          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateItemPage;