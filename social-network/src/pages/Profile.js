import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../services/userService';
import { getPostsByUser } from '../services/postService';
import { syncUsersToPostgres } from '../services/syncService';
import usePostgresStatus from '../hooks/usePostgresStatus';
import PostItem from '../components/PostItem';
import './Profile.css';

// Admin user email list (in a real application, this should be read from database or configuration)
const ADMIN_EMAILS = ['admin@example.com', 'test@test.com']; // Replace with actual admin emails

function Profile() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [syncStatus, setSyncStatus] = useState({
    syncing: false,
    message: '',
    success: null
  });
  
  // Use custom hook to check PostgreSQL connection status
  const pgStatus = usePostgresStatus();
  
  // Check if current user is an admin
  const isAdmin = ADMIN_EMAILS.includes(currentUser?.email);

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

  // Manually trigger user data sync (admin only)
  const handleSyncUsers = async () => {
    if (!isAdmin) {
      setError('Only administrators can sync user data');
      return;
    }
    
    try {
      setSyncStatus({
        syncing: true,
        message: 'Syncing users to PostgreSQL...',
        success: null
      });
      
      const result = await syncUsersToPostgres();
      
      setSyncStatus({
        syncing: false,
        message: result.message,
        success: result.success
      });
      
      // Refresh PostgreSQL connection status after sync
      await pgStatus.refreshStatus();
    } catch (error) {
      setSyncStatus({
        syncing: false,
        message: `Sync failed: ${error.message}`,
        success: false
      });
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
      
      {/* Admin database sync area */}
      {isAdmin && (
        <div className="admin-section">
          <h3>Database Administration</h3>
          
          <div className="postgres-status">
            <p>
              <strong>PostgreSQL Status:</strong> {pgStatus.isChecking ? 'Checking...' : pgStatus.message}
              <span className={`status-indicator ${pgStatus.isConnected ? 'status-ok' : 'status-error'}`}></span>
            </p>
            {pgStatus.lastChecked && (
              <p className="last-checked">
                Last checked: {pgStatus.lastChecked.toLocaleTimeString()}
              </p>
            )}
            <button 
              className="btn btn-small" 
              onClick={pgStatus.refreshStatus}
              disabled={pgStatus.isChecking}
            >
              Refresh Status
            </button>
          </div>
          
          <div className="admin-actions">
            <button 
              className="btn btn-primary" 
              onClick={handleSyncUsers} 
              disabled={syncStatus.syncing || !pgStatus.isConnected}
            >
              {syncStatus.syncing ? 'Syncing...' : 'Sync Users to PostgreSQL'}
            </button>
            
            {syncStatus.message && (
              <div className={`sync-status ${syncStatus.success ? 'status-ok' : 'status-error'}`}>
                {syncStatus.message}
              </div>
            )}
          </div>
        </div>
      )}
      
      <h3 className="profile-posts-heading">Your Posts</h3>
      
      <div className="profile-posts">
        {userPosts.length > 0 ? (
          userPosts.map((post) => (
            <PostItem 
              key={post.id} 
              post={post} 
              currentUser={currentUser}
              onPostUpdate={handlePostUpdate}
              onPostDelete={handlePostDelete}
            />
          ))
        ) : (
          <p className="no-posts-message">You haven't created any posts yet.</p>
        )}
      </div>
    </div>
  );
}

export default Profile; 