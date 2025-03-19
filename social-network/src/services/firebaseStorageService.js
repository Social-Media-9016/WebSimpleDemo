import { storage } from '../config/firebase';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable
} from 'firebase/storage';
import { getAuth, getIdToken } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * 生成图片唯一ID
 * @returns {string} 唯一ID
 */
export const generateImageId = () => {
  return uuidv4();
};

/**
 * 等待指定的毫秒数
 * @param {number} ms - 等待的毫秒数
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 刷新当前用户的身份令牌
 * 这有助于解决 CORS 问题，因为新的令牌会附加到请求中
 * @returns {Promise<string|null>} 返回新的令牌或 null（如果用户未登录）
 */
const refreshAuthToken = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log("用户未登录，无法刷新令牌");
      return null;
    }
    
    // 强制刷新令牌
    const token = await getIdToken(user, true);
    console.log("身份令牌已刷新");
    return token;
  } catch (error) {
    console.error("刷新身份令牌失败:", error);
    return null;
  }
};

/**
 * 使用可恢复上传将图片上传到Firebase Storage
 * 这种方式更可靠，可以避免某些CORS问题，并支持进度回调
 * @param {File} file - 要上传的图片文件
 * @param {string} type - 内容类型 ('posts' 或 'comments')
 * @param {string} userId - 上传者的用户ID
 * @param {Function} progressCallback - 进度回调函数
 * @returns {Promise<{path: string, url: string}>} 保存的图片路径和URL
 */
export const uploadImageToStorage = async (file, type, userId, progressCallback = null) => {
  if (!file) return null;
  
  try {
    // 刷新认证令牌以避免 CORS 问题
    await refreshAuthToken();
    
    // 生成图片唯一ID
    const imageId = generateImageId();
    const extension = file.name.split('.').pop();
    const fileName = `${userId}_${imageId}.${extension}`;
    
    // 创建Firebase Storage引用路径
    const storagePath = `uploads/${type}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    console.log(`开始上传图片...`);
    
    // 准备元数据
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        originalName: file.name,
        uploadTime: new Date().toISOString()
      }
    };
    
    // 创建可恢复上传任务
    const uploadTask = uploadBytesResumable(storageRef, file, metadata);
    
    // 返回一个Promise，在上传完成时解析
    return new Promise((resolve, reject) => {
      // 监听上传进度
      uploadTask.on('state_changed', 
        // 进度回调
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`上传进度: ${progress.toFixed(2)}%`);
          
          if (progressCallback && typeof progressCallback === 'function') {
            progressCallback(progress);
          }
        },
        // 错误回调
        (error) => {
          console.error("上传过程中出错:", error);
          reject(error);
        },
        // 完成回调
        async () => {
          try {
            // 获取下载URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            console.log(`图片上传成功!`);
            console.log(`Firebase Storage Path: ${storagePath}`);
            console.log(`Firebase Storage URL: ${downloadURL}`);
            
            // 返回路径和URL
            resolve({
              path: storagePath,
              url: downloadURL
            });
          } catch (urlError) {
            console.error("获取下载URL出错:", urlError);
            reject(urlError);
          }
        }
      );
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    throw error;
  }
};

/**
 * 从Firebase Storage删除图片
 * @param {string} imagePath - 要删除的图片路径
 * @returns {Promise<void>}
 */
export const deleteImageFromStorage = async (imagePath) => {
  if (!imagePath) return;
  
  try {
    // 刷新认证令牌以避免 CORS 问题
    await refreshAuthToken();
    
    // 检查是否是Firebase Storage路径
    if (imagePath.startsWith('uploads/')) {
      const imageRef = ref(storage, imagePath);
      await deleteObject(imageRef);
      console.log(`图片已从Firebase Storage删除: ${imagePath}`);
      return;
    } else {
      console.log(`不是Firebase Storage路径，跳过删除: ${imagePath}`);
      return;
    }
  } catch (error) {
    console.error('删除图片失败:', error);
    
    // 如果是文件不存在，不抛出异常
    if (error.code === 'storage/object-not-found') {
      console.log('文件不存在，无需删除');
      return;
    }
    
    // 其他错误则抛出
    throw error;
  }
}; 