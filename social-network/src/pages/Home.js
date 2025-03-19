import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PostForm from '../components/PostForm';
import PostList from '../components/PostList';
import { FaUserFriends, FaFire, FaBookmark, FaQuestionCircle } from 'react-icons/fa';
import './Home.css';

function Home() {
  const [newPost, setNewPost] = useState(null);
  const { currentUser, isGuest } = useAuth();

  const handlePostCreated = (post) => {
    setNewPost(post);
  };

  return (
    <div className="home-container">
      <div className="home-sidebar left-sidebar animate-slide-up">
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
            <p className="user-email">{currentUser.email}</p>
          </div>
        ) : (
          <div className="guest-card">
            <h3>Guest Mode</h3>
            <p>You're browsing as a guest</p>
            <div className="guest-actions">
              <Link to="/login" className="btn btn-primary btn-full">Login</Link>
              <Link to="/register" className="btn btn-outline btn-full">Register</Link>
            </div>
          </div>
        )}
        
        <nav className="sidebar-nav">
          <ul>
            <li className="sidebar-nav-item active">
              <FaFire className="sidebar-icon" />
              <span>Feed</span>
            </li>
            <li className="sidebar-nav-item">
              <FaUserFriends className="sidebar-icon" />
              <span>Friends</span>
            </li>
            <li className="sidebar-nav-item">
              <FaBookmark className="sidebar-icon" />
              <span>Saved</span>
            </li>
            <li className="sidebar-nav-item">
              <FaQuestionCircle className="sidebar-icon" />
              <span>Help</span>
            </li>
          </ul>
        </nav>
        
        <div className="about-card">
          <h3>About SocialNet</h3>
          <p>A social networking platform built with React and Firebase.</p>
          <p>Cloud Computing Project - ECE9016</p>
        </div>
      </div>

      <div className="home-content animate-fade-in">
        <div className="section-header">
          <h2>News Feed</h2>
        </div>
        
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
      
      <div className="home-sidebar right-sidebar animate-slide-up">
        <div className="trending-card">
          <h3>Trending Topics</h3>
          <ul className="trending-list">
            <li className="trending-item">
              <span className="trending-tag">#ReactJS</span>
              <span className="trending-count">2.5K posts</span>
            </li>
            <li className="trending-item">
              <span className="trending-tag">#Firebase</span>
              <span className="trending-count">1.8K posts</span>
            </li>
            <li className="trending-item">
              <span className="trending-tag">#CloudComputing</span>
              <span className="trending-count">950 posts</span>
            </li>
            <li className="trending-item">
              <span className="trending-tag">#WebDev</span>
              <span className="trending-count">742 posts</span>
            </li>
          </ul>
        </div>
        
        <div className="suggested-card">
          <h3>Suggested Users</h3>
          <ul className="suggested-list">
            <li className="suggested-user">
              <div className="suggested-user-avatar">Y</div>
              <div className="suggested-user-info">
                <h4>Yuhan Zhang</h4>
                <p>Advanced AI Research Director</p>
              </div>
              <button className="btn btn-sm btn-outline follow-btn">Follow</button>
            </li>
            <li className="suggested-user">
              <div className="suggested-user-avatar">Y</div>
              <div className="suggested-user-info">
                <h4>Yifei Zhang</h4>
                <p>Distinguished Software Architect</p>
              </div>
              <button className="btn btn-sm btn-outline follow-btn">Follow</button>
            </li>
            <li className="suggested-user">
              <div className="suggested-user-avatar">J</div>
              <div className="suggested-user-info">
                <h4>Jiayi Che</h4>
                <p>Enterprise Cloud Solutions Expert</p>
              </div>
              <button className="btn btn-sm btn-outline follow-btn">Follow</button>
            </li>
            <li className="suggested-user">
              <div className="suggested-user-avatar">X</div>
              <div className="suggested-user-info">
                <h4>Xiaohan Lu</h4>
                <p>Chief Experience Design Officer</p>
              </div>
              <button className="btn btn-sm btn-outline follow-btn">Follow</button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home; 