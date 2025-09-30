import React, { useState, useMemo } from 'react';
import { Box, Skeleton } from '@mui/material';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  style?: React.CSSProperties;
}

/**
 * LazyImage component with loading states and error handling
 * Implements intersection observer for efficient lazy loading
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  onLoad,
  onError,
  style
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string>('');

  // Use Intersection Observer for lazy loading
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  const handleImageLoad = () => {
    setImageState('loaded');
    onLoad?.();
  };

  const handleImageError = () => {
    setImageState('error');
    onError?.();
  };

  // Memoize skeleton to prevent unnecessary re-renders
  const skeletonFallback = useMemo(() => (
    <Skeleton
      variant="rectangular"
      width="100%"
      height="200px"
      animation="wave"
      sx={{ borderRadius: 1 }}
    />
  ), []);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '200px' }}>
      {imageState === 'loading' && !imageSrc && skeletonFallback}

      {imageSrc && (
        <>
          {imageState === 'loading' && skeletonFallback}

          <img
            ref={imgRef}
            src={imageSrc}
            alt={alt}
            className={className}
            style={{
              ...style,
              display: imageState === 'loaded' ? 'block' : 'none',
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            decoding="async"
          />

          {imageState === 'error' && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                backgroundColor: 'grey.100',
                borderRadius: 1,
                color: 'text.secondary'
              }}
            >
              Failed to load image
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default React.memo(LazyImage);