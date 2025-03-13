import React, { useState, useEffect } from 'react';
import { getAllPosts } from '../services/postService';
import PostItem from './PostItem';
import './PostList.css';

function PostList({ newPost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load all posts when component mounts
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const postsData = await getAllPosts();
        setPosts(postsData);
      } catch (error) {
        setError('Failed to load posts');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  // Add new post to the list when created
  useEffect(() => {
    if (newPost) {
      setPosts(prevPosts => [newPost, ...prevPosts]);
    }
  }, [newPost]);

  // Handle post update
  const handlePostUpdate = (updatedPost) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  };

  // Handle post deletion
  const handlePostDelete = (postId) => {
    setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  if (loading && posts.length === 0) {
    return <div className="posts-loading">Loading posts...</div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (posts.length === 0) {
    return <div className="no-posts">No posts yet. Be the first to post!</div>;
  }

  return (
    <div className="posts-list">
      {posts.map(post => (
        <PostItem 
          key={post.id} 
          post={post} 
          onUpdate={handlePostUpdate}
          onDelete={handlePostDelete}
        />
      ))}
    </div>
  );
}

export default PostList; 