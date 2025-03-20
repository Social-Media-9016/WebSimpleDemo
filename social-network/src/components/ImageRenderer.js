import React, { useState } from 'react';
import './ImageRenderer.css';

/**
 * Image Renderer Component - Handles images from Firebase Storage
 * Provides fallback UI when image fails to load and loading state
 */
function ImageRenderer({ src, alt, className = '', style = {}, onClick }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`image-renderer ${className}`} style={style}>
      {isLoading && <div className="image-loading-placeholder">Loading...</div>}
      
      {hasError ? (
        <div className="image-error-placeholder">
          <span>Unable to load image</span>
        </div>
      ) : (
        <img 
          src={src} 
          alt={alt || "Image"} 
          onLoad={handleLoad} 
          onError={handleError}
          onClick={onClick}
          style={{ display: isLoading ? 'none' : 'block' }}
          className="image-content"
        />
      )}
    </div>
  );
}

export default ImageRenderer; 