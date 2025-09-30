import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  Image,
  PhotoLibrary,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from '../../utils/constants';

const UploadContainer = styled(Card)(({ theme }) => ({
  minHeight: 400,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  border: '2px dashed #dadce0',
  backgroundColor: '#fafafa',
  cursor: 'pointer',
  transition: 'all var(--motion-duration, 0.3s) var(--motion-easing, ease)',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: '#f5f7fa',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  '&.drag-active': {
    borderColor: theme.palette.primary.main,
    backgroundColor: '#e3f2fd',
    borderStyle: 'solid',
  },
}));

const UploadIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 80,
  height: 80,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  color: '#fff',
  marginBottom: theme.spacing(2),
  '& svg': {
    fontSize: 40,
  },
}));

const UploadButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  borderRadius: 24,
  padding: '12px 32px',
  fontWeight: 500,
}));

const SampleImagesContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const SampleImageGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: theme.spacing(2),
  maxWidth: 600,
  width: '100%',
  marginTop: theme.spacing(2),
}));

const SampleImageCard = styled(Card)(({ theme }) => ({
  cursor: 'pointer',
  transition: 'all var(--motion-duration, 0.2s) var(--motion-easing, ease)',
  '&:hover': {
    transform: 'var(--motion-transform, translateY(-2px))',
    boxShadow: theme.shadows[4],
  },
}));

const SampleImage = styled('img')(() => ({
  width: '100%',
  height: 120,
  objectFit: 'cover',
  borderRadius: '4px 4px 0 0',
}));

interface UploadAreaProps {
  onFilesUpload: (files: File[]) => void;
  isUploading?: boolean;
}

// Sample images for demonstration - using data URLs to avoid external dependencies
const sampleImages = [
  {
    id: 'sample-1',
    name: 'AI Portrait',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY2NkY0Ii8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIj5BSSBQb3J0cmFpdDwvdGV4dD4KPHN2ZyB4PSI3NSIgeT0iMTQwIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik0xMiAyYzUuNTIgMCAxMCA0LjQ4IDEwIDEwIDAgNS41Mi00LjQ4IDEwLTEwIDEwUzIgMTcuNTIgMiAxMiAyIDYuNDggMiAyem0wIDNjLTEuNjYgMC0zIDEuMzQtMyAzIDAgMS42NiAxLjM0IDMgMyAzIDEuNjYgMCAzLTEuMzQgMy0zIDAtMS42Ni0xLjM0LTMtMy0zem0wIDEwYzIuMTcgMCAzLjg1LS44NyA1LTJWMTZjMC0xLjMzLTIuNjctMi01LTJzLTUgLjY3LTUgMnYxYzEuMTUgMS4xMyAyLjgzIDIgNSAyeiIvPgo8L3N2Zz4KPC9zdmc+',
    description: 'Test with AI portrait',
  },
  {
    id: 'sample-2',
    name: 'Digital Art',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRkY6MTczIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIj5EaWdpdGFsIEFydDwvdGV4dD4KPHN2ZyB4PSI3NSIgeT0iMTQwIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik05IDExSDdWMTNoMnYtMnptNCA0SDlWMTFoNHY0em00LTRIMTNWMTFoNHY0em0tMiAwaC0ydjRoMlYxNXoiLz4KPHN2ZyB4PSIxIiB5PSI4IiB3aWR0aD0iMjIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Ik05IDEwSDdWMmg2djhIOXptMiAwaDE4VjJINnY4SDl6TTcgMmgxMHY4SDdWMnoiLz4KPC9zdmc+Cjwvc3ZnPgo8L3N2Zz4K',
    description: 'Test with digital art',
  },
  {
    id: 'sample-3',
    name: 'Real Photo',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNENBRjUwIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIj5SZWFsIFBob3RvPC90ZXh0Pgo8c3ZnIHg9Ijc1IiB5PSIxNDAiIHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9IndoaXRlIj4KPHA+YXRoIGQ9Ik05IDJsMS0xaDR2MmgtNlYyem00IDBoMXY0SDl2LTJIMTZ2Mmg0VjBabS05IDloMlY5aDR2MkgtNFY5em02IDBWOWgxMHYySDE4VjlaTTIyIDJWMGgtNFYySDJ2MTRIMTJWM0gxNHYxaDZ2LTJabTAgMnYxMEgyVjJoMjB6Ii8+Cjwvc3ZnPgo8L3N2Zz4K',
    description: 'Test with real photo',
  },
  {
    id: 'sample-4',
    name: 'Generated Scene',
    url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMDAzQ0FFIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMTMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIj5HZW5lcmF0ZWQgU2NlbmU8L3RleHQ+Cjxzdmcgej0iNzUiIHk9IjE0MCIgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxMDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPgo8cGF0aCBkPSJtMTkgOWgtNGwtMTEgMEgxdjJoM3Y5aDEyVjIwaDJWMTlIM1YxMUg5djhIMTJWMTFIM1Y5aDE2di0yeiIvPgo8L3N2Zz4KPC9zdmc+',
    description: 'Test with AI landscape',
  },
];

const UploadArea: React.FC<UploadAreaProps> = ({ onFilesUpload, isUploading = false }) => {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        const firstRejected = rejectedFiles[0];
        if (firstRejected.errors.some((e) => e.code === 'file-too-large')) {
          setError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        } else if (firstRejected.errors.some((e) => e.code === 'file-invalid-type')) {
          setError('Please upload only image files (JPEG, PNG, GIF, WebP)');
        } else {
          setError('Invalid file. Please try again.');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFilesUpload(acceptedFiles);
      }
    },
    [onFilesUpload]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    noClick: true, // We'll handle click manually to avoid conflicts
  });

  const handleSampleImageClick = (imageUrl: string, imageName: string) => {
    // Convert sample image URL to File object for testing
    fetch(imageUrl)
      .then((response) => response.blob())
      .then((blob) => {
        // Use appropriate file type based on the data URL
        const fileType = imageUrl.startsWith('data:image/svg+xml') ? 'image/svg+xml' : 'image/jpeg';
        const fileName = imageUrl.startsWith('data:image/svg+xml') ? `${imageName}.svg` : `${imageName}.jpg`;
        const file = new File([blob], fileName, { type: fileType });
        onFilesUpload([file]);
      })
      .catch(() => {
        setError('Failed to load sample image. Please try uploading your own image.');
      });
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 2, sm: 3, md: 4 } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <UploadContainer
        {...getRootProps()}
        className={isDragActive ? 'drag-active' : ''}
        elevation={0}
        data-testid="dropzone-root"
        role="button"
        aria-label="Upload images by dragging and dropping or clicking to browse. Supports JPEG, PNG, GIF, WebP up to 10MB each."
        aria-describedby="upload-instructions"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
      >
        <input {...getInputProps()} aria-hidden="true" />
        <CardContent sx={{ p: 4 }}>
          <UploadIcon aria-hidden="true">
            <CloudUpload />
          </UploadIcon>

          <Typography
            variant="h5"
            gutterBottom
            sx={{ fontWeight: 400 }}
            component="h2"
          >
            {isDragActive ? 'Drop images here' : 'Drag & Drop Images Here'}
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 2, maxWidth: 400 }}
            id="upload-instructions"
          >
            {isDragActive
              ? 'Release to upload your images'
              : 'Choose files or drag them here. Press Enter or Space to browse files.'}
          </Typography>

          <UploadButton
            variant="contained"
            size="large"
            onClick={open}
            disabled={isUploading}
            startIcon={<Image />}
            aria-label={isUploading ? 'Processing images...' : 'Browse and select image files'}
          >
            {isUploading ? 'Processing...' : 'Choose Images'}
          </UploadButton>

          <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
            Supports JPEG, PNG, GIF, WebP up to {MAX_FILE_SIZE / 1024 / 1024}MB each
          </Typography>
        </CardContent>
      </UploadContainer>

      <SampleImagesContainer>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhotoLibrary color="action" />
          <Typography variant="h6" color="text.secondary">
            Try with sample images
          </Typography>
        </Box>

        <SampleImageGrid>
          {sampleImages.map((sample) => (
            <Box
              key={sample.id}
              component="button"
              role="button"
              tabIndex={0}
              aria-label={`Use sample image: ${sample.name} - ${sample.description}`}
              onClick={() => handleSampleImageClick(sample.url, sample.name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSampleImageClick(sample.url, sample.name);
                }
              }}
              sx={{
                cursor: 'pointer',
                transition: 'all var(--motion-duration, 0.2s) var(--motion-easing, ease)',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                backgroundColor: 'transparent',
                '&:hover .sample-card': {
                  transform: 'var(--motion-transform, translateY(-2px))',
                  boxShadow: (theme) => theme.shadows[4],
                },
                '&:focus': {
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: '2px',
                },
              }}
            >
              <SampleImageCard
                className="sample-card"
                elevation={1}
                sx={{
                  cursor: 'pointer',
                  transition: 'all var(--motion-duration, 0.2s) var(--motion-easing, ease)',
                }}
              >
                <SampleImage
                  src={sample.url}
                  alt={`${sample.name} - ${sample.description}`}
                  loading="lazy"
                />
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" noWrap component="h3">
                    {sample.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {sample.description}
                  </Typography>
                </CardContent>
              </SampleImageCard>
            </Box>
          ))}
        </SampleImageGrid>
      </SampleImagesContainer>
    </Box>
  );
};

export default UploadArea;