import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { bulkSaveUsers } from './dbService';

/**
 * Sync all user data from Firebase to PostgreSQL
 * @returns {Promise<Object>} Sync result
 */
export const syncUsersToPostgres = async () => {
  try {
    console.log('Starting user data sync to PostgreSQL...');
    
    // Get current logged-in user info from Firebase Auth
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      return { 
        success: false, 
        message: 'Must be logged in as admin to sync user data',
        usersProcessed: 0
      };
    }
    
    // Get all user profiles from Firestore
    const usersRef = collection(db, 'userProfiles');
    const querySnapshot = await getDocs(usersRef);
    
    // Prepare array of users to sync
    const users = [];
    querySnapshot.forEach(doc => {
      const userData = doc.data();
      // Only sync users with email field
      if (userData.email) {
        users.push({
          id: doc.id,
          email: userData.email
        });
      }
    });
    
    console.log(`Found ${users.length} users to sync`);
    
    // Bulk save to PostgreSQL
    if (users.length > 0) {
      const savedCount = await bulkSaveUsers(users);
      
      console.log(`Successfully synced ${savedCount}/${users.length} users to PostgreSQL`);
      return {
        success: true,
        message: `Successfully synced ${savedCount}/${users.length} users to PostgreSQL`,
        usersProcessed: savedCount
      };
    } else {
      return { 
        success: true, 
        message: 'No users found to sync',
        usersProcessed: 0
      };
    }
  } catch (error) {
    console.error('Error syncing users to PostgreSQL:', error);
    return { 
      success: false, 
      message: `Error syncing users: ${error.message}`,
      usersProcessed: 0
    };
  }
};

/**
 * Check sync status and perform automatic sync periodically (can be called from admin panel)
 * @param {number} syncIntervalHours - Sync interval in hours
 * @returns {Promise<Object>} Operation result
 */
export const setupPeriodicSync = async (syncIntervalHours = 24) => {
  // This could implement a mechanism to store the last sync time in localStorage or Firestore
  // and decide whether to perform sync based on the specified interval
  
  try {
    const lastSyncTimeStr = localStorage.getItem('lastUserSyncTime');
    const now = new Date();
    
    if (!lastSyncTimeStr) {
      // Never synced before, execute immediately
      const result = await syncUsersToPostgres();
      if (result.success) {
        localStorage.setItem('lastUserSyncTime', now.toISOString());
      }
      return result;
    }
    
    const lastSyncTime = new Date(lastSyncTimeStr);
    const hoursSinceLastSync = (now - lastSyncTime) / (1000 * 60 * 60);
    
    if (hoursSinceLastSync >= syncIntervalHours) {
      // Exceeded sync interval, perform sync
      const result = await syncUsersToPostgres();
      if (result.success) {
        localStorage.setItem('lastUserSyncTime', now.toISOString());
      }
      return result;
    } else {
      return {
        success: true,
        message: `Last sync was ${Math.round(hoursSinceLastSync)} hours ago. Next sync in ${Math.round(syncIntervalHours - hoursSinceLastSync)} hours.`,
        usersProcessed: 0
      };
    }
  } catch (error) {
    console.error('Error in periodic sync setup:', error);
    return {
      success: false,
      message: `Error setting up periodic sync: ${error.message}`,
      usersProcessed: 0
    };
  }
};

export default {
  syncUsersToPostgres,
  setupPeriodicSync
}; 