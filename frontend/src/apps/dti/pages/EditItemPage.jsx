import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DTI_BASE, makePaths } from "@/utils/routeBases";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Pencil,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  X,
  Image as ImageIcon,
  Upload,
  Truck,
  Gift,
  Wallet,
  Info,
  Check,
  AlertTriangle,
  Loader2,
  Globe,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { itemsAPI } from '@/services/api/dtiApi';
import Select from '@/reusables/Select';
import Modal from '@/reusables/Modal';

import {
  ITEM_CATEGORIES,
  SHIPPING_OPTIONS,
  ITEM_CONDITIONS,
  getStatusDisplay,
} from '@/utils/constants';

/* ============================================================
   STATUS ICON MAP
============================================================ */

const getStatusIconComponent = (status) => {
  switch (status) {
    case 'active':
      return CheckCircle2;
    case 'pending':
      return Clock;
    case 'completed':
      return CheckCircle2;
    case 'cancelled':
      return XCircle;
    default:
      return Circle;
  }
};

const getStatusBadgeClasses = (color) => {
  const map = {
    green: 'border-success-200 bg-success-50 text-success-700',
    yellow: 'border-warning-200 bg-warning-50 text-warning-700',
    blue: 'border-primary-200 bg-primary-50 text-primary-700',
    red: 'border-danger-200 bg-danger-50 text-danger-700',
  };
  return map[color] || 'border-ink-200 bg-ink-50 text-ink-600';
};

/* ============================================================
   SKELETON
============================================================ */

const EditItemSkeleton = () => (
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

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-ink-100"
              />
            ))}
          </div>

          <div className="mt-4 rounded-2xl border-2 border-dashed border-ink-200 p-8">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-ink-100" />
              <div className="h-4 w-40 animate-pulse rounded bg-ink-100" />
              <div className="mt-3 h-10 w-36 animate-pulse rounded-xl bg-ink-100" />
            </div>
          </div>
        </div>

        {/* BASIC INFO */}
        <div className="rounded-[26px] border border-ink-100 bg-white p-6 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded bg-ink-200" />

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 h-4 w-14 animate-pulse rounded bg-ink-200" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-ink-100" />
            </div>

            <div>
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-ink-200" />
              <div className="h-28 w-full animate-pulse rounded-xl bg-ink-100" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-16 animate-pulse rounded-xl bg-ink-100" />
              <div className="h-16 animate-pulse rounded-xl bg-ink-100" />
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
                  <div className="h-10 animate-pulse rounded-xl bg-ink-100" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-ink-100 bg-white p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-7 w-7 animate-pulse rounded-xl bg-ink-100" />
              <div className="h-5 w-44 animate-pulse rounded bg-ink-100" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-11 animate-pulse rounded-xl bg-ink-100" />
              <div className="h-11 animate-pulse rounded-xl bg-ink-100" />
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

/* ============================================================
   MAIN COMPONENT
============================================================ */

const EditItemPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { to } = makePaths(DTI_BASE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [item, setItem] = useState(null);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImages, setRemovedImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusChanging, setStatusChanging] = useState(false);

  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djda2nagd';
  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_ITEMS || 'donttrashit_items';

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
    status: 'active',
  });

  const [selectedRegion, setSelectedRegion] = useState('');
  const [excludedCountries, setExcludedCountries] = useState([]);

  /* Status options — icons as components, color as key */
  const statusOptions = useMemo(
    () => [
      { value: 'active', label: 'Active', icon: CheckCircle2, color: 'green' },
      { value: 'pending', label: 'Pending', icon: Clock, color: 'yellow' },
      {
        value: 'completed',
        label: 'Completed',
        icon: CheckCircle2,
        color: 'blue',
      },
      { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'red' },
    ],
    []
  );

  /* Region options */
  const regionOptions = useMemo(
    () => [
      { value: '', label: 'Anywhere', icon: Globe },
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

  const getCountriesFromRegion = (regionValue) => {
    const region = SHIPPING_OPTIONS.find((opt) => opt.value === regionValue);
    if (!region) return [];
    return region.description?.split(',').map((c) => c.trim()) || [];
  };

  /* ============================================================
     FETCH ITEM
  ============================================================ */

  const fetchItem = useCallback(async () => {
    if (!id || !user) return;

    setLoading(true);
    try {
      const response = await itemsAPI.getById(id);
      const data = response.data.item;

      if (data.donor_id !== user.id) {
        toast.error('You do not have permission to edit this item');
        navigate('/my-items');
        return;
      }

      setItem(data);

      const shippingRegions = data.shipping_regions || {};
      const shippingRegion = shippingRegions.region || '';
      const excludeCountries = shippingRegions.exclude || [];

      setFormData({
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        condition: data.condition || '',
        weight_kg: data.weight_kg || '',
        length_cm: data.length_cm || '',
        width_cm: data.width_cm || '',
        height_cm: data.height_cm || '',
        donor_pays_shipping: data.donor_pays_shipping || false,
        shipping_region: shippingRegion,
        exclude_countries: excludeCountries,
        status: data.status || 'active',
      });

      setSelectedRegion(shippingRegion);
      setExcludedCountries(excludeCountries);

      if (data.images && data.images.length > 0) {
        setExistingImages(data.images);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      toast.error('Failed to load item details');
      navigate('/my-items');
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  }, [id, user, navigate]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  /* ============================================================
     HANDLERS
  ============================================================ */

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    setFormData((prev) => ({ ...prev, exclude_countries: newExcludes }));
  };

  const handleShippingToggle = (value) => {
    setFormData((prev) => ({ ...prev, donor_pays_shipping: value }));
    if (!value) {
      setSelectedRegion('');
      setExcludedCountries([]);
      setFormData((prev) => ({
        ...prev,
        shipping_region: '',
        exclude_countries: [],
      }));
    }
  };

  /* ============================================================
     IMAGES
  ============================================================ */

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const totalImages = existingImages.length + images.length + files.length;

    if (totalImages > 5) {
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
      ...files.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removeExistingImage = (index) => {
    const imageToRemove = existingImages[index];
    setRemovedImages((prev) => [...prev, imageToRemove]);
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

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
        { method: 'POST', body: fd }
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

    return { success: true, urls: uploadedUrls };
  };

  /* ============================================================
     STATUS
  ============================================================ */

  const handleStatusChange = () => {
    setNewStatus(formData.status);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (newStatus === formData.status) {
      setShowStatusModal(false);
      setNewStatus('');
      return;
    }

    setStatusChanging(true);
    try {
      await itemsAPI.update(id, { status: newStatus });
      toast.success(`Item status updated to ${newStatus}`);
      setFormData((prev) => ({ ...prev, status: newStatus }));
      setShowStatusModal(false);
      setNewStatus('');
      await fetchItem();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setStatusChanging(false);
    }
  };

  /* ============================================================
     DELETE
  ============================================================ */

  const handleDelete = async () => {
    try {
      await itemsAPI.delete(id);
      toast.success('Item deleted successfully');
      navigate('/my-items');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete item');
    }
  };

  /* ============================================================
     SUBMIT
  ============================================================ */

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

    setSaving(true);
    setUploadProgress(0);

    try {
      let uploadedImageUrls = [];
      let allImages = [...existingImages];

      if (images.length > 0) {
        toast.info('Uploading images...');
        const uploadResult = await uploadImagesToCloudinary(images);

        if (!uploadResult.success) {
          toast.error(`Upload failed: ${uploadResult.error}`);
          setSaving(false);
          return;
        }

        uploadedImageUrls = uploadResult.urls;
        toast.success(`${uploadedImageUrls.length} image(s) uploaded!`);
      }

      if (removedImages.length > 0) {
        allImages = allImages.filter((url) => !removedImages.includes(url));
      }
      allImages = [...allImages, ...uploadedImageUrls];

      let shippingRegions = null;
      if (formData.donor_pays_shipping && formData.shipping_region) {
        shippingRegions = {
          region: formData.shipping_region,
          exclude: formData.exclude_countries || [],
        };
      }

      const updateData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        weight_kg: formData.weight_kg || null,
        length_cm: formData.length_cm || null,
        width_cm: formData.width_cm || null,
        height_cm: formData.height_cm || null,
        donor_pays_shipping: formData.donor_pays_shipping,
        images: allImages,
        status: formData.status,
        shipping_regions: shippingRegions,
      };

      toast.info('Updating your item...');
      await itemsAPI.update(id, updateData);
      toast.success('Item updated successfully! 🎉');
      navigate(to(`/item/${id}`));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update item');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  /* ============================================================
     LOADING
  ============================================================ */

  if (loading) return <EditItemSkeleton />;

  /* ============================================================
     NOT FOUND
  ============================================================ */

  if (!item) {
    return (
      <div className="min-h-full bg-transparent">

        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-dashed border-ink-200 bg-white px-6 py-12">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-warning-50 text-warning-600">
                <AlertTriangle size={27} />
              </div>

              <h2 className="mt-5 text-lg font-black text-ink-950">
                Item not found
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-ink-500">
                The item you're looking for doesn't exist or you lack
                permission.
              </p>

              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/my-items')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700"
                >
                  Back to My Items
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================
     DERIVED
  ============================================================ */

  const currentStatusDisplay = getStatusDisplay(formData.status);
  const CurrentStatusIcon = getStatusIconComponent(formData.status);
  const currentStatusClasses = getStatusBadgeClasses(
    currentStatusDisplay?.color
  );

  /* ============================================================
     RENDER
  ============================================================ */

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
                <Pencil size={14} strokeWidth={2.5} />
                <span>Edit listing</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
                Edit Item
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-ink-500">
                Update your item details.
              </p>
            </div>

            {/* Status + actions */}
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${currentStatusClasses}`}
              >
                <CurrentStatusIcon size={11} />
                {currentStatusDisplay?.label || formData.status}
              </span>

              <button
                type="button"
                onClick={handleStatusChange}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-primary-200 bg-primary-50 px-3 text-xs font-extrabold text-primary-700 transition hover:bg-primary-100"
              >
                <RefreshCw size={12} />
                Change Status
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-danger-200 bg-danger-50 px-3 text-xs font-extrabold text-danger-700 transition hover:bg-danger-100"
              >
                <Trash2 size={12} />
                Delete
              </button>
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

            {/* CURRENT IMAGES */}
            {existingImages.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  Current Images
                </p>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                  {existingImages.map((image, index) => (
                    <div key={index} className="group relative">
                      <img
                        src={image}
                        alt=""
                        className="h-24 w-full rounded-xl border border-ink-100 object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeExistingImage(index)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-white shadow-sm transition hover:bg-danger-600"
                        aria-label="Remove image"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NEW IMAGES */}
            {imagePreviews.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-ink-500">
                  New Images
                </p>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="group relative">
                      <img
                        src={preview}
                        alt=""
                        className="h-24 w-full rounded-xl border border-ink-100 object-cover"
                      />

                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-danger-500 text-white shadow-sm transition hover:bg-danger-600"
                        aria-label="Remove image"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PROGRESS */}
            {saving && uploadProgress > 0 && uploadProgress < 100 && (
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

            {/* UPLOAD DROPZONE */}
            {existingImages.length + images.length < 5 && (
              <div
                className={`rounded-2xl border-2 border-dashed border-ink-300 p-8 transition-colors hover:border-primary-300 ${
                  existingImages.length > 0 || images.length > 0
                    ? 'mt-4'
                    : 'mt-4'
                }`}
              >
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
                    <ImageIcon size={22} />
                  </div>

                  <p className="mt-3 text-sm font-bold text-ink-600">
                    Add more images (max 5 total)
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
                  ['weight_kg', 'Weight (kg)'],
                  ['length_cm', 'Length (cm)'],
                  ['width_cm', 'Width (cm)'],
                  ['height_cm', 'Height (cm)'],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label className="mb-1 block text-[11px] font-bold text-ink-500">
                      {label}
                    </label>

                    <input
                      type="number"
                      name={name}
                      value={formData[name]}
                      onChange={handleChange}
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
                      {getCountriesFromRegion(selectedRegion).map((country) => (
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
                            {country}
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
                    The winner will be responsible for shipping costs.
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
              onClick={() => navigate(to(`/item/${id}`))}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-5 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />

                  {uploadProgress > 0 && uploadProgress < 100
                    ? `Uploading... ${uploadProgress}%`
                    : 'Saving...'}
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* =================================================
          STATUS MODAL
      ================================================= */}

      <Modal
        isOpen={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setNewStatus('');
        }}
        title="Change Status"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-ink-500">
            Update status for{' '}
            <span className="font-extrabold text-ink-800">
              "{item?.title}"
            </span>
          </p>

          <div className="space-y-2">
            {statusOptions.map((status) => {
              const isSelected = newStatus === status.value;
              const isCurrent = formData.status === status.value;
              const StatusIcon = status.icon;

              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => setNewStatus(status.value)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? 'border-primary-200 bg-primary-50 text-primary-700'
                      : isCurrent
                      ? 'border-ink-100 bg-ink-50/60 text-ink-600'
                      : 'border-transparent text-ink-700 hover:bg-ink-50'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isSelected
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'bg-white text-ink-400'
                    }`}
                  >
                    <StatusIcon size={15} />
                  </span>

                  <span className="text-sm font-extrabold">
                    {status.label}
                    {isCurrent && !isSelected && (
                      <span className="ml-2 text-[10px] font-bold text-ink-400">
                        (current)
                      </span>
                    )}
                  </span>

                  {isSelected && (
                    <CheckCircle2
                      size={15}
                      className="ml-auto text-primary-600"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setShowStatusModal(false);
                setNewStatus('');
              }}
              disabled={statusChanging}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={confirmStatusChange}
              disabled={statusChanging || !newStatus}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-extrabold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusChanging ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Updating...
                </>
              ) : newStatus === formData.status ? (
                'Close'
              ) : (
                <>
                  <Check size={16} />
                  Update Status
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Item"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4 rounded-2xl border border-danger-100 bg-danger-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-100 text-danger-600">
              <AlertTriangle size={18} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold text-danger-900">
                Delete this item?
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-danger-700">
                Are you sure you want to delete{' '}
                <strong>"{item?.title}"</strong>? This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-extrabold text-ink-700 transition hover:bg-ink-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 text-sm font-extrabold text-white transition hover:bg-danger-700"
            >
              <Trash2 size={16} />
              Delete Item
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EditItemPage;