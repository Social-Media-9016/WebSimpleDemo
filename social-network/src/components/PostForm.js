import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createPost } from '../services/postService';
import './PostForm.css';

function PostForm({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const newPost = await createPost(
        content, 
        currentUser.uid, 
        currentUser.displayName || 'Anonymous User', 
        currentUser.photoURL
      );
      
      setContent('');
      if (onPostCreated) {
        onPostCreated(newPost);
      }
    } catch (error) {
      setError('Failed to create post. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-form-container">
      <h3>Create a Post</h3>
      {error && <div className="alert alert-error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="form-control post-input"
            rows={3}
            maxLength={500}
            disabled={loading}
            required
          />
          <div className="char-counter">
            {content.length}/500
          </div>
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading || !content.trim()}
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  );
}

export default PostForm; 