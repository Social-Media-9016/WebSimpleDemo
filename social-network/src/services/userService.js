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
import { db, auth } from '../config/firebase';
import { 
  uploadImageToStorage, 
  deleteImageFromStorage 
} from './firebaseStorageService';
import { saveUserToPostgres } from './dbService';

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
    
    // If profile contains email, back it up to PostgreSQL
    if (profileUpdate.email) {
      try {
        await saveUserToPostgres(userId, profileUpdate.email);
      } catch (pgError) {
        console.error("Failed to backup user to PostgreSQL:", pgError);
        // Don't interrupt the main operation due to backup failure
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
          
          // Also backup to PostgreSQL
          if (email) {
            try {
              await saveUserToPostgres(userId, email);
            } catch (pgError) {
              console.error("Failed to backup user to PostgreSQL:", pgError);
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