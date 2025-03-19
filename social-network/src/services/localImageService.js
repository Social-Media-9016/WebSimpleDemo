// Local image storage service
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique ID for an image
 * @returns {string} Unique ID
 */
export const generateImageId = () => {
  return uuidv4();
};

/**
 * Save an image to the local file system (public folder)
 * @param {File} file - The image file to save
 * @param {string} type - The type of content ('posts' or 'comments')
 * @param {string} userId - The user ID of the uploader
 * @returns {Promise<{path: string, url: string}>} The path and URL of the saved image
 */
export const saveImage = async (file, type, userId) => {
  if (!file) return null;
  
  try {
    // Generate a unique ID for the image
    const imageId = generateImageId();
    const extension = file.name.split('.').pop();
    const fileName = `${userId}_${imageId}.${extension}`;
    
    // Create path relative to the public folder
    const relativePath = `/uploads/${type}/${fileName}`;
    
    // Create a URL to the public folder for the client to use
    // For a production app, you'd move the file on the server
    const imageUrl = URL.createObjectURL(file);
    
    // In a real server-side application, you would need to use:
    // 1. A server endpoint that accepts the file for upload
    // 2. Store the file in the specified folder
    // 3. Return the path
    
    // This log helps for debugging
    console.log(`Local Image Path: ${relativePath}`);
    
    // Store additional info in localStorage for persistence between page reloads
    // In a real app, you wouldn't need this as files would be physically saved
    try {
      const localImages = JSON.parse(localStorage.getItem('localImages') || '{}');
      localImages[relativePath] = {
        originalName: file.name,
        uploadedBy: userId,
        createdAt: new Date().toISOString(),
        size: file.size,
        type: file.type
      };
      localStorage.setItem('localImages', JSON.stringify(localImages));
    } catch (err) {
      console.error('Failed to save image metadata to localStorage', err);
    }
    
    // Return the path and URL
    return {
      path: relativePath,
      url: imageUrl
    };
  } catch (error) {
    console.error('Error saving image locally:', error);
    throw error;
  }
};

/**
 * Delete an image from the local file system
 * @param {string} imagePath - The path of the image to delete
 * @returns {Promise<void>}
 */
export const deleteImage = async (imagePath) => {
  if (!imagePath) return;
  
  try {
    // In a real server-side application, you would delete the file from disk
    console.log(`Image would be deleted from: ${imagePath}`);
    
    // Remove from localStorage metadata
    try {
      const localImages = JSON.parse(localStorage.getItem('localImages') || '{}');
      delete localImages[imagePath];
      localStorage.setItem('localImages', JSON.stringify(localImages));
    } catch (err) {
      console.error('Failed to remove image metadata from localStorage', err);
    }
    
    // Revoke object URL if one exists
    if (imagePath.startsWith('blob:')) {
      URL.revokeObjectURL(imagePath);
    }
  } catch (error) {
    console.error('Error deleting local image:', error);
    // Don't throw error if image not found
  }
}; 