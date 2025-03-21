import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, storage } from '../config/firebase';
import { 
  uploadImageToStorage, 
  deleteImageFromStorage 
} from './firebaseStorageService';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { userApi } from './apiService';

// Create or update user profile
export const updateUserProfile = async (
  userId, 
  profileData, 
  avatarFile = null
) => {
  try {
    console.log(`Updating profile for user: ${userId}`);
    
    // Handle profile image upload if provided
    let avatarData = null;
    if (avatarFile) {
      avatarData = await uploadImageToStorage(
        avatarFile, 
        'avatars', 
        userId
      );
    }
    
    // Create profile update data
    const profileUpdate = {
      ...profileData,
      updatedAt: serverTimestamp()
    };
    
    // Add avatar URL and path if uploaded
    if (avatarData) {
      profileUpdate.photoURL = avatarData.url;
      profileUpdate.avatarPath = avatarData.path;
    }
    
    // Get reference to user profile document
    const userProfileRef = doc(db, 'userProfiles', userId);
    
    // Check if user profile exists
    const docSnap = await getDoc(userProfileRef);
    
    if (docSnap.exists()) {
      // Update existing profile
      await updateDoc(userProfileRef, profileUpdate);
      console.log(`Profile updated for user: ${userId}`);
    } else {
      // Create new profile with creation timestamp
      profileUpdate.createdAt = serverTimestamp();
      
      // Set default fields if not provided
      if (!profileUpdate.displayName) {
        profileUpdate.displayName = `User_${userId.substring(0, 5)}`;
      }
      
      await setDoc(userProfileRef, profileUpdate);
      console.log(`Profile created for user: ${userId}`);
    }
    
    // 如果资料包含邮箱，通过API同步到后端
    if (profileUpdate.email) {
      try {
        await userApi.saveUser({
          id: userId,
          email: profileUpdate.email
        });
      } catch (apiError) {
        console.error("同步用户到后端API失败:", apiError);
        // 不中断主操作
      }
    }
    
    return { 
      id: userId, 
      ...profileUpdate,
      // Replace server timestamp with client timestamp for immediate display
      updatedAt: new Date(),
      ...(profileUpdate.createdAt ? { createdAt: new Date() } : {})
    };
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

// Get user profile by ID
export const getUserProfile = async (userId) => {
  if (!userId) {
    console.error('getUserProfile called with null/undefined userId');
    return null;
  }
  
  try {
    console.log(`Getting profile for user: ${userId}`);
    
    // Get user profile from Firestore
    const userProfileRef = doc(db, 'userProfiles', userId);
    const docSnap = await getDoc(userProfileRef);
    
    if (docSnap.exists()) {
      // Return profile data
      const profileData = docSnap.data();
      console.log(`Profile found for user: ${userId}`);
      return { 
        id: userId, 
        ...profileData 
      };
    } else {
      // Try to get info from backend API
      try {
        const apiUserData = await userApi.getUser(userId);
        if (apiUserData?.data) {
          const apiProfile = apiUserData.data;
          console.log(`No local profile found, using API data for: ${userId}`);
          
          // Create minimal profile from API data
          const minimalProfile = {
            displayName: apiProfile.displayName || `User_${userId.substring(0, 5)}`,
            email: apiProfile.email,
            photoURL: apiProfile.photoURL
          };
          
          // Create the profile in the database for future use
          await setDoc(userProfileRef, {
            ...minimalProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          return { id: userId, ...minimalProfile };
        }
      } catch (apiError) {
        console.error("Error getting user data from API:", apiError);
      }
      
      // Try to get basic info from Firebase Auth if available
      try {
        // Check if this is the current user
        if (auth.currentUser && auth.currentUser.uid === userId) {
          const { displayName, email, photoURL } = auth.currentUser;
          console.log(`No profile found, using auth data for: ${userId}`);
          
          // Create minimal profile from auth data
          const minimalProfile = {
            displayName: displayName || `User_${userId.substring(0, 5)}`,
            email,
            photoURL
          };
          
          // Create the profile in the database for future use
          await setDoc(userProfileRef, {
            ...minimalProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // 同步到后端
          if (email) {
            try {
              await userApi.saveUser({
                id: userId,
                email: email
              });
            } catch (apiError) {
              console.error("同步用户到后端API失败:", apiError);
            }
          }
          
          return { id: userId, ...minimalProfile };
        }
      } catch (authError) {
        console.error("Error getting auth user data:", authError);
      }
      
      // Return minimal fallback profile if nothing else is available
      console.log(`No profile found for user: ${userId}`);
      return { 
        id: userId, 
        displayName: `User_${userId.substring(0, 5)}`,
        email: null,
        photoURL: null
      };
    }
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Search users by display name
export const searchUsers = async (query, limit = 10) => {
  try {
    // Convert query to lowercase for case-insensitive search
    const searchQuery = query.toLowerCase();
    
    // Get all user profiles (could be optimized with proper indexing)
    const userProfilesRef = collection(db, 'userProfiles');
    const querySnapshot = await getDocs(userProfilesRef);
    
    // Filter and sort matched profiles
    const matchedProfiles = [];
    
    querySnapshot.forEach((doc) => {
      const profile = doc.data();
      const displayName = (profile.displayName || '').toLowerCase();
      
      // Check if display name contains the search query
      if (displayName.includes(searchQuery)) {
        matchedProfiles.push({
          id: doc.id,
          ...profile,
          // Calculate relevance score based on position of match
          relevance: displayName.indexOf(searchQuery)
        });
      }
    });
    
    // Sort by relevance (matches at beginning of name first)
    matchedProfiles.sort((a, b) => a.relevance - b.relevance);
    
    // Return limited results
    return matchedProfiles.slice(0, limit);
  } catch (error) {
    console.error("Error searching users:", error);
    throw error;
  }
};

/**
 * 创建新用户
 * @param {string} email - 用户邮箱
 * @param {string} password - 用户密码
 * @returns {Promise<object>} - 新创建的用户
 */
export const createUser = async (email, password) => {
  try {
    // 使用Firebase创建用户
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 初始化Firestore中的用户资料
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName: '',
      photoURL: '',
      bio: '',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 使用API将用户同步到后端
    try {
      await userApi.saveUser({
        id: user.uid,
        email: user.email
      });
    } catch (apiError) {
      console.error('同步用户到后端失败:', apiError);
      // 不阻止用户创建流程继续
    }
    
    // 发送验证邮件
    await sendEmailVerification(user);
    
    return user;
  } catch (error) {
    console.error('创建用户时出错:', error);
    throw error;
  }
};

/**
 * 用户登录
 * @param {string} email - 用户邮箱
 * @param {string} password - 用户密码
 * @returns {Promise<object>} - 登录的用户
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('用户登录时出错:', error);
    throw error;
  }
};

/**
 * 用户登出
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('用户登出时出错:', error);
    throw error;
  }
};

/**
 * 上传用户头像
 * @param {string} userId - 用户ID
 * @param {File} imageFile - 图片文件
 * @returns {Promise<string>} - 头像URL
 */
export const uploadUserAvatar = async (userId, imageFile) => {
  try {
    const fileExtension = imageFile.name.split('.').pop();
    const fileName = `avatars/${userId}_${uuidv4()}.${fileExtension}`;
    const avatarRef = ref(storage, fileName);
    
    // 上传文件
    await uploadBytes(avatarRef, imageFile);
    
    // 获取URL
    const downloadURL = await getDownloadURL(avatarRef);
    
    // 更新用户资料
    await updateUserProfile(userId, { photoURL: downloadURL });
    
    // 如果为当前用户，也更新Auth资料
    if (auth.currentUser && auth.currentUser.uid === userId) {
      await updateProfile(auth.currentUser, {
        photoURL: downloadURL
      });
    }
    
    return downloadURL;
  } catch (error) {
    console.error('上传用户头像时出错:', error);
    throw error;
  }
};

/**
 * 发送密码重置邮件
 * @param {string} email - 用户邮箱
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('发送密码重置邮件时出错:', error);
    throw error;
  }
}; 