import React, { useState, useRef, useEffect } from 'react';
import { FaImage, FaTimesCircle, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { addPost } from '../services/postService';
import './CreatePost.css';

export default function CreatePost({ onPostCreated, editingPost, onCancelEdit }) {
  const { currentUser, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // If in edit mode, populate the form
  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || '');
      if (editingPost.imageUrl) {
        setImagePreviewUrl(editingPost.imageUrl);
      }
    }
  }, [editingPost]);

  // Handle text area height adaptation
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(150, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setError('');
  };

  const handleImageChange = (e) => {
    e.preventDefault();
    
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
      setError('Please select an image file');
      return;
    }
    
    // Validate file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size cannot exceed 5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(file);
      setImagePreviewUrl(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim() && !image && !imagePreviewUrl) {
      setError('Please enter content or upload an image');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          const newProgress = prevProgress + (5 + Math.random() * 10);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      if (editingPost) {
        // Logic for editing existing post
        // Assume serviceLayer has updatePost method
        await updatePost(editingPost.id, {
          content: content.trim(),
          imageFile: image,
          currentImageUrl: !image && imagePreviewUrl ? imagePreviewUrl : null,
        }, (progress) => {
          setUploadProgress(progress);
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Finish editing, clear form
        setTimeout(() => {
          setContent('');
          setImage(null);
          setImagePreviewUrl('');
          setUploadProgress(0);
          setIsLoading(false);
          
          if (typeof onPostCreated === 'function') {
            onPostCreated();
          }
          
          if (typeof onCancelEdit === 'function') {
            onCancelEdit();
          }
        }, 1000);
      } else {
        // Create new post
        await addPost({
          content: content.trim(),
          imageFile: image,
          userId: currentUser.uid,
          author: userProfile?.displayName || currentUser.email,
        }, (progress) => {
          setUploadProgress(progress);
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // Clear form
        setTimeout(() => {
          setContent('');
          setImage(null);
          setImagePreviewUrl('');
          setUploadProgress(0);
          setIsLoading(false);
          
          if (typeof onPostCreated === 'function') {
            onPostCreated();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Post creation failed, please try again later');
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // Get user avatar or placeholder
  const getUserAvatar = () => {
    if (userProfile && userProfile.displayName) {
      return userProfile.displayName.charAt(0).toUpperCase();
    } else if (currentUser && currentUser.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
    <div className="create-post">
      <div className="create-post-header">
        {userProfile?.photoURL ? (
          <img src={userProfile.photoURL} alt={userProfile.displayName || ''} className="create-post-avatar" />
        ) : (
          <div className="create-post-avatar-placeholder">
            {getUserAvatar()}
          </div>
        )}
        
        <form className="create-post-form" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="create-post-textarea"
            placeholder={editingPost ? "Edit your post..." : "Share your thoughts..."}
            value={content}
            onChange={handleContentChange}
            disabled={isLoading}
            rows={1}
          />
          
          {imagePreviewUrl && (
            <div className="create-post-preview">
              <img
                src={imagePreviewUrl}
                alt="Preview"
                className="create-post-image-preview"
              />
              <button
                type="button"
                className="create-post-remove-image"
                onClick={handleRemoveImage}
                aria-label="Remove image"
              >
                <FaTimesCircle />
              </button>
            </div>
          )}
          
          <div className="create-post-actions">
            <div className="create-post-options">
              <label className="create-post-option" htmlFor="image-upload">
                <FaImage className="create-post-option-icon" />
                <span>Image</span>
                <input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  className="create-post-upload-input"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isLoading}
                />
              </label>
            </div>
            
            <button
              type="submit"
              className="create-post-submit"
              disabled={(!content.trim() && !image && !imagePreviewUrl) || isLoading}
            >
              {editingPost ? 'Update' : 'Post'}
              <FaPaperPlane className="create-post-submit-icon" />
            </button>
          </div>
          
          {error && <p className="create-post-message">{error}</p>}
          
          {isLoading && (
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          
          {editingPost && (
            <div className="create-post-footer">
              <button
                type="button"
                className="create-post-option"
                onClick={onCancelEdit}
                disabled={isLoading}
              >
                Cancel edit
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 