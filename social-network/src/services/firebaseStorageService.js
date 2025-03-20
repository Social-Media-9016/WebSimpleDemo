import { storage, STORAGE_BUCKET_NAME } from '../config/firebase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable
} from 'firebase/storage';
import { getAuth, getIdToken } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique image ID
 * @returns {string} Unique ID
 */
export const generateImageId = () => {
  return uuidv4();
};

/**
 * Check if the user is authenticated
 * @returns {boolean} Whether user is logged in
 */
const isUserAuthenticated = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    console.error("Not logged in, cannot upload file");
    return false;
  }
  console.log("Current user is logged in:", user.uid);
  return true;
};

/**
 * Refresh the current user's authentication token
 * This helps resolve CORS issues as the new token will be attached to requests
 * @returns {Promise<string|null>} Returns new token or null (if user not logged in)
 */
const refreshAuthToken = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log("User not logged in, cannot refresh token");
      return null;
    }
    
    // Force token refresh
    const token = await getIdToken(user, true);
    console.log("Authentication token refreshed", token.substring(0, 10) + "...");
    return token;
  } catch (error) {
    console.error("Failed to refresh authentication token:", error);
    return null;
  }
};

/**
 * Simple image upload version - Try this method if you encounter CORS issues
 * @param {File} file - Image file to upload
 * @param {string} type - Content type ('posts' or 'comments')
 * @param {string} userId - Uploader's user ID
 * @returns {Promise<{path: string, url: string}>} Saved image path and URL
 */
export const uploadImageToStorageSimple = async (file, type, userId) => {
  if (!file) return null;
  
  // Check if user is logged in
  if (!isUserAuthenticated()) {
    throw new Error("User not logged in, cannot upload file");
  }
  
  try {
    // Refresh token
    await refreshAuthToken();
    
    // Generate unique image ID
    const imageId = generateImageId();
    const extension = file.name.split('.').pop();
    const fileName = `${userId}_${imageId}.${extension}`;
    
    // Create Firebase Storage reference path - try different path formats
    const storagePath = `uploads/${type}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    console.log(`Starting simple image upload...`);
    console.log(`Storage path: ${storagePath}`);
    
    // Prepare metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        originalName: file.name,
        uploadTime: new Date().toISOString()
      }
    };
    
    // Use the simple upload method with metadata
    await uploadBytes(storageRef, file, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log(`Image upload successful!`);
    console.log(`Firebase Storage Path: ${storagePath}`);
    console.log(`Firebase Storage URL: ${downloadURL}`);
    
    // Return path and URL
    return {
      path: storagePath,
      url: downloadURL
    };
  } catch (error) {
    console.error('Simple image upload failed:', error);
    
    // Provide more detailed error information
    if (error.code === 'storage/unauthorized') {
      console.error('Storage permission error: Please check Firebase Storage rules');
    } else if (error.message && error.message.includes('CORS')) {
      console.error('CORS error: Please ensure CORS settings are configured correctly');
    }
    
    throw error;
  }
};

/**
 * Form-based upload version - Try a different upload method to bypass CORS restrictions
 * @param {File} file - Image file to upload
 * @param {string} type - Content type ('posts' or 'comments')
 * @param {string} userId - Uploader's user ID
 * @returns {Promise<{path: string, url: string}>} Saved image path and URL
 */
export const uploadImageToStorageFormBased = async (file, type, userId) => {
  if (!file) return null;
  
  // Check if user is logged in
  if (!isUserAuthenticated()) {
    throw new Error("User not logged in, cannot upload file");
  }
  
  try {
    // Refresh token
    const token = await refreshAuthToken();
    if (!token) {
      throw new Error("Unable to get authentication token");
    }
    
    // Get storage bucket name from firebase config
    const bucketName = STORAGE_BUCKET_NAME;
    console.log("Storage bucket name:", bucketName);
    
    // Generate unique image ID
    const imageId = generateImageId();
    const extension = file.name.split('.').pop();
    const fileName = `${userId}_${imageId}.${extension}`;
    const storagePath = `uploads/${type}/${fileName}`;
    
    console.log("Trying form-based upload method...");
    console.log(`Filename: ${fileName}`);
    console.log(`Path: ${storagePath}`);
    
    // Create FormData object
    const formData = new FormData();
    formData.append('file', file);
    
    // Build upload URL with authentication token
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodeURIComponent(storagePath)}&uploadType=media&token=${token}`;
    console.log(`Upload URL: ${uploadUrl.substring(0, 100)}...`);
    
    // Use fetch API for direct upload
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': file.type
      },
      body: file,
      mode: 'cors',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log("Upload successful, response:", data);
    
    // Build download URL
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media`;
    
    return {
      path: storagePath,
      url: downloadURL
    };
  } catch (error) {
    console.error("Form-based upload failed:", error);
    throw error;
  }
};

/**
 * Use resumable upload to upload image to Firebase Storage
 * This method is more reliable, can avoid some CORS issues, and supports progress callbacks
 * @param {File} file - Image file to upload
 * @param {string} type - Content type ('posts' or 'comments')
 * @param {string} userId - Uploader's user ID
 * @param {Function} progressCallback - Progress callback function
 * @returns {Promise<{path: string, url: string}>} Saved image path and URL
 */
export const uploadImageToStorage = async (file, type, userId, progressCallback = null) => {
  // If file is empty, return null
  if (!file) return null;
  
  // Check if user is logged in
  if (!isUserAuthenticated()) {
    throw new Error("User not logged in, cannot upload file");
  }
  
  try {
    // 1. Try form-based upload method
    try {
      console.log("Trying form-based upload method...");
      return await uploadImageToStorageFormBased(file, type, userId);
    } catch (formError) {
      console.warn("Form-based upload failed, trying simple upload method:", formError);
    }
    
    // 2. Try simple upload method
    try {
      console.log("Trying simple upload method...");
      return await uploadImageToStorageSimple(file, type, userId);
    } catch (simpleError) {
      console.warn("Simple upload failed, trying resumable upload method:", simpleError);
      // Continue with resumable upload method
    }
    
    // 2. Refresh authentication token to avoid CORS issues
    await refreshAuthToken();
    
    // 3. Generate unique image ID
    const imageId = generateImageId();
    const extension = file.name.split('.').pop();
    const fileName = `${userId}_${imageId}.${extension}`;
    
    // 4. Create Firebase Storage reference path
    const storagePath = `uploads/${type}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    console.log(`Starting resumable image upload...`);
    console.log(`User ID: ${userId}`);
    console.log(`Storage path: ${storagePath}`);
    
    // 5. Prepare metadata
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        originalName: file.name,
        uploadTime: new Date().toISOString()
      }
    };
    
    // 6. Create resumable upload task
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    
    // 7. Return a Promise that resolves when upload completes
    return new Promise((resolve, reject) => {
      // Monitor upload progress
      uploadTask.on('state_changed', 
        // Progress callback
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(2)}%`);
          
          if (progressCallback && typeof progressCallback === 'function') {
            progressCallback(progress);
          }
        },
        // Error callback
        (error) => {
          console.error("Error during upload:", error);
          
          // Check if it's a CORS error
          if (error.code === 'storage/unauthorized' || error.message.includes('CORS')) {
            console.error("Possible CORS policy issue, please check storage bucket CORS settings in Firebase console.");
          }
          
          reject(error);
        },
        // Completion callback
        async () => {
          try {
            // Get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            console.log(`Image upload successful!`);
            console.log(`Firebase Storage Path: ${storagePath}`);
            console.log(`Firebase Storage URL: ${downloadURL}`);
            
            // Return path and URL
            resolve({
              path: storagePath,
              url: downloadURL
            });
          } catch (urlError) {
            console.error("Error getting download URL:", urlError);
            reject(urlError);
          }
        }
      );
    });
  } catch (error) {
    console.error('Image upload failed:', error);
    
    // Provide more diagnostic information
    if (error.code === 'storage/unauthorized') {
      console.error('Storage permission error: Please check Firebase Storage rules');
    } else if (error.message && error.message.includes('CORS')) {
      console.error('CORS error: Please set CORS configuration in Firebase console for storage bucket');
    }
    
    throw error;
  }
};

/**
 * Delete image from Firebase Storage
 * @param {string} imagePath - Path of the image to delete
 * @returns {Promise<void>}
 */
export const deleteImageFromStorage = async (imagePath) => {
  if (!imagePath) return;
  
  // Check if user is logged in
  if (!isUserAuthenticated()) {
    throw new Error("User not logged in, cannot delete file");
  }
  
  try {
    // Refresh authentication token to avoid CORS issues
    await refreshAuthToken();
    
    // Check if it's a Firebase Storage path
    if (imagePath.startsWith('uploads/')) {
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
      console.log(`Image deleted from Firebase Storage: ${imagePath}`);
      return;
    } else {
      console.log(`Not a Firebase Storage path, skipping deletion: ${imagePath}`);
      return;
    }
  } catch (error) {
    console.error('Failed to delete image:', error);
    
    // If file doesn't exist, don't throw exception
    if (error.code === 'storage/object-not-found') {
      console.log('File does not exist, no need to delete');
      return;
    }
    
    // Throw other errors
    throw error;
  }
}; 