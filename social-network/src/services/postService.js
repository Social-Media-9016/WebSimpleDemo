import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query, 
  orderBy, 
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadImageToStorage, deleteImageFromStorage } from './firebaseStorageService';

// Create a new post
export const createPost = async (content, userId, userName, userPhotoURL = null, imageFile = null) => {
  try {
    // Upload image (if any)
    let imageData = null;
    if (imageFile) {
      imageData = await uploadImageToStorage(imageFile, 'posts', userId);
    }
    
    const post = {
      content,
      userId,
      userName,
      userPhotoURL,
      createdAt: serverTimestamp(),
      likes: [],
      commentCount: 0
    };
    
    // Add image info to post data if available
    if (imageData) {
      post.imageURL = imageData.url;
      post.imagePath = imageData.path;
    }
    
    const docRef = await addDoc(collection(db, 'posts'), post);
    
    // Since serverTimestamp() is created on the server, the client can't get it immediately
    // So we return a temporary timestamp for frontend display
    return { 
      id: docRef.id, 
      ...post,
      createdAt: new Date() // Temporary timestamp for immediate display
    };
  } catch (error) {
    console.error("Error creating post: ", error);
    throw error;
  }
};

// Get all posts
export const getAllPosts = async () => {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting posts: ", error);
    throw error;
  }
};

// Get a single post by ID
export const getPostById = async (postId) => {
  try {
    const docRef = doc(db, 'posts', postId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Post not found");
    }
  } catch (error) {
    console.error("Error getting post: ", error);
    throw error;
  }
};

// Get posts by user ID
export const getPostsByUser = async (userId) => {
  try {
    const q = query(
      collection(db, 'posts'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error getting user posts: ", error);
    throw error;
  }
};

// Like/unlike a post
export const toggleLike = async (postId, userId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }
    
    const post = postSnap.data();
    const likes = post.likes || [];
    
    // Toggle like
    let updatedLikes;
    if (likes.includes(userId)) {
      updatedLikes = likes.filter(id => id !== userId);
    } else {
      updatedLikes = [...likes, userId];
    }
    
    await updateDoc(postRef, { likes: updatedLikes });
    return { ...post, id: postId, likes: updatedLikes };
  } catch (error) {
    console.error("Error toggling like: ", error);
    throw error;
  }
};

// Delete a post
export const deletePost = async (postId) => {
  try {
    // Get post info
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }
    
    const post = postSnap.data();
    
    // Delete image if post has one
    if (post.imagePath) {
      await deleteImageFromStorage(post.imagePath);
    }
    
    await deleteDoc(postRef);
    return true;
  } catch (error) {
    console.error("Error deleting post: ", error);
    throw error;
  }
};

// Update comment count
export const updateCommentCount = async (postId, increment = 1) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error("Post not found");
    }
    
    const post = postSnap.data();
    const currentCount = post.commentCount || 0;
    const newCount = currentCount + increment;
    
    await updateDoc(postRef, { commentCount: newCount });
    return newCount;
  } catch (error) {
    console.error("Error updating comment count: ", error);
    throw error;
  }
}; 