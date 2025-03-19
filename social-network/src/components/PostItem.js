import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FaThumbsUp, FaComment, FaEllipsisV, FaTrash, FaEdit, FaShareAlt, FaBookmark } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { toggleLike, deletePost } from '../services/postService';
import { getUserProfile } from '../services/userService';
import CommentSection from './CommentSection';
import './PostItem.css';

function PostItem({ post, onUpdate, onDelete }) {
  const { currentUser } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Fetch author profile and set initial likes state
  useEffect(() => {
    const fetchAuthorData = async () => {
      try {
        const profile = await getUserProfile(post.userId);
        setAuthorProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchAuthorData();

    // Set initial likes
    if (post.likes) {
      // Check if likes is an array
      const likeCount = Array.isArray(post.likes) ? post.likes.length : Object.keys(post.likes).length;
      const hasLiked = Array.isArray(post.likes) ? post.likes.includes(currentUser.uid) : post.likes[currentUser.uid] === true;
      setLikeCount(likeCount);
      setLiked(hasLiked);
    }
  }, [post, currentUser.uid]);

  const handleLike = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const updatedPost = await toggleLike(post.id, currentUser.uid);
      
      // Check if likes is an array
      const newLikes = Array.isArray(updatedPost.likes) 
        ? (liked ? updatedPost.likes.filter(id => id !== currentUser.uid) : [...updatedPost.likes, currentUser.uid])
        // If likes is an object
        : (liked ? { ...updatedPost.likes, [currentUser.uid]: false } : { ...updatedPost.likes, [currentUser.uid]: true });
      
      // Update the post in parent component
      onUpdate(updatedPost);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await deletePost(post.id);
        onDelete(post.id);
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleToggleComments = () => {
    setShowComments(!showComments);
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    // Future implementation: save bookmark to user profile
  };

  const handleShare = () => {
    // Future implementation: share functionality
    alert('Share feature will be implemented in future updates');
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'MMM d, yyyy • h:mm a');
  };

  const renderUserAvatar = () => {
    if (authorProfile && authorProfile.photoURL) {
      return (
        <img 
          src={authorProfile.photoURL} 
          alt={authorProfile.displayName} 
          className="post-user-avatar" 
        />
      );
    }
    
    return (
      <div className="post-user-avatar-placeholder">
        {authorProfile && authorProfile.displayName 
          ? authorProfile.displayName.charAt(0).toUpperCase() 
          : 'U'}
      </div>
    );
  };

  return (
    <div className="post animate-slide-up">
      <div className="post-header">
        <div className="post-avatar-wrapper">
          {renderUserAvatar()}
        </div>
        <div className="post-user-info">
          <Link to={`/profile/${post.userId}`} className="post-author">
            {authorProfile ? authorProfile.displayName : 'User'}
          </Link>
          <span className="post-date">{formatDate(post.createdAt)}</span>
        </div>
        {post.userId === currentUser.uid && (
          <div className="post-actions">
            <button 
              className="post-action-button" 
              onClick={handleMenuClick}
              aria-label="Post options"
            >
              <FaEllipsisV />
            </button>
            {showMenu && (
              <div className="post-menu">
                <Link to={`/edit-post/${post.id}`} className="post-menu-item">
                  <FaEdit style={{ marginRight: '8px' }} />
                  Edit Post
                </Link>
                <button onClick={handleDelete} className="post-menu-item delete">
                  <FaTrash style={{ marginRight: '8px' }} />
                  Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="post-content">
        {post.content && <p className="post-text">{post.content}</p>}
        {post.imageURL && (
          <div className="post-image-container">
            <img src={post.imageURL} alt="Post" className="post-image" />
          </div>
        )}
      </div>
      
      <div className="post-stats">
        {likeCount > 0 && (
          <div className="post-stat-item">
            <div className="post-like-indicator">
              <FaThumbsUp className="post-like-icon" />
            </div>
            <span>{likeCount}</span>
          </div>
        )}
        {post.commentCount > 0 && (
          <div className="post-stat-item post-comment-count" onClick={handleToggleComments}>
            <span>{post.commentCount} comments</span>
          </div>
        )}
      </div>
      
      <div className="post-footer">
        <button 
          className={`post-reaction ${liked ? 'liked' : ''}`} 
          onClick={handleLike}
          disabled={isLoading}
        >
          <FaThumbsUp className="post-reaction-icon" />
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>
        
        <button className="post-reaction" onClick={handleToggleComments}>
          <FaComment className="post-reaction-icon" />
          <span>Comment</span>
        </button>
        
        <button className="post-reaction" onClick={handleShare}>
          <FaShareAlt className="post-reaction-icon" />
          <span>Share</span>
        </button>
        
        <button 
          className={`post-reaction ${bookmarked ? 'bookmarked' : ''}`} 
          onClick={handleBookmark}
        >
          <FaBookmark className="post-reaction-icon" />
          <span>{bookmarked ? 'Saved' : 'Save'}</span>
        </button>
      </div>
      
      {showComments && (
        <CommentSection postId={post.id} />
      )}
    </div>
  );
}

export default PostItem; 