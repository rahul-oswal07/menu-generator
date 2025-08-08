import React, { useEffect, useRef, useState } from 'react';
import './LazyImage.css';

interface LazyImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  placeholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
  quality?: 'low' | 'medium' | 'high';
  sizes?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholder,
  onLoad,
  onError,
  onClick,
  quality = 'medium',
  sizes
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate different quality versions of the image URL
  const generateImageSrc = (originalSrc: string, targetQuality: string) => {
    if (!originalSrc) return '';

    // Add quality parameter to the URL
    const url = new URL(originalSrc, window.location.origin);
    url.searchParams.set('quality', targetQuality);
    return url.toString();
  };

  // Progressive loading: start with low quality, then load high quality
  useEffect(() => {
    if (!isInView || !src) return;

    const loadImage = async () => {
      try {
        // First load low quality version for immediate feedback
        if (quality === 'high') {
          const lowQualitySrc = generateImageSrc(src, 'low');
          setCurrentSrc(lowQualitySrc);

          // Preload the high quality version
          const highQualityImg = new Image();
          highQualityImg.onload = () => {
            setCurrentSrc(generateImageSrc(src, 'high'));
            setIsLoaded(true);
            onLoad?.();
          };
          highQualityImg.onerror = () => {
            setHasError(true);
            onError?.();
          };
          highQualityImg.src = generateImageSrc(src, 'high');
        } else {
          setCurrentSrc(generateImageSrc(src, quality));
        }
      } catch (error) {
        setHasError(true);
        onError?.();
      }
    };

    loadImage();
  }, [isInView, src, quality, onLoad, onError]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const currentImgRef = imgRef.current;
    if (!currentImgRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    observerRef.current.observe(currentImgRef);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleImageLoad = () => {
    if (quality !== 'high') {
      setIsLoaded(true);
      onLoad?.();
    }
  };

  const handleImageError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div className={`lazy-image-error ${className}`}>
        <div className="error-placeholder">
          <span className="error-icon">🖼️</span>
          <span className="error-text">Failed to load image</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`lazy-image-container ${className}`} ref={imgRef}>
      {/* Placeholder while loading */}
      {!isLoaded && isInView && (
        <div className="lazy-image-placeholder">
          {placeholder ? (
            <img src={placeholder} alt="" className="placeholder-img" />
          ) : (
            <div className="default-placeholder">
              <div className="loading-spinner"></div>
              <span>Loading...</span>
            </div>
          )}
        </div>
      )}

      {/* Blur placeholder for progressive loading */}
      {!isLoaded && !placeholder && isInView && (
        <div className="blur-placeholder"></div>
      )}

      {/* Main image */}
      {isInView && currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : 'loading'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={onClick}
          sizes={sizes}
          loading="lazy" // Native lazy loading as fallback
        />
      )}
    </div>
  );
};

export default LazyImage;