import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PostForm from '../components/PostForm';
import PostList from '../components/PostList';
import './Home.css';

function Home() {
  const [newPost, setNewPost] = useState(null);
  const { currentUser, isGuest } = useAuth();

  const handlePostCreated = (post) => {
    setNewPost(post);
  };

  return (
    <div className="home-container">
      <div className="home-content">
        {!isGuest() ? (
          <PostForm onPostCreated={handlePostCreated} />
        ) : (
          <div className="guest-banner">
            <h2>Welcome to SocialNet!</h2>
            <p>Browse posts and discussions. <Link to="/login">Login</Link> or <Link to="/register">Register</Link> to interact.</p>
          </div>
        )}
        <PostList newPost={newPost} />
      </div>
      
      <div className="home-sidebar">
        {!isGuest() ? (
          <div className="profile-card">
            {currentUser.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName} 
                className="profile-avatar" 
              />
            ) : (
              <div className="profile-avatar-placeholder">
                {currentUser.displayName ? 
                  currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <h3>{currentUser.displayName || 'User'}</h3>
            <p>{currentUser.email}</p>
          </div>
        ) : (
          <div className="guest-card">
            <h3>Guest Mode</h3>
            <p>You're browsing as a guest</p>
            <div className="guest-actions">
              <Link to="/login" className="btn btn-primary">Login</Link>
              <Link to="/register" className="btn btn-outline">Register</Link>
            </div>
          </div>
        )}
        
        <div className="about-card">
          <h3>About SocialNet</h3>
          <p>A social networking platform built with React and Firebase.</p>
          <p>Cloud Computing Project - ECE9016</p>
        </div>
      </div>
    </div>
  );
}

export default Home; 