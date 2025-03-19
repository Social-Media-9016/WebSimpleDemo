import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { createComment, getCommentsByPostId, deleteComment } from '../services/commentService';
import { formatDistanceToNow } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import { FaSmile, FaCamera, FaPaperPlane, FaTimes } from 'react-icons/fa';
import './CommentSection.css';
import ImageRenderer from './ImageRenderer';

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
  
  // Load comments
  useEffect(() => {
    let isMounted = true;

    const fetchComments = async () => {
      try {
        setLoading(true);
        setError('');
        console.log(`Fetching comments for post ID: ${postId}`);
        
        const commentsData = await getCommentsByPostId(postId);
        
        if (isMounted) {
          console.log(`Retrieved ${commentsData.length} comments`);
          setComments(commentsData);
          
          // Use ref to store current count
          if (commentsData.length !== commentsCountRef.current) {
            commentsCountRef.current = commentsData.length;
            // Only call when comment count changes
            if (onCommentCountChange) {
              onCommentCountChange(commentsData.length);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load comments:", error);
        if (isMounted) {
          setError('Failed to load comments, please try again later');
          setComments([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [postId, onCommentCountChange]);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'Just now';
      
      // Handle various timestamp formats
      let date;
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }
      
      // Validate date is valid
      if (isNaN(date.getTime())) {
        return 'Just now';
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Just now';
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiObj) => {
    const emoji = emojiObj.emoji;
    const cursorPosition = inputRef.current.selectionStart;
    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const textAfterCursor = newComment.substring(cursorPosition);
    
    // Insert emoji at cursor position
    const newText = textBeforeCursor + emoji + textAfterCursor;
    setNewComment(newText);
    
    // Close emoji picker
    setShowEmojiPicker(false);
    
    // Refocus on input field and place cursor after the inserted emoji
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
        top: rect.top - 350
      });
    }
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Close emoji picker when clicking outside
  const handleClickOutside = (e) => {
    if (showEmojiPicker && 
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(e.target) && 
        !e.target.closest('.comment-emoji-btn')) {
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

  // Handle new comment submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('请登录后再发表评论');
      return;
    }
    
    if (!newComment.trim() && !image) return;
    
    try {
      setLoading(true);
      setError('');
      
      // 创建评论并处理潜在错误
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
          
          // 成功后退出循环
          return;
        } catch (err) {
          lastError = err;
          console.error(`发表评论失败，第${attempt + 1}次尝试:`, err);
          
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
      throw lastError || new Error('发表评论失败，请稍后重试');
    } catch (error) {
      console.error("Failed to post comment:", error);
      
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
        setError('发表评论失败，请稍后重试。');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle comment deletion
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      setLoading(true);
      
      await deleteComment(commentId);
      
      // Remove comment from state
      setComments(prev => prev.filter(comment => comment.id !== commentId));
      
      // Update comment count
      if (onCommentCountChange && comments?.length > 0) {
        onCommentCountChange(comments.length - 1);
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      setError('Failed to delete comment, please try again later');
    } finally {
      setLoading(false);
    }
  };

  // Render emoji picker Portal
  const renderEmojiPickerPortal = () => {
    if (!showEmojiPicker) return null;
    
    return createPortal(
      <div 
        className="comment-emoji-picker"
        ref={emojiPickerRef}
        style={{
          position: 'absolute',
          top: emojiPickerPosition.top,
          left: emojiPickerPosition.left,
          zIndex: 1000
        }}
      >
        <EmojiPicker 
          onEmojiClick={handleEmojiClick}
          width={320}
          height={350}
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
    <div className="comment-section">
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="comment-form">
        <div className="comment-input-container">
          <input
            ref={inputRef}
            type="text"
            placeholder={currentUser ? "Write a comment..." : "Please log in to comment"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="comment-input"
            disabled={!currentUser || loading}
            maxLength={200}
          />
          {currentUser && (
            <div className="comment-tools">
              <button
                type="button"
                className="comment-emoji-btn"
                onClick={toggleEmojiPicker}
                disabled={loading}
                ref={emojiButtonRef}
              >
                <FaSmile />
              </button>
              <div className="comment-image-upload">
                <label htmlFor="comment-image" className="image-upload-label">
                  <FaCamera />
                </label>
                <input
                  id="comment-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="image-upload-input"
                  disabled={loading}
                />
              </div>
            </div>
          )}
          <button 
            type="submit" 
            className="comment-submit-btn"
            disabled={!currentUser || loading || (!newComment.trim() && !image)}
          >
            <FaPaperPlane />
          </button>
        </div>
        
        {imagePreview && (
          <div className="image-preview-container">
            <img src={imagePreview} alt="Preview" className="image-preview" />
            <button 
              type="button" 
              className="remove-image-btn" 
              onClick={removeImage}
              disabled={loading}
            >
              <FaTimes />
            </button>
          </div>
        )}
      </form>
      
      {renderEmojiPickerPortal()}
      
      <div className="comments-list">
        {loading && comments.length === 0 ? (
          <p className="comments-loading">Loading comments...</p>
        ) : comments.length === 0 && !error ? (
          <p className="no-comments">No comments yet. Be the first to comment!</p>
        ) : (
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
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="comment-content">
                    <div className="comment-meta">
                      <span className="comment-username">{comment.userName}</span>
                      <span className="comment-time">{formatTimestamp(comment.createdAt)}</span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
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
        )}
      </div>
    </div>
  );
}

export default CommentSection; 