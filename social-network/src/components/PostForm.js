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
  }, [showEmojiPicker]);

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
    
    // Validation
    if ((!content.trim() && !image) || isGuest()) {
      setError('Please enter content or upload an image');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      // 创建帖子并处理潜在错误
      let maxAttempts = 3;
      let attempt = 0;
      let lastError = null;
      
      while (attempt < maxAttempts) {
        try {
          const post = await createPost(
            content,
            currentUser.uid,
            currentUser.displayName || 'Anonymous User',
            currentUser.photoURL,
            image
          );
          
          // 成功创建帖子
          // Reset form
          setContent('');
          setImage(null);
          setImagePreview('');
          setShowEmojiPicker(false);
          
          // Notify parent component
          if (onPostCreated) {
            onPostCreated(post);
          }
          
          // 成功后退出循环
          return;
        } catch (err) {
          lastError = err;
          console.error(`创建帖子失败，第${attempt + 1}次尝试:`, err);
          
          // 检查是否是 CORS 或存储相关错误
          if (err.message && (
              err.message.includes('CORS') || 
              err.message.includes('network') ||
              err.message.includes('access') ||
              err.code === 'storage/unauthorized' ||
              err.code === 'storage/canceled'
            )) {
            // 这是一个可能是暂时性的错误，可以重试
            attempt++;
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            // 继续循环尝试
            continue;
          } else {
            // 其他类型的错误直接抛出
            throw err;
          }
        }
      }
      
      // 如果重试后仍失败
      throw lastError || new Error('发布帖子失败，请稍后重试');
    } catch (error) {
      console.error("Error creating post:", error);
      
      // 针对不同错误类型提供具体的错误信息
      if (error.code === 'storage/unauthorized') {
        setError('您没有权限上传文件，请检查您的登录状态。');
      } else if (error.message && error.message.includes('CORS')) {
        setError('网络请求被拒绝。请联系管理员配置CORS设置，或稍后重试。');
      } else if (error.code === 'storage/quota-exceeded') {
        setError('存储空间已满，请联系管理员。');
      } else if (error.code === 'storage/invalid-format') {
        setError('文件格式不正确，请上传有效的图片文件。');
      } else {
        setError('发布帖子失败，请稍后重试。');
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