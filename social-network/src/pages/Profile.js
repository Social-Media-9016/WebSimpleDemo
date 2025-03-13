import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../services/userService';
import { getPostsByUser } from '../services/postService';
import PostItem from '../components/PostItem';
import './Profile.css';

function Profile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');

  // Load user profile and posts
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        
        // Get user profile from Firestore
        const profileData = await getUserProfile(currentUser.uid);
        setProfile(profileData || { bio: '' });
        setBio(profileData?.bio || '');
        
        // Get user posts
        const posts = await getPostsByUser(currentUser.uid);
        setUserPosts(posts);
      } catch (error) {
        setError('Failed to load profile data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser.uid]);

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Update profile in Firestore
      await updateUserProfile(currentUser.uid, {
        displayName: currentUser.displayName,
        email: currentUser.email,
        photoURL: currentUser.photoURL,
        bio
      });
      
      // Update local state
      setProfile(prev => ({ ...prev, bio }));
      setEditing(false);
    } catch (error) {
      setError('Failed to update profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle post update
  const handlePostUpdate = (updatedPost) => {
    setUserPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  };

  // Handle post deletion
  const handlePostDelete = (postId) => {
    setUserPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
  };

  if (loading && !profile) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      {error && <div className="alert alert-error">{error}</div>}
      
      <div className="profile-header">
        <div className="profile-avatar-container">
          {currentUser.photoURL ? (
            <img 
              src={currentUser.photoURL} 
              alt={currentUser.displayName} 
              className="profile-page-avatar" 
            />
          ) : (
            <div className="profile-page-avatar-placeholder">
              {currentUser.displayName ? 
                currentUser.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <h2>{currentUser.displayName || 'User'}</h2>
          <p className="profile-email">{currentUser.email}</p>
          
          {editing ? (
            <form onSubmit={handleUpdateProfile} className="bio-edit-form">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                maxLength={200}
                className="bio-textarea"
              />
              <div className="bio-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={() => {
                    setEditing(false);
                    setBio(profile?.bio || '');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="bio-container">
              <p className="profile-bio">
                {profile?.bio || 'No bio yet. Tell people about yourself.'}
              </p>
              <button 
                className="edit-bio-btn" 
                onClick={() => setEditing(true)}
              >
                Edit Bio
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="profile-posts-section">
        <h3>Your Posts</h3>
        
        {userPosts.length === 0 ? (
          <div className="no-posts">You haven't created any posts yet.</div>
        ) : (
          <div className="profile-posts-list">
            {userPosts.map(post => (
              <PostItem 
                key={post.id} 
                post={post} 
                onUpdate={handlePostUpdate}
                onDelete={handlePostDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile; 