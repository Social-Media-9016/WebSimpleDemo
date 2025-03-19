import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';
import { FaBars, FaTimes } from 'react-icons/fa';

export default function Navbar() {
  const { currentUser, logout, userProfile } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // 处理滚动事件
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    document.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // 关闭移动端菜单当路由变化时
  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  // 处理注销
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // 生成用户头像或占位符
  const getUserInitial = () => {
    if (userProfile && userProfile.displayName) {
      return userProfile.displayName.charAt(0).toUpperCase();
    } else if (currentUser && currentUser.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Social Network
        </Link>

        <button 
          className="navbar-mobile-toggle" 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
          {currentUser ? (
            <>
              {userProfile && (
                <div className="user-info">
                  {userProfile.photoURL ? (
                    <img 
                      src={userProfile.photoURL} 
                      alt={userProfile.displayName || 'User'} 
                      className="user-avatar" 
                    />
                  ) : (
                    <div className="user-avatar-placeholder">
                      {getUserInitial()}
                    </div>
                  )}
                </div>
              )}
              <NavLink 
                to="/" 
                className={({ isActive }) => 
                  isActive ? "navbar-item active" : "navbar-item"
                }
              >
                Home
              </NavLink>
              <NavLink 
                to="/profile" 
                className={({ isActive }) => 
                  isActive ? "navbar-item active" : "navbar-item"
                }
              >
                Profile
              </NavLink>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink 
                to="/login" 
                className={({ isActive }) => 
                  isActive ? "navbar-item active" : "navbar-item"
                }
              >
                Login
              </NavLink>
              <NavLink 
                to="/signup" 
                className={({ isActive }) => 
                  isActive ? "navbar-item active" : "navbar-item"
                }
              >
                Sign Up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
} 