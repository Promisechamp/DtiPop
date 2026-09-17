import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});




/**
 * Extract public ID from Cloudinary URL
 * Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/donttrashit/profiles/image_id.jpg
 * Extracted public ID: donttrashit/profiles/image_id
 */

export const extractPublicId = (url) => {
  if (!url) return null;
  
  try {
    // If it's not a Cloudinary URL, return as-is
    if (!url.includes('cloudinary')) {
      return url;
    }
    
    // Split the URL
    const parts = url.split('/');
    
    // Find the 'upload' index
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) {
      console.warn('⚠️ No "upload" found in URL:', url);
      return null;
    }
    
    // Get the filename (last part)
    const filename = parts[parts.length - 1];
    // Remove file extension
    const publicId = filename.split('.')[0];
    
    // Get the folder path (between 'upload' and filename)
    // Skip the 'upload' and the version number (v1234567890)
    const folderParts = parts.slice(uploadIndex + 2, parts.length - 1);
    const folderPath = folderParts.join('/');
    
    // Return the full public ID with folder path
    return folderPath ? `${folderPath}/${publicId}` : publicId;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};



/**
 * Delete a single image from Cloudinary
 */
export const deleteImage = async (publicId) => {
  try {
    if (!publicId) {
      console.warn('⚠️ No public ID provided for deletion');
      return { success: false, error: 'No public ID provided' };
    }
    
    console.log(`🗑️ Attempting to delete: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      console.log(`✅ Deleted image: ${publicId}`);
      return { success: true, result };
    } else {
      console.warn(`⚠️ Failed to delete image ${publicId}:`, result);
      return { success: false, error: result.result, result };
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete multiple images from Cloudinary
 */
export const deleteMultipleImages = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) {
    return { success: true, deleted: 0, failed: 0 };
  }

  console.log(`🗑️ Deleting ${publicIds.length} images from Cloudinary...`);
  
  try {
    const results = await Promise.all(
      publicIds.map(async (publicId) => {
        if (!publicId) {
          return { publicId, success: false, error: 'No public ID provided' };
        }
        
        try {
          const result = await cloudinary.uploader.destroy(publicId);
          
          if (result.result === 'ok') {
            return { publicId, success: true };
          } else {
            return { publicId, success: false, error: result.result };
          }
        } catch (error) {
          console.error(`❌ Failed to delete ${publicId}:`, error);
          return { publicId, success: false, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`🗑️ Deletion complete: ${successful.length} successful, ${failed.length} failed`);

    return {
      success: failed.length === 0,
      deleted: successful.length,
      failed: failed.length,
      results: results
    };
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Smart cleanup - checks image count and uses appropriate delete function
 */
export const cleanupImages = async (imageUrls) => {
  if (!imageUrls || imageUrls.length === 0) {
    return { success: true, message: 'No images to clean up' };
  }
  
  console.log(`🧹 Starting cleanup of ${imageUrls.length} image(s)...`);
  
  try {
    // Extract public IDs from URLs
    const publicIds = imageUrls
      .map(url => extractPublicId(url))
      .filter(id => id !== null);
    
    if (publicIds.length === 0) {
      console.warn('⚠️ No valid public IDs found to clean up');
      return { success: true, message: 'No valid public IDs found' };
    }
    
    console.log(`📋 Cleaning up public IDs:`, publicIds);
    
    // ✅ Smart: Use appropriate function based on count
    let result;
    if (publicIds.length === 1) {
      // Use single delete for one image
      const deleteResult = await deleteImage(publicIds[0]);
      result = {
        success: deleteResult.success,
        deleted: deleteResult.success ? 1 : 0,
        failed: deleteResult.success ? 0 : 1,
        results: [deleteResult]
      };
    } else {
      // Use batch delete for multiple images
      result = await deleteMultipleImages(publicIds);
    }
    
    if (result.success) {
      console.log(`✅ Cleanup completed: ${result.deleted} image(s) deleted`);
    } else {
      console.warn(`⚠️ Cleanup partially completed: ${result.deleted} deleted, ${result.failed} failed`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { success: false, error: error.message };
  }
};




/**
 * Upload a file to Cloudinary
 */
export const uploadToCloudinary = async (file, folder = 'POP/uploads', options = {}) => {
  try {
    if (!file) {
      throw new Error('No file provided for upload');
    }

    console.log(`📤 Uploading to Cloudinary: ${folder}`);

    let uploadData;
    if (Buffer.isBuffer(file)) {
      const base64String = file.toString('base64');
      uploadData = `data:image/jpeg;base64,${base64String}`;
    } else if (typeof file === 'string' && file.startsWith('data:image')) {
      uploadData = file;
    } else if (typeof file === 'string') {
      uploadData = `data:image/jpeg;base64,${file}`;
    } else {
      throw new Error('Unsupported file format. Expected Buffer or base64 string.');
    }

    const result = await cloudinary.uploader.upload(uploadData, {
      folder: folder,
      resource_type: options.resourceType || 'auto',
      transformation: options.transformation || [],
      format: options.format || null,
      public_id: options.publicId || null,
      overwrite: options.overwrite || true,
      invalidate: options.invalidate || false,
      ...options,
    });

    console.log(`✅ Upload successful: ${result.secure_url}`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      resourceType: result.resource_type,
      createdAt: result.created_at,
      originalFilename: result.original_filename,
      version: result.version,
    };
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
};

/**
 * Upload multiple files to Cloudinary
 */
export const uploadMultipleToCloudinary = async (files, folder = 'POP/uploads', options = {}) => {
  if (!files || files.length === 0) {
    return [];
  }

  console.log(`📤 Uploading ${files.length} files to Cloudinary: ${folder}`);

  try {
    const uploadPromises = files.map((file, index) => {
      return uploadToCloudinary(file, folder, {
        ...options,
        publicId: options.publicId ? `${options.publicId}_${index}` : undefined,
      });
    });

    const results = await Promise.all(uploadPromises);
    console.log(`✅ All ${results.length} files uploaded successfully`);
    return results;
  } catch (error) {
    console.error('❌ Multiple upload error:', error);
    throw new Error(`Failed to upload files to Cloudinary: ${error.message}`);
  }
};

/**
 * Upload a file with retry logic
 */
export const uploadToCloudinaryWithRetry = async (file, folder = 'POP/uploads', options = {}, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Upload attempt ${attempt}/${maxRetries} to ${folder}`);
      const result = await uploadToCloudinary(file, folder, options);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Upload attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};



// ✅ Keep this for backward compatibility
export const cleanupUploadedImages = cleanupImages;

export default cloudinary;