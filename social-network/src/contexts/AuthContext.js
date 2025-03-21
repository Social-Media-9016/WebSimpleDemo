import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  getIdToken
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { saveUserToPostgres } from '../services/dbService';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

// Auth Provider Component
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [profileUpdateTrigger, setProfileUpdateTrigger] = useState(0);

  // Token refresh function
  async function refreshToken() {
    try {
      if (currentUser) {
        const newToken = await getIdToken(currentUser, true);
        setToken(newToken);
        console.log("Token refreshed", newToken.substring(0, 10) + "...");
        return newToken;
      }
      return null;
    } catch (error) {
      console.error("Error refreshing token:", error);
      setError("Unable to refresh authorization token");
      return null;
    }
  }

  // Check authentication state
  async function checkAuthState() {
    if (!currentUser) {
      console.log("Warning: User not logged in, cannot perform operations requiring authentication");
      return false;
    }
    
    // Ensure token is valid
    if (!token) {
      try {
        const newToken = await refreshToken();
        return !!newToken;
      } catch (e) {
        console.error("Failed to check authentication status", e);
        return false;
      }
    }
    
    return true;
  }

  // Backup user to PostgreSQL database
  async function backupUserData(user) {
    if (user && user.email) {
      try {
        await saveUserToPostgres(user.uid, user.email);
      } catch (error) {
        console.error("PostgreSQL backup failed, but continuing...", error);
        // Don't interrupt main authentication flow because of backup failure
      }
    }
  }

  // Sign up function
  async function signup(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update profile with display name
      await updateProfile(userCredential.user, { displayName });
      
      // Backup user data to PostgreSQL
      await backupUserData(userCredential.user);
      
      // Refresh token immediately after successful registration
      if (userCredential.user) {
        await refreshToken();
      }
      
      return userCredential;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  // Login function
  async function login(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Backup user data to PostgreSQL on login as well
      await backupUserData(result.user);
      
      // Refresh token immediately after successful login
      if (result.user) {
        await refreshToken();
      }
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  // Google sign in function
  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, provider);
      
      // Backup user data to PostgreSQL
      await backupUserData(result.user);
      
      // Refresh token immediately after successful Google login
      if (result.user) {
        await refreshToken();
      }
      
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  // Logout function
  async function logout() {
    try {
      await signOut(auth);
      setToken(null);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(profile) {
    try {
      if (currentUser) {
        await updateProfile(currentUser, profile);
        // Force refresh the user
        setCurrentUser({ ...currentUser, ...profile });
        
        // If email is updated, update in PostgreSQL as well
        if (profile.email && currentUser.email !== profile.email) {
          await backupUserData({...currentUser, ...profile});
        }
        
        // Refresh token after profile update
        await refreshToken();
        setProfileUpdateTrigger(prev => prev + 1);
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  // Refresh token after profile update
  useEffect(() => {
    if (profileUpdateTrigger > 0 && currentUser) {
      refreshToken();
    }
  }, [profileUpdateTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic token refresh (every 30 minutes)
  useEffect(() => {
    if (!currentUser) return;
    
    // Initial refresh
    refreshToken();
    
    // Set up periodic refresh (Firebase tokens typically valid for 1 hour)
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(refreshInterval);
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up authentication state listener...");
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Authentication state change:", user ? `User logged in: ${user.uid}` : "User not logged in");
      setCurrentUser(user);
      
      // Backup user data when auth state changes (e.g., on refresh after login)
      if (user) {
        try {
          await backupUserData(user);
          await refreshToken();
        } catch (e) {
          console.error("Failed to process auth state change operations", e);
        }
      } else {
        setToken(null);
      }
      
      setLoading(false);
      setAuthInitialized(true);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to check if user is guest
  function isGuest() {
    return currentUser === null;
  }

  const value = {
    currentUser,
    error,
    token,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateUserProfile,
    refreshToken,
    isGuest,
    checkAuthState,
    authInitialized
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 