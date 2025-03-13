import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toggleLike, deletePost } from '../services/postService';
import { formatDistanceToNow } from 'date-fns';
import CommentSection from './CommentSection';
import './PostItem.css';

function PostItem({ post, onUpdate, onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const { currentUser, isGuest } = useAuth();
  const navigate = useNavigate();
  
  // Handle timestamp display
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

  // Handle guest interactions
  const handleGuestInteraction = () => {
    if (window.confirm('You need to be logged in to interact with posts. Would you like to login now?')) {
      navigate('/login');
    }
  };

  // Handle like/unlike
  const handleLike = async () => {
    if (isGuest()) {
      handleGuestInteraction();
      return;
    }
    
    try {
      const updatedPost = await toggleLike(post.id, currentUser.uid);
      if (onUpdate) {
        onUpdate(updatedPost);
      }
    } catch (error) {
      setError('Failed to update like');
      console.error(error);
    }
  };

  // Handle post deletion
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        setIsDeleting(true);
        await deletePost(post.id);
        if (onDelete) {
          onDelete(post.id);
        }
      } catch (error) {
        setError('Failed to delete post');
        console.error(error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Handle comments toggle
  const toggleComments = () => {
    if (isGuest()) {
      handleGuestInteraction();
      return;
    }
    
    setError('');
    setShowComments(!showComments);
  };

  // Check if current user liked the post
  const isLiked = !isGuest() && post.likes && post.likes.includes(currentUser.uid);
  
  // Check if current user is the author
  const isAuthor = !isGuest() && post.userId === currentUser.uid;

  // Handle comment count change
  const handleCommentCountChange = useCallback((count) => {
    if (onUpdate && post.commentCount !== count) {
      onUpdate({ ...post, commentCount: count });
    }
  }, [post, onUpdate]);

  return (
    <div className="post-item">
      {error && <div className="alert alert-error">{error}</div>}
      
      <div className="post-header">
        <div className="post-user-info">
          {post.userPhotoURL ? (
            <img 
              src={post.userPhotoURL} 
              alt={post.userName} 
              className="post-avatar" 
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
          ) : (
            <div className="post-avatar-placeholder">
              {post.userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h4 className="post-username">{post.userName}</h4>
            <p className="post-time">{formatTimestamp(post.createdAt)}</p>
          </div>
        </div>
        
        {isAuthor && (
          <button 
            className="post-delete-btn" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? '...' : '✕'}
          </button>
        )}
      </div>
      
      <div className="post-content">
        <p>{post.content}</p>
      </div>
      
      <div className="post-actions">
        <button 
          className={`post-action-btn ${isLiked ? 'liked' : ''}`} 
          onClick={handleLike}
        >
          <span className="action-icon">❤️</span>
          <span>{post.likes ? post.likes.length : 0} Likes</span>
        </button>
        
        <button 
          className="post-action-btn" 
          onClick={toggleComments}
        >
          <span className="action-icon">💬</span>
          <span>{post.commentCount || 0} Comments</span>
        </button>
      </div>
      
      {showComments && (
        <CommentSection 
          postId={post.id} 
          onCommentCountChange={handleCommentCountChange} 
        />
      )}
    </div>
  );
}

export default PostItem; 