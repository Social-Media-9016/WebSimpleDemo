import React, { useState } from 'react';
import './ImageRenderer.css';

/**
 * 图片渲染组件 - 处理来自Firebase Storage的图片
 */
const ImageRenderer = ({ src, alt, className, onClick }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <div className={`image-renderer ${className || ''}`}>
      {loading && <div className="image-loading"><div className="spinner"></div></div>}
      
      {error ? (
        <div className="image-error">
          <span>无法加载图片</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt || "图片"}
          className={`image-content ${loading ? 'loading' : 'loaded'}`}
          onLoad={handleLoad}
          onError={handleError}
          onClick={onClick}
        />
      )}
    </div>
  );
};

export default ImageRenderer; 