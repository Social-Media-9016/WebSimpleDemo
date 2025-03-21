import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { createPost } from '../services/postService';
import EmojiPicker from 'emoji-picker-react';
import { FaPlus, FaSmile, FaImage } from 'react-icons/fa';
import './PostForm.css';

function PostForm({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  const { currentUser, isGuest } = useAuth();
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  // Handle emoji selection
  const handleEmojiClick = (emojiObj) => {
    const emoji = emojiObj.emoji;
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    
    // Insert emoji at cursor position
    const newText = textBeforeCursor + emoji + textAfterCursor;
    setContent(newText);
    
    // Close emoji picker
    setShowEmojiPicker(false);
    
    // Refocus on textarea field and place cursor after the inserted emoji
    setTimeout(() => {
      inputRef.current.focus();
      const newCursorPosition = cursorPosition + emoji.length;
      inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    if (!showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPosition({
        left: rect.left,
        top: rect.top - 450
      });
    }
    setShowEmojiPicker(!showEmojiPicker);
  };
  
  // Close emoji picker when clicking outside
  const handleClickOutside = (e) => {
    if (showEmojiPicker && 
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(e.target) && 
        !e.target.closest('.emoji-btn')) {
      setShowEmojiPicker(false);
    }
  };

  // Add click event listener
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImage(null);
      setImagePreview('');
      return;
    }

    // Validate file type (only accept images)
    if (!file.type.match('image.*')) {
      setError('Only image files can be uploaded');
      return;
    }

    // Validate file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size cannot exceed 2MB');
      return;
    }

    setImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Remove selected image
  const removeImage = () => {
    setImage(null);
    setImagePreview('');
  };

  // Handle post submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verify user is logged in
    if (!currentUser) {
      setError('Please log in before posting');
      return;
    }
    
    // Validation
    if ((!content.trim() && !image) || isGuest()) {
      setError('Please enter content or upload an image');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // Create post and handle potential errors
      let maxAttempts = 3;
      let attempt = 0;
      let lastError = null;
      
      // Define post creation function, avoid declaring functions in loops
      const attemptCreatePost = async () => {
        console.log(`Attempting to create post, attempt ${attempt + 1}, user ID:`, currentUser.uid);
        return await createPost(
          content,
          currentUser.uid,
          currentUser.displayName || 'Anonymous User',
          currentUser.photoURL,
          image
        );
      };
      
      while (attempt < maxAttempts) {
        try {
          const post = await attemptCreatePost();
          
          // Successfully created post
          // Reset form
          setContent('');
          setImage(null);
          setImagePreview('');
          setShowEmojiPicker(false);
          
          // Notify parent component
          if (onPostCreated) {
            onPostCreated(post);
          }
          
          // Exit loop after success
          return;
        } catch (err) {
          lastError = err;
          console.error(`Post creation failed, attempt ${attempt + 1}:`, err);
          
          // Check if it's a CORS or storage related error
          if (err.message && (
              err.message.includes('CORS') || 
              err.message.includes('network') ||
              err.message.includes('access') ||
              err.code === 'storage/unauthorized' ||
              err.code === 'storage/canceled'
            )) {
            // This could be a temporary error, can retry
            attempt++;
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            // Continue loop
            continue;
          } else {
            // Other types of errors directly throw
            throw err;
          }
        }
      }
      
      // If retries fail
      throw lastError || new Error('Posting failed, please try again later');
    } catch (error) {
      console.error("Error creating post:", error);
      
      // Provide specific error information for different error types
      if (error.code === 'storage/unauthorized') {
        setError('You do not have permission to upload files, please check your login status.');
      } else if (error.message && error.message.includes('CORS')) {
        setError('Network request denied. Please contact the administrator to configure CORS settings, or try again later.');
      } else if (error.code === 'storage/quota-exceeded') {
        setError('Storage space is full, please contact the administrator.');
      } else if (error.code === 'storage/invalid-format') {
        setError('File format is incorrect, please upload a valid image file.');
      } else {
        setError('Posting failed, please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Early return if user is not logged in
  if (isGuest()) {
    return (
      <div className="post-form guest-message">
        <p>Please log in to create posts</p>
      </div>
    );
  }

  // Render emoji picker Portal
  const renderEmojiPickerPortal = () => {
    if (!showEmojiPicker) return null;
    
    return createPortal(
      <div 
        className="emoji-picker" 
        ref={emojiPickerRef}
        style={{
          position: 'absolute',
          top: emojiPickerPosition.top,
          left: emojiPickerPosition.left,
          zIndex: 9999
        }}
      >
        <EmojiPicker 
          onEmojiClick={handleEmojiClick} 
          width={320}
          height={400}
          searchDisabled={false}
          skinTonesDisabled={true}
          lazyLoadEmojis={true}
          previewConfig={{ showPreview: false }}
        />
      </div>,
      document.body
    );
  };

  return (
    <div className="post-form">
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-header">
          <div className="user-info">
            {currentUser.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="User avatar" 
                className="avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
            ) : (
              <div className="avatar-placeholder">
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'A'}
              </div>
            )}
            <p className="user-name">{currentUser.displayName || 'Anonymous User'}</p>
          </div>
        </div>
        
        <div className="form-content">
          <textarea
            ref={inputRef}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="content-input"
          />
          
          {imagePreview && (
            <div className="image-preview-container">
              <img 
                src={imagePreview}
                alt="Selected"
                className="image-preview"
              />
              <button 
                type="button" 
                className="remove-image-btn"
                onClick={removeImage}
              >
                ✕
              </button>
            </div>
          )}
        </div>
        
        <div className="form-actions">
          <div className="action-buttons">
            <label className="upload-btn">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              <FaImage />
            </label>
            
            <button 
              type="button" 
              className="emoji-btn"
              onClick={toggleEmojiPicker}
              ref={emojiButtonRef}
            >
              <FaSmile />
            </button>
          </div>
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting || (!content.trim() && !image)}
          >
            <FaPlus style={{marginRight: '0.25rem'}} />
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
      
      {renderEmojiPickerPortal()}
    </div>
  );
}

export default PostForm; 