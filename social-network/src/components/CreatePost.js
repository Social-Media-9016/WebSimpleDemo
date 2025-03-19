import React, { useState, useRef, useEffect } from 'react';
import { FaImage, FaTimesCircle, FaPaperPlane } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { addPost } from '../services/postService';
import './CreatePost.css';

export default function CreatePost({ onPostCreated, editingPost, onCancelEdit }) {
  const { currentUser, userProfile } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // 如果是编辑模式，则填充表单
  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || '');
      if (editingPost.imageUrl) {
        setImagePreviewUrl(editingPost.imageUrl);
      }
    }
  }, [editingPost]);

  // 处理文本框高度自适应
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(150, textareaRef.current.scrollHeight)}px`;
    }
  }, [content]);

  const handleContentChange = (e) => {
    setContent(e.target.value);
    setError('');
  };

  const handleImageChange = (e) => {
    e.preventDefault();
    
    const file = e.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.type.match('image.*')) {
      setError('请选择图片文件');
      return;
    }
    
    // 验证文件大小（限制为5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过5MB');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(file);
      setImagePreviewUrl(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim() && !image && !imagePreviewUrl) {
      setError('请输入内容或上传图片');
      return;
    }
    
    try {
      setIsLoading(true);
      setError('');
      
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress((prevProgress) => {
          const newProgress = prevProgress + (5 + Math.random() * 10);
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      if (editingPost) {
        // 编辑现有帖子的逻辑
        // 这里假设服务层有updatePost方法
        await updatePost(editingPost.id, {
          content: content.trim(),
          imageFile: image,
          currentImageUrl: !image && imagePreviewUrl ? imagePreviewUrl : null,
        }, (progress) => {
          setUploadProgress(progress);
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // 完成编辑，清理表单
        setTimeout(() => {
          setContent('');
          setImage(null);
          setImagePreviewUrl('');
          setUploadProgress(0);
          setIsLoading(false);
          
          if (typeof onPostCreated === 'function') {
            onPostCreated();
          }
          
          if (typeof onCancelEdit === 'function') {
            onCancelEdit();
          }
        }, 1000);
      } else {
        // 创建新帖子
        await addPost({
          content: content.trim(),
          imageFile: image,
          userId: currentUser.uid,
          author: userProfile?.displayName || currentUser.email,
        }, (progress) => {
          setUploadProgress(progress);
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        // 清理表单
        setTimeout(() => {
          setContent('');
          setImage(null);
          setImagePreviewUrl('');
          setUploadProgress(0);
          setIsLoading(false);
          
          if (typeof onPostCreated === 'function') {
            onPostCreated();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('发布失败，请稍后重试');
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // 获取用户头像或占位符
  const getUserInitial = () => {
    if (userProfile && userProfile.displayName) {
      return userProfile.displayName.charAt(0).toUpperCase();
    } else if (currentUser && currentUser.email) {
      return currentUser.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
    <div className="create-post">
      <div className="create-post-header">
        {userProfile?.photoURL ? (
          <img src={userProfile.photoURL} alt={userProfile.displayName || ''} className="create-post-avatar" />
        ) : (
          <div className="create-post-avatar-placeholder">
            {getUserInitial()}
          </div>
        )}
        
        <form className="create-post-form" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            className="create-post-textarea"
            placeholder={editingPost ? "编辑你的帖子..." : "分享你的想法..."}
            value={content}
            onChange={handleContentChange}
            disabled={isLoading}
            rows={1}
          />
          
          {imagePreviewUrl && (
            <div className="create-post-preview">
              <img
                src={imagePreviewUrl}
                alt="预览"
                className="create-post-image-preview"
              />
              <button
                type="button"
                className="create-post-remove-image"
                onClick={handleRemoveImage}
                aria-label="移除图片"
              >
                <FaTimesCircle />
              </button>
            </div>
          )}
          
          <div className="create-post-actions">
            <div className="create-post-options">
              <label className="create-post-option" htmlFor="image-upload">
                <FaImage className="create-post-option-icon" />
                <span>图片</span>
                <input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  className="create-post-upload-input"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isLoading}
                />
              </label>
            </div>
            
            <button
              type="submit"
              className="create-post-submit"
              disabled={(!content.trim() && !image && !imagePreviewUrl) || isLoading}
            >
              {editingPost ? '更新' : '发布'}
              <FaPaperPlane className="create-post-submit-icon" />
            </button>
          </div>
          
          {error && <p className="create-post-message">{error}</p>}
          
          {isLoading && (
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          
          {editingPost && (
            <div className="create-post-footer">
              <button
                type="button"
                className="create-post-option"
                onClick={onCancelEdit}
                disabled={isLoading}
              >
                取消编辑
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 