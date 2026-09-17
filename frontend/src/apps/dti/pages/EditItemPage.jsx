import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { itemsAPI } from '@/services/api/dtiApi';
import Select from '@/reusables/Select';
import Modal from '@/reusables/Modal';
import { PageNavigation, PageNavigationSkeleton } from '@/reusables/PageNavigation';
import { ITEM_CATEGORIES, SHIPPING_OPTIONS, ITEM_CONDITIONS, getStatusDisplay } from '@/utils/constants';

// ============================================
// Skeleton (Unified design)
// ============================================
const EditItemSkeleton = () => (
  <div className="min-h-screen bg-ink-50/30">
    <div className="mt-10 mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8">
      <PageNavigation />
      <div className="mt-10 space-y-6">
        <div className="animate-pulse flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-ink-200"></div>
          <div>
            <div className="h-8 w-48 bg-ink-200 rounded"></div>
            <div className="h-4 w-64 bg-ink-200 rounded mt-2"></div>
          </div>
        </div>

        {/* Image section */}
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6">
          <div className="h-6 w-24 bg-ink-200 rounded mb-4"></div>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-ink-200 rounded-xl"></div>
            ))}
          </div>
          <div className="border-2 border-dashed border-ink-200 rounded-xl p-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-ink-200"></div>
              <div className="h-4 w-40 bg-ink-200 rounded"></div>
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6">
          <div className="h-6 w-32 bg-ink-200 rounded mb-4"></div>
          <div className="space-y-4">
            <div className="h-10 w-full bg-ink-200 rounded"></div>
            <div className="h-24 w-full bg-ink-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-10 bg-ink-200 rounded"></div>
              <div className="h-10 bg-ink-200 rounded"></div>
            </div>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6">
          <div className="h-6 w-32 bg-ink-200 rounded mb-4"></div>
          <div className="h-20 bg-ink-200 rounded"></div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <div className="flex-1 h-12 bg-ink-200 rounded-xl"></div>
          <div className="w-32 h-12 bg-ink-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// Main Component
// ============================================
const EditItemPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'djda2nagd';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET_ITEMS || 'donttrashit_items';

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

  // Status options with icons/colors
  const statusOptions = [
    { value: 'active', label: 'Active', icon: 'bi-check-circle', color: 'green' },
    { value: 'pending', label: 'Pending', icon: 'bi-clock', color: 'yellow' },
    { value: 'completed', label: 'Completed', icon: 'bi-check-circle-fill', color: 'blue' },
    { value: 'cancelled', label: 'Cancelled', icon: 'bi-x-circle', color: 'red' },
  ];

  // Region options
  const regionOptions = useMemo(() => [
    { value: '', label: 'Anywhere', icon: 'bi-globe' },
    ...SHIPPING_OPTIONS.map(option => ({
      value: option.value,
      label: option.label,
      description: option.description,
      icon: option.icon,
      color: option.color,
    })),
  ], []);

  const getCountriesFromRegion = (regionValue) => {
    const region = SHIPPING_OPTIONS.find(opt => opt.value === regionValue);
    if (!region) return [];
    return region.description?.split(',').map(c => c.trim()) || [];
  };

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

    // Extract shipping region data from the shipping_regions JSONB column
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



  useEffect(() => { fetchItem(); }, [fetchItem]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    setExcludedCountries([]);
    setFormData(prev => ({ ...prev, shipping_region: region, exclude_countries: [] }));
  };

  const handleExcludeToggle = (country) => {
    const newExcludes = excludedCountries.includes(country)
      ? excludedCountries.filter(c => c !== country)
      : [...excludedCountries, country];
    setExcludedCountries(newExcludes);
    setFormData(prev => ({ ...prev, exclude_countries: newExcludes }));
  };

  const handleShippingToggle = (value) => {
    setFormData(prev => ({ ...prev, donor_pays_shipping: value }));
    if (!value) {
      setSelectedRegion('');
      setExcludedCountries([]);
      setFormData(prev => ({ ...prev, shipping_region: '', exclude_countries: [] }));
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const totalImages = existingImages.length + images.length + files.length;
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast.error('Each image must be less than 5MB');
      return;
    }
    const invalidTypes = files.filter(file =>
      !['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)
    );
    if (invalidTypes.length > 0) {
      toast.error('Only JPG, PNG, GIF, and WEBP images are allowed');
      return;
    }
    setImages(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeExistingImage = (index) => {
    const imageToRemove = existingImages[index];
    setRemovedImages(prev => [...prev, imageToRemove]);
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: fd });
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
      setFormData(prev => ({ ...prev, status: newStatus }));
      setShowStatusModal(false);
      setNewStatus('');
      await fetchItem();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setStatusChanging(false);
    }
  };

  const handleDelete = async () => {
    try {
      await itemsAPI.delete(id);
      toast.success('Item deleted successfully');
      navigate('/my-items');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.category || !formData.condition) {
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
        allImages = allImages.filter(url => !removedImages.includes(url));
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
      navigate(`/item/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update item');
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  if (loading) return <EditItemSkeleton />;
  if (!item) {
    return (
      <div className="min-h-screen bg-ink-50/30 flex items-center justify-center px-4">
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-6xl text-ink-300"></i>
          <h2 className="text-2xl font-bold text-ink-700 mt-4">Item Not Found</h2>
          <button onClick={() => navigate('/my-items')} className="mt-4 px-6 py-2 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-bold transition">
            Back to My Items
          </button>
        </div>
      </div>
    );
  }

  const currentStatusDisplay = getStatusDisplay(formData.status);

  return (
    <div className="min-h-screen bg-ink-50/30 pb-20 mt-10">
      <div className="mx-auto max-w-7xl px-2 py-8 sm:px-6 lg:px-8">
        <PageNavigation />
        <div className="mt-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
            <div className="bg-primary-50 border border-primary-100 p-2.5 rounded-xl">
              <i className="bi bi-pencil-square text-primary-600 text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-[-0.03em] text-ink-900">Edit Item</h1>
              <p className="text-ink-500 text-sm">Update your item details</p>
            </div>
          </motion.div>

          {/* Status bar */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
              currentStatusDisplay?.color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              currentStatusDisplay?.color === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-200' :
              currentStatusDisplay?.color === 'blue' ? 'bg-sky-50 text-sky-700 border-sky-200' :
              currentStatusDisplay?.color === 'red' ? 'bg-rose-50 text-rose-700 border-rose-200' :
              'bg-ink-50 text-ink-600 border-ink-200'
            }`}>
              <i className={`bi ${currentStatusDisplay?.icon || 'bi-circle'} text-[10px]`}></i>
              {currentStatusDisplay?.label || formData.status}
            </span>
            <button onClick={handleStatusChange} className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
              <i className="bi bi-arrow-right-circle"></i>
              Change Status
            </button>
            <button onClick={() => setShowDeleteModal(true)} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
              <i className="bi bi-trash"></i>
              Delete
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Images */}
            <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6">
              <h3 className="text-lg font-extrabold text-ink-900 mb-4">Images</h3>

              {existingImages.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-2">Current Images</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {existingImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <img src={image} alt="" className="w-full h-24 object-cover rounded-xl border border-ink-100" />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-rose-600 transition shadow-sm"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imagePreviews.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-ink-500 uppercase tracking-wide mb-2">New Images</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img src={preview} alt="" className="w-full h-24 object-cover rounded-xl border border-ink-100" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-rose-600 transition shadow-sm"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(saving && uploadProgress > 0 && uploadProgress < 100) && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-ink-600">Uploading...</span>
                    <span className="text-sm font-bold text-ink-700">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-ink-100 rounded-full h-2">
                    <div className="bg-gradient-to-r from-primary-500 to-brand-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {existingImages.length + images.length < 5 && (
                <div className={`border-2 border-dashed border-ink-200 rounded-xl p-6 hover:border-primary-300 transition-colors ${(existingImages.length > 0 || images.length > 0) ? 'mt-4' : ''}`}>
                  <div className="text-center">
                    <i className="bi bi-image text-4xl text-ink-300"></i>
                    <p className="mt-2 text-sm text-ink-600">Add more images (max 5 total)</p>
                    <p className="text-xs text-ink-400">Max 5MB each</p>
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" id="image-upload" />
                    <label htmlFor="image-upload" className="inline-flex items-center gap-2 mt-3 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl text-sm font-bold transition cursor-pointer">
                      <i className="bi bi-upload"></i>
                      Choose Images
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6">
              <h3 className="text-lg font-extrabold text-ink-900 mb-4">Basic Information</h3>
              <div className="mb-4">
                <label className="block text-sm font-bold text-ink-700 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold text-ink-700 mb-1">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-2.5 border border-ink-200 rounded-xl focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition text-sm text-ink-900 placeholder:text-ink-400"
                  required
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
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

            {/* Shipping Details */}
            <div className="bg-white rounded-2xl border border-ink-100/80 shadow-sm p-6">
              <h3 className="text-lg font-extrabold text-ink-900 mb-4">Shipping Details</h3>
              <div className="bg-ink-50/50 rounded-xl p-4 mb-4 border border-ink-100/60">
                <label className="block text-sm font-bold text-ink-700 mb-2">Item Dimensions (Optional)</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs font-medium text-ink-500">Weight (kg)</label>
                    <input type="number" name="weight_kg" value={formData.weight_kg} onChange={handleChange} className="w-full px-3 py-2 border border-ink-200 rounded-xl text-sm text-ink-900 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition" step="0.1" min="0" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-500">Length (cm)</label>
                    <input type="number" name="length_cm" value={formData.length_cm} onChange={handleChange} className="w-full px-3 py-2 border border-ink-200 rounded-xl text-sm text-ink-900 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition" min="0" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-500">Width (cm)</label>
                    <input type="number" name="width_cm" value={formData.width_cm} onChange={handleChange} className="w-full px-3 py-2 border border-ink-200 rounded-xl text-sm text-ink-900 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition" min="0" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-500">Height (cm)</label>
                    <input type="number" name="height_cm" value={formData.height_cm} onChange={handleChange} className="w-full px-3 py-2 border border-ink-200 rounded-xl text-sm text-ink-900 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 outline-none transition" min="0" />
                  </div>
                </div>
              </div>

              {/* Inline Shipping Toggle (replaces ShippingToggle component) */}
              <div className="bg-white p-4 rounded-2xl border border-ink-100/80 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <i className={`bi bi-truck text-2xl ${formData.donor_pays_shipping ? 'text-primary-600' : 'text-ink-400'}`}></i>
                  <div className="flex-1">
                    <label className="text-sm font-extrabold text-ink-700 cursor-pointer">
                      Who pays for shipping?
                    </label>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => handleShippingToggle(true)}
                    className={`flex-1 px-3 py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                      formData.donor_pays_shipping
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                        : 'border-ink-200 hover:border-ink-300 text-ink-600 hover:bg-ink-50'
                    }`}
                  >
                    <i className="bi bi-gift"></i>
                    <span className="font-extrabold">I'll Pay</span>
                    <span className="text-xs font-medium text-ink-500">(Free for winner)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShippingToggle(false)}
                    className={`flex-1 px-3 py-2 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold ${
                      !formData.donor_pays_shipping
                        ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                        : 'border-ink-200 hover:border-ink-300 text-ink-600 hover:bg-ink-50'
                    }`}
                  >
                    <i className="bi bi-wallet"></i>
                    <span className="font-extrabold">Winner Pays</span>
                    <span className="text-xs font-medium text-ink-500">(Free for you)</span>
                  </button>
                </div>

                <p className="text-xs font-medium text-ink-500 mt-3 flex items-center gap-1">
                  <i className="bi bi-info-circle text-ink-400"></i>
                  {formData.donor_pays_shipping
                    ? 'You will cover shipping costs. Choose which regions you want to ship to.'
                    : 'The winner will pay for shipping. You don\'t need to specify shipping regions.'
                  }
                </p>
              </div>

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
                  {selectedRegion && (
                    <div className="mt-4 bg-ink-50/50 rounded-xl p-4 border border-ink-100/60">
                      <label className="block text-sm font-bold text-ink-700 mb-2">Exclude Countries (Optional)</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {getCountriesFromRegion(selectedRegion).map((country) => (
                          <label key={country} className="flex items-center gap-2 text-sm hover:bg-ink-100 p-1 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={excludedCountries.includes(country)}
                              onChange={() => handleExcludeToggle(country)}
                              className="rounded border-ink-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-ink-700">{country}</span>
                          </label>
                        ))}
                      </div>
                      {excludedCountries.length > 0 && (
                        <div className="mt-2 text-xs text-ink-500">
                          <i className="bi bi-info-circle mr-1"></i>
                          {excludedCountries.length} countries excluded
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {!formData.donor_pays_shipping && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mt-4">
                  <div className="flex items-start gap-3">
                    <i className="bi bi-info-circle text-primary-600 text-xl mt-0.5"></i>
                    <div>
                      <p className="text-sm font-bold text-primary-700">Winner Pays Shipping</p>
                      <p className="text-sm text-primary-600">The winner will be responsible for shipping costs.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4 border-t border-ink-100/80">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                    {uploadProgress > 0 && uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Saving...'}
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg"></i> Save Changes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/item/${id}`)}
                className="px-6 py-3 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Status Change Modal */}
      <Modal isOpen={showStatusModal} onClose={() => { setShowStatusModal(false); setNewStatus(''); }} title="Change Status" size="sm">
        <p className="text-sm text-ink-500 mb-4">Update status for "<span className="font-extrabold text-ink-900">{item?.title}</span>"</p>
        <div className="space-y-2">
          {statusOptions.map((status) => {
            const isSelected = newStatus === status.value;
            const isCurrent = formData.status === status.value;
            return (
              <button
                key={status.value}
                onClick={() => setNewStatus(status.value)}
                className={`w-full text-left px-4 py-3 rounded-xl transition border-2 flex items-center gap-3 ${
                  isSelected ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' :
                  isCurrent ? 'bg-ink-50 border-ink-200 text-ink-600' :
                  'hover:bg-ink-50 border-transparent text-ink-700'
                }`}
              >
                <i className={`bi ${status.icon}`}></i>
                <span className="font-bold">{status.label}{isCurrent && !isSelected && <span className="text-xs text-ink-400 ml-2">(current)</span>}</span>
                {isSelected && <i className="bi bi-check-circle-fill text-primary-600 ml-auto"></i>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => { setShowStatusModal(false); setNewStatus(''); }} className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition">Cancel</button>
          <button onClick={confirmStatusChange} disabled={statusChanging || !newStatus} className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-brand-600 hover:shadow-md text-white rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50">
            {statusChanging ? <><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> Updating...</> : newStatus === formData.status ? 'Close' : 'Update Status'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Item" size="sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
            <i className="bi bi-exclamation-triangle text-rose-600 text-2xl"></i>
          </div>
          <div>
            <p className="text-sm text-ink-600">Are you sure you want to delete "<span className="font-extrabold text-ink-900">{item?.title}</span>"?</p>
            <p className="text-sm text-ink-500 mt-1">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-xl font-bold transition">Cancel</button>
          <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-red-600 hover:shadow-md text-white rounded-xl font-bold transition">Delete</button>
        </div>
      </Modal>
    </div>
  );
};

export default EditItemPage;