import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { createComment, getCommentsByPostId, deleteComment } from '../services/commentService';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { FaSmile, FaCamera, FaPaperPlane, FaTimes } from 'react-icons/fa';
import './CommentSection.css';
import ImageRenderer from './ImageRenderer';
import { getUserProfile } from '../services/userService';

function CommentSection({ postId, onCommentCountChange }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ top: 0, left: 0 });
  const { currentUser } = useAuth();
  const inputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  // Using useRef to store current comment count to avoid triggering re-renders
  const commentsCountRef = useRef(0);
  
  // 使用 useCallback 包装 fetchComments 函数，避免无限循环
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    
    try {
      setLoading(true);
      console.log('Fetching comments for post:', postId);
      
      const commentsData = await getCommentsByPostId(postId);
      console.log('Got comments:', commentsData);
      
      // Fetch user data for each comment
      const commentsWithUserData = await Promise.all(
        commentsData.map(async (comment) => {
          try {
            const userData = await getUserProfile(comment.userId);
            return {
              ...comment,
              userName: userData?.displayName || comment.userName || 'User',
              userPhotoURL: userData?.photoURL || comment.userPhotoURL
            };
          } catch (error) {
            console.error('Error fetching user data for comment:', error);
            return comment;
          }
        })
      );
      
      setComments(commentsWithUserData);
      commentsCountRef.current = commentsWithUserData.length;
      
      // Update parent component with comment count if callback provided
      if (onCommentCountChange) {
        onCommentCountChange(commentsWithUserData.length);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      
      if (error.message && error.message.includes('index')) {
        setError('Please try again in a moment while database indexes are created.');
      } else {
        setError('Failed to load comments. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [postId, onCommentCountChange]);
  
  // Fetch comments when component mounts or postId changes
  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId, fetchComments]);
  
  // Effect for handling EmojiPicker positioning and outside clicks
  useEffect(() => {
    // Only add listener when emoji picker is open
    if (!showEmojiPicker) return;
    
    const handleOutsideClick = (e) => {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(e.target) &&
        !emojiButtonRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showEmojiPicker]);
  
  // Handle image file selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, WEBP)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large (max 5MB)');
      return;
    }
    
    setImage(file);
    setError('');
    
    // Create preview URL
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
  
  // Handle emoji picker toggle
  const toggleEmojiPicker = () => {
    if (!showEmojiPicker) {
      // Position emoji picker relative to button
      const buttonRect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPosition({
        top: buttonRect.bottom + window.scrollY,
        left: Math.max(0, buttonRect.left - 250 + buttonRect.width / 2)
      });
    }
    
    setShowEmojiPicker(!showEmojiPicker);
  };
  
  // Handle emoji selection
  const onEmojiClick = (emojiData) => {
    // 正确获取emoji并添加到评论中
    const emoji = emojiData.emoji || emojiData.native || emojiData;
    
    // 检查ref是否存在
    if (inputRef.current) {
      // 获取光标位置
      const cursorPosition = inputRef.current.selectionStart;
      const textBeforeCursor = newComment.substring(0, cursorPosition);
      const textAfterCursor = newComment.substring(cursorPosition);
      
      // 在光标位置插入emoji
      const newText = textBeforeCursor + emoji + textAfterCursor;
      setNewComment(newText);
      
      // 延迟设置光标位置到emoji之后
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursorPosition = cursorPosition + emoji.length;
          inputRef.current.selectionStart = newCursorPosition;
          inputRef.current.selectionEnd = newCursorPosition;
        }
      }, 10);
    } else {
      // 如果没有ref，直接添加到末尾
      setNewComment(prev => prev + emoji);
    }
    
    // 不要自动关闭emoji选择器
    // setShowEmojiPicker(false);
  };
  
  // Auto-resize text input
  const handleInputChange = (e) => {
    setNewComment(e.target.value);
    
    // Reset height to calculate scrollHeight correctly
    e.target.style.height = 'auto';
    
    // Set new height based on content
    const newHeight = Math.min(
      Math.max(36, e.target.scrollHeight), 
      200 // Max height
    );
    e.target.style.height = `${newHeight}px`;
  };

  // Handle new comment submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('Please log in before posting a comment');
      return;
    }
    
    if (!newComment.trim() && !image) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Create comment and handle potential errors
      let maxAttempts = 3;
      let attempt = 0;
      let lastError = null;
      
      while (attempt < maxAttempts) {
        try {
          console.log(`Adding comment to post ID: ${postId}`);
          const commentData = await createComment(
            postId,
            newComment,
            currentUser.uid,
            currentUser.displayName || 'Anonymous User',
            currentUser.photoURL,
            image
          );
          
          console.log('Comment created successfully:', commentData);
          
          // Add new comment to state
          setComments(prev => [commentData, ...prev]);
          setNewComment('');
          setImage(null);
          setImagePreview('');
          setShowEmojiPicker(false);
          
          // Update comment count
          if (onCommentCountChange) {
            onCommentCountChange((comments?.length || 0) + 1);
          }
          
          // Exit loop after success
          return;
        } catch (error) {
          console.error(`Comment creation attempt ${attempt + 1} failed:`, error);
          lastError = error;
          attempt++;
          
          // Small delay before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // If we get here, all attempts failed
      throw lastError || new Error('Failed to create comment after multiple attempts');
    } catch (error) {
      console.error('Error submitting comment:', error);
      setError('Failed to submit comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    if (!commentId) return;
    
    try {
      setLoading(true);
      await deleteComment(commentId);
      
      // Update UI
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      // Update comment count
      if (onCommentCountChange) {
        onCommentCountChange((comments.length || 0) - 1);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Recently';
    }
  };
  
  return (
    <div className="comment-section">
      {error && <div className="error-message">{error}</div>}
      
      {currentUser ? (
        <form className="comment-form" onSubmit={handleSubmit}>
          <div className="comment-form-header">
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || ''} 
                className="comment-user-avatar" 
              />
            ) : (
              <div className="comment-user-avatar-placeholder">
                {currentUser?.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            
            <div className="comment-input-wrapper">
              <textarea
                ref={inputRef}
                className="comment-input"
                placeholder="Write a comment..."
                value={newComment}
                onChange={handleInputChange}
                disabled={loading}
              />
              
              <div className="comment-form-actions">
                <button
                  type="button"
                  className="emoji-button"
                  onClick={toggleEmojiPicker}
                  ref={emojiButtonRef}
                  disabled={loading}
                >
                  <FaSmile />
                </button>
                
                <label className="image-button">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={loading}
                    style={{ display: 'none' }}
                  />
                  <FaCamera />
                </label>
                
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading || (!newComment.trim() && !image)}
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </div>
          
          {imagePreview && (
            <div className="image-preview-container">
              <img 
                src={imagePreview}
                alt="Selected"
                className="comment-image-preview"
              />
              <button 
                type="button" 
                className="remove-image-btn"
                onClick={removeImage}
              >
                <FaTimes />
              </button>
            </div>
          )}
        </form>
      ) : (
        <div className="login-prompt">
          Please log in to leave a comment.
        </div>
      )}
      
      {showEmojiPicker && createPortal(
        <div 
          className="emoji-picker-container"
          style={{ top: `${emojiPickerPosition.top}px`, left: `${emojiPickerPosition.left}px` }}
          ref={emojiPickerRef}
        >
          <EmojiPicker 
            onEmojiClick={onEmojiClick} 
            searchDisabled={false}
            skinTonesDisabled={true}
            width="320px"
            height="350px"
            previewConfig={{
              showPreview: false
            }}
            lazyLoadEmojis={true}
            theme="light"
          />
        </div>,
        document.body
      )}
      
      <div className="comments-list">
        {loading && comments.length === 0 ? (
          <div className="comments-loading">Loading comments...</div>
        ) : comments.length > 0 ? (
          comments.map(comment => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <div className="comment-user-info">
                  {comment.userPhotoURL ? (
                    <img 
                      src={comment.userPhotoURL} 
                      alt={comment.userName} 
                      className="comment-avatar" 
                    />
                  ) : (
                    <div className="comment-avatar-placeholder">
                      {comment.userName ? comment.userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="comment-content">
                    <div className="comment-meta">
                      <span className="comment-username">{comment.userName || 'User'}</span>
                      <span className="comment-time">{formatTimestamp(comment.createdAt)}</span>
                    </div>
                    <p className="comment-text">{comment.content || comment.text}</p>
                    {comment.imageURL && (
                      <div className="comment-image-container">
                        <ImageRenderer 
                          src={comment.imageURL} 
                          alt="Comment image" 
                          className="comment-image"
                        />
                      </div>
                    )}
                    
                    <div className="comment-actions">
                      {currentUser && comment.userId === currentUser.uid && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="comment-delete-btn"
                          aria-label="Delete comment"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="no-comments">Be the first to comment!</div>
        )}
      </div>
    </div>
  );
}

export default CommentSection; 