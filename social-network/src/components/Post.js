import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { FaThumbsUp, FaComment, FaEllipsisV, FaEdit, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { likePost, unlikePost, deletePost, addComment, getComments } from '../services/postService';
import { getUserProfile } from '../services/userService';
import './Post.css';

export default function Post({ post, onDelete, onUpdate }) {
  const { currentUser, userProfile } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [authorProfile, setAuthorProfile] = useState(null);
  const commentInputRef = useRef(null);
  const menuRef = useRef(null);

  // Get post author information and like status
  useEffect(() => {
    const fetchAuthorProfile = async () => {
      try {
        const profile = await getUserProfile(post.userId);
        setAuthorProfile(profile);
      } catch (error) {
        console.error('Error fetching author profile:', error);
      }
    };

    fetchAuthorProfile();

    // Set initial like status and count
    if (post.likes) {
      setLikeCount(Object.keys(post.likes).length);
      setLiked(post.likes[currentUser.uid] === true);
    }
  }, [post, currentUser.uid]);

  // Monitor click event to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle comment input height adaptation
  useEffect(() => {
    if (commentInputRef.current) {
      commentInputRef.current.style.height = 'auto';
      commentInputRef.current.style.height = `${commentInputRef.current.scrollHeight}px`;
    }
  }, [commentText]);

  // Load comments for a post
  const loadComments = async () => {
    try {
      setLoading(true);
      // Toggle comments visibility
      const visible = !showComments;
      setShowComments(visible);
      
      // If hiding comments or already loaded, no need to fetch
      if (!visible || comments.length > 0) {
        return;
      }
      
      const commentData = await getComments(post.id);
      
      // Process comments to ensure user data is available
      setComments(commentData);
      
      // Focus comment input if showing comments
      if (visible && commentInputRef.current) {
        commentInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle like/unlike
  const handleLike = async () => {
    try {
      if (liked) {
        await unlikePost(post.id, currentUser.uid);
        setLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        await likePost(post.id, currentUser.uid);
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Handle post deletion
  const handleDelete = async () => {
    try {
      await deletePost(post.id, post.imageUrl);
      onDelete(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  // Submit comment
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    // Ensure user is logged in before submitting
    if (!currentUser) {
      console.error('User not logged in');
      return;
    }

    try {
      setLoading(true);
      const newComment = await addComment(post.id, {
        text: commentText,
        userId: currentUser.uid,
        createdAt: new Date(),
      });
      
      setComments((prevComments) => [newComment, ...prevComments]);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get user avatar or placeholder
  const getUserAvatar = () => {
    if (authorProfile?.photoURL) {
      return authorProfile.photoURL;
    } else if (authorProfile) {
      return `https://ui-avatars.com/api/?name=${authorProfile.displayName || authorProfile.email || 'User'}`;
    }
    return null;
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const postDate = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return format(postDate, 'MMM d, yyyy • h:mm a');
  };

  return (
    <div className="post">
      <div className="post-header">
        {getUserAvatar() && (
          <img src={getUserAvatar()} alt={authorProfile?.displayName || ''} className="post-user-avatar" />
        )}
        
        <div className="post-user-info">
          <h3 className="post-author">
            <Link to={`/profile/${post.userId}`} className="post-username">
              {authorProfile?.displayName || post.author || 'User'}
            </Link>
          </h3>
          <p className="post-date">{formatDate(post.createdAt)}</p>
        </div>
        
        {currentUser.uid === post.userId && (
          <div className="post-actions" ref={menuRef}>
            <button 
              className="post-action-button" 
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Post options"
            >
              <FaEllipsisV />
            </button>
            
            {showMenu && (
              <div className="post-menu">
                <button className="post-menu-item" onClick={() => { setShowMenu(false); onUpdate(post); }}>
                  <FaEdit /> Edit
                </button>
                <button className="post-menu-item delete" onClick={handleDelete}>
                  <FaTrash /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="post-content">
        <p className="post-text">{post.content}</p>
        {post.imageUrl && (
          <img 
            src={post.imageUrl} 
            alt="Post" 
            className="post-image" 
            loading="lazy"
          />
        )}
      </div>
      
      <div className="post-footer">
        <div 
          className={`post-reaction ${liked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <FaThumbsUp className="post-reaction-icon" />
          <span className="post-reaction-count">{likeCount}</span>
        </div>
        
        <button 
          className="post-comment-button"
          onClick={loadComments}
          disabled={loading}
        >
          <FaComment className="post-comment-icon" />
          Comments
        </button>
      </div>
      
      {showComments && (
        <div className="post-comments">
          <form className="post-comment-form" onSubmit={handleCommentSubmit}>
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName || ''} className="post-comment-avatar" />
            ) : (
              <div className="post-comment-avatar-placeholder">
                {authorProfile ? authorProfile.displayName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            
            <div className="post-comment-input-container">
              <textarea
                ref={commentInputRef}
                className="post-comment-input"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={1}
              />
              
              <button 
                type="submit" 
                className="post-comment-submit"
                disabled={!commentText.trim() || loading}
                aria-label="Submit comment"
              >
                <FaPaperPlane />
              </button>
            </div>
          </form>
          
          {loading ? (
            <p>Loading comments...</p>
          ) : (
            <div className="post-comment-list">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="comment">
                    {comment.user?.photoURL ? (
                      <img src={comment.user.photoURL} alt={comment.user.displayName || ''} className="post-comment-avatar" />
                    ) : (
                      <div className="post-comment-avatar-placeholder">
                        {comment.user ? comment.user.displayName.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                    
                    <div className="comment-content">
                      <div className="comment-header">
                        <h4 className="comment-author">
                          {comment.user?.displayName || comment.author || 'User'}
                        </h4>
                        <span className="comment-date">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>No comments yet. Be the first to comment!</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 