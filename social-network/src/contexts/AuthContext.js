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

  // Refresh token function
  async function refreshToken() {
    try {
      if (currentUser) {
        const newToken = await getIdToken(currentUser, true);
        setToken(newToken);
        return newToken;
      }
      return null;
    } catch (error) {
      console.error("刷新令牌时出错:", error);
      setError("无法刷新授权令牌");
      return null;
    }
  }

  // Sign up function
  async function signup(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Update profile with display name
      await updateProfile(userCredential.user, { displayName });
      
      // 注册成功后立即刷新令牌
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
      
      // 登录成功后立即刷新令牌
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
      
      // Google 登录成功后立即刷新令牌
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
        
        // 更新个人资料后刷新令牌
        await refreshToken();
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  // 定期刷新令牌（每50分钟刷新一次）
  useEffect(() => {
    if (!currentUser) return;
    
    // 初始刷新
    refreshToken();
    
    // 设置定期刷新（Firebase 令牌通常有效期为 1 小时）
    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 50 * 60 * 1000); // 50 分钟
    
    return () => clearInterval(refreshInterval);
  }, [currentUser]);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // 当用户状态改变时刷新令牌
      if (user) {
        try {
          await refreshToken();
        } catch (e) {
          console.error("用户状态改变时刷新令牌失败", e);
        }
      } else {
        setToken(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

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
    isGuest
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 