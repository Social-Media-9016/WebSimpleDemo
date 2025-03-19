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

  // 获取帖子作者信息和点赞状态
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

    // 设置初始点赞状态和数量
    if (post.likes) {
      setLikeCount(Object.keys(post.likes).length);
      setLiked(post.likes[currentUser.uid] === true);
    }
  }, [post, currentUser.uid]);

  // 监听点击事件以关闭菜单
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

  // 处理评论输入框高度自适应
  useEffect(() => {
    if (commentInputRef.current) {
      commentInputRef.current.style.height = 'auto';
      commentInputRef.current.style.height = `${commentInputRef.current.scrollHeight}px`;
    }
  }, [commentText]);

  // 加载评论
  const loadComments = async () => {
    if (!showComments) {
      try {
        setLoading(true);
        const fetchedComments = await getComments(post.id);
        setComments(fetchedComments);
        setShowComments(true);
      } catch (error) {
        console.error('Error loading comments:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setShowComments(false);
    }
  };

  // 处理点赞/取消点赞
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

  // 处理删除帖子
  const handleDelete = async () => {
    try {
      await deletePost(post.id, post.imageUrl);
      onDelete(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  // 提交评论
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

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

  // 获取用户头像或占位符
  const getUserInitial = (user) => {
    if (user && user.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    } else if (user && user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  // 格式化日期
  const formatDate = (date) => {
    if (!date) return '';
    const postDate = date instanceof Date ? date : date.toDate();
    return format(postDate, 'MMM d, yyyy • h:mm a');
  };

  return (
    <div className="post">
      <div className="post-header">
        {authorProfile?.photoURL ? (
          <img src={authorProfile.photoURL} alt={authorProfile.displayName || ''} className="post-user-avatar" />
        ) : (
          <div className="post-user-avatar-placeholder">
            {authorProfile ? getUserInitial(authorProfile) : post.author ? post.author.charAt(0).toUpperCase() : '?'}
          </div>
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
          <form className="post-comment-form" onSubmit={handleSubmitComment}>
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt={userProfile.displayName || ''} className="post-comment-avatar" />
            ) : (
              <div className="post-comment-avatar-placeholder">
                {getUserInitial(currentUser)}
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
                        {comment.user ? getUserInitial(comment.user) : '?'}
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