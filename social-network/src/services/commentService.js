import { 
  collection, 
  addDoc, 
  getDocs,
  getDoc,
  deleteDoc, 
  doc,
  query, 
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { uploadImageToStorage, deleteImageFromStorage } from './firebaseStorageService';
import { updateCommentCount } from './postService';

// Create a new comment
export const createComment = async (postId, content, userId, userName, userPhotoURL = null, imageFile = null) => {
  if (!postId) throw new Error('Post ID is required');
  
  try {
    console.log(`Creating comment: postId=${postId}, userId=${userId}`);
    
    // Upload image (if any)
    let imageData = null;
    if (imageFile) {
      imageData = await uploadImageToStorage(imageFile, 'comments', userId);
    }
    
    const comment = {
      postId,
      content,
      userId,
      userName,
      userPhotoURL,
      createdAt: serverTimestamp()
    };
    
    // Add image info to comment data if available
    if (imageData) {
      comment.imageURL = imageData.url;
      comment.imagePath = imageData.path;
    }
    
    const docRef = await addDoc(collection(db, 'comments'), comment);
    console.log(`Comment created successfully, ID: ${docRef.id}`);
    
    // Update comment count on the post
    await updateCommentCount(postId, 1);
    
    // Since serverTimestamp() is created on the server, the client can't get it immediately
    // So we return a temporary timestamp for frontend display
    return { 
      id: docRef.id, 
      ...comment,
      createdAt: new Date() // Temporary timestamp for immediate display
    };
  } catch (error) {
    console.error("Error creating comment:", error);
    throw error;
  }
};

// Get comments for a post
export const getCommentsByPostId = async (postId) => {
  if (!postId) throw new Error('Post ID is required');
  
  try {
    console.log(`Getting comments for post: postId=${postId}`);
    
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'desc') // Changed to descending order, newest first
    );
    
    console.log('Executing query...');
    const querySnapshot = await getDocs(q);
    console.log(`Query completed, retrieved ${querySnapshot.docs.length} comments`);
    
    const comments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return comments;
  } catch (error) {
    console.error("Error getting comments:", error, JSON.stringify(error));
    // If it's an index error, provide more specific info
    if (error.code === 'failed-precondition' || error.message.includes('index')) {
      throw new Error('Index creation needed. Please click the link in the console to create the index, then try again.');
    }
    throw error;
  }
};

// Delete a comment
export const deleteComment = async (commentId) => {
  if (!commentId) throw new Error('Comment ID is required');
  
  try {
    console.log(`Deleting comment: commentId=${commentId}`);
    
    // Get the comment to find its postId
    const commentRef = doc(db, 'comments', commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error("Comment not found");
    }
    
    const comment = commentSnap.data();
    
    // Delete the image if comment has one
    if (comment.imagePath) {
      await deleteImageFromStorage(comment.imagePath);
    }
    
    // Delete the comment
    await deleteDoc(commentRef);
    console.log(`Comment deleted: ${commentId}`);
    
    // Update the post's comment count
    await updateCommentCount(comment.postId, -1);
    
    return true;
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw error;
  }
}; 