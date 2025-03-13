import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createComment, getCommentsByPostId, deleteComment } from '../services/commentService';
import { formatDistanceToNow } from 'date-fns';
import './CommentSection.css';

function CommentSection({ postId, onCommentCountChange }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();
  
  // 使用 useRef 存储当前评论数量，避免触发重新渲染
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
          
          // 使用 ref 保存当前数量
          if (commentsData.length !== commentsCountRef.current) {
            commentsCountRef.current = commentsData.length;
            // 只在评论数量改变时调用
            if (onCommentCountChange) {
              onCommentCountChange(commentsData.length);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load comments:", error);
        if (isMounted) {
          setError('Failed to load comments. Please try again later.');
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
  }, [postId, onCommentCountChange]); // 添加 onCommentCountChange 依赖，但使用 useRef 避免重新渲染

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

  // Handle new comment submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      console.log(`Adding comment to post ID: ${postId}`);
      const commentData = await createComment(
        postId,
        newComment,
        currentUser.uid,
        currentUser.displayName || 'Anonymous User',
        currentUser.photoURL
      );
      
      console.log('Comment created successfully:', commentData);
      
      // Add new comment to state
      setComments(prev => [commentData, ...prev]);
      setNewComment('');
      
      // Update comment count
      if (onCommentCountChange) {
        onCommentCountChange((comments?.length || 0) + 1);
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
      setError('Failed to post comment. Please try again later.');
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
      setError('Failed to delete comment. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-section">
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit} className="comment-form">
        <div className="comment-input-container">
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="comment-input"
            disabled={loading}
            maxLength={200}
          />
          <button 
            type="submit" 
            className="comment-submit-btn"
            disabled={loading || !newComment.trim()}
          >
            {loading ? '...' : 'Post'}
          </button>
        </div>
      </form>
      
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
                  <div>
                    <h5 className="comment-username">{comment.userName}</h5>
                    <p className="comment-time">{formatTimestamp(comment.createdAt)}</p>
                  </div>
                </div>
                
                {comment.userId === currentUser.uid && (
                  <button 
                    className="comment-delete-btn" 
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="comment-content">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CommentSection; 