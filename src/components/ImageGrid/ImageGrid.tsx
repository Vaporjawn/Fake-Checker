import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Download,
  Share,
  Delete,
  CheckCircle,
  Cancel,
  Help,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import LazyImage from '../LazyImage';
import type { UploadedImage, DetectionResult } from '../../types';

const ImageCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  cursor: 'pointer',
  transition: 'all var(--motion-duration, 0.3s) var(--motion-easing, ease)',
  '&:hover': {
    transform: 'var(--motion-transform, translateY(-2px))',
    boxShadow: theme.shadows[8],
  },
}));

const ImageContainer = styled(Box)(() => ({
  position: 'relative',
  overflow: 'hidden',
  paddingTop: '75%', // 4:3 Aspect Ratio
}));



const OverlayActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(1),
  right: theme.spacing(1),
  display: 'flex',
  gap: theme.spacing(0.5),
  opacity: 0,
  transition: 'opacity var(--motion-duration, 0.3s) var(--motion-easing, ease)',
  '.MuiCard-root:hover &': {
    opacity: 1,
  },
}));

const ConfidenceChip = styled(Chip)<{ confidence: number }>(({ theme, confidence }) => ({
  position: 'absolute',
  bottom: theme.spacing(1),
  left: theme.spacing(1),
  fontWeight: 600,
  color: '#fff',
  backgroundColor:
    confidence >= 0.8
      ? theme.palette.success.main
      : confidence >= 0.6
      ? theme.palette.warning.main
      : theme.palette.error.main,
}));

const DetailsList = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  marginTop: theme.spacing(2),
}));

const DetailItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.shape.borderRadius,
}));

interface ImageGridProps {
  images: UploadedImage[];
  onImageDelete: (id: string) => void;
  onImageDownload: (image: UploadedImage) => void;
  onImageShare: (image: UploadedImage) => void;
}

const ImageGrid: React.FC<ImageGridProps> = React.memo(({
  images,
  onImageDelete,
  onImageDownload,
  onImageShare,
}) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [imageDimensions, setImageDimensions] = useState<Record<string, {width: number; height: number}>>({});

  const toggleExpand = (imageId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(imageId)) {
      newExpanded.delete(imageId);
    } else {
      newExpanded.add(imageId);
    }
    setExpandedCards(newExpanded);
  };

  const handleImageLoad = (imageId: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions(prev => ({
      ...prev,
      [imageId]: {
        width: img.naturalWidth,
        height: img.naturalHeight
      }
    }));
  };

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => new Set([...prev, imageId]));
  };

  const getResultIcon = (result: DetectionResult) => {
    if (result.isAiGenerated) {
      return <Cancel color="error" />;
    }
    return <CheckCircle color="success" />;
  };

  const getResultText = (result: DetectionResult) => {
    if (result.isAiGenerated) {
      return 'AI Generated';
    }
    return 'Real Image';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  if (images.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Help sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6">No images analyzed yet</Typography>
        <Typography variant="body2">
          Upload some images to see the AI detection results here
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 1,
        px: { xs: 2, sm: 3, md: 4 },
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(auto-fill, minmax(250px, 1fr))',
          sm: 'repeat(auto-fill, minmax(280px, 1fr))',
          md: 'repeat(auto-fill, minmax(300px, 1fr))',
        },
        gap: 3,
      }}
    >
      {images.map((image) => {
        const isExpanded = expandedCards.has(image.id);

        return (
          <ImageCard
            key={image.id}
            elevation={2}
            role="img"
            aria-labelledby={`image-title-${image.id}`}
            aria-describedby={`image-details-${image.id}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpand(image.id);
              }
            }}
            sx={{
              '&:focus': {
                outline: '2px solid',
                outlineColor: 'primary.main',
                outlineOffset: '2px',
              },
            }}
          >
              <ImageContainer>
                <LazyImage
                  src={image.preview}
                  alt={`${image.file.name} - ${
                    image.analysis
                      ? `${getResultText(image.analysis)} with ${Math.round(image.analysis.confidence * 100)}% confidence`
                      : 'Analysis pending'
                  }`}
                  onLoad={() => handleImageLoad(image.id, {} as React.SyntheticEvent<HTMLImageElement>)}
                  onError={() => handleImageError(image.id)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: imageErrors.has(image.id) ? 'none' : 'block'
                  }}
                />

                {imageErrors.has(image.id) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f5f5f5',
                      color: 'text.secondary'
                    }}
                  >
                    <Typography variant="body2">Failed to load image</Typography>
                  </Box>
                )}

                <OverlayActions role="toolbar" aria-label={`Actions for ${image.file.name}`}>
                  <Tooltip title={`Download ${image.file.name}`}>
                    <IconButton
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageDownload(image);
                      }}
                      aria-label={`Download ${image.file.name}`}
                    >
                      <Download fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={`Share ${image.file.name}`}>
                    <IconButton
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageShare(image);
                      }}
                      aria-label={`Share ${image.file.name}`}
                    >
                      <Share fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={`Delete ${image.file.name}`}>
                    <IconButton
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,1)' }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageDelete(image.id);
                      }}
                      aria-label={`Delete ${image.file.name}`}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </OverlayActions>

                {image.analysis && (
                  <ConfidenceChip
                    confidence={image.analysis.confidence}
                    label={`${Math.round(image.analysis.confidence * 100)}%`}
                    size="small"
                  />
                )}
              </ImageContainer>

              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography
                    variant="subtitle2"
                    noWrap
                    sx={{ flex: 1, mr: 1 }}
                    id={`image-title-${image.id}`}
                    component="h3"
                  >
                    {image.file.name}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() => toggleExpand(image.id)}
                    aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${image.file.name}`}
                    aria-expanded={isExpanded}
                    aria-controls={`image-details-${image.id}`}
                  >
                    {isExpanded ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                {image.analysis && (
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    role="status"
                    aria-live="polite"
                  >
                    {getResultIcon(image.analysis)}
                    <Typography
                      variant="body2"
                      color={image.analysis.isAiGenerated ? 'error' : 'success.main'}
                      fontWeight={600}
                    >
                      {getResultText(image.analysis)}
                    </Typography>
                  </Box>
                )}

                <Collapse in={isExpanded}>
                  <DetailsList
                    id={`image-details-${image.id}`}
                    role="region"
                    aria-label={`Detailed information for ${image.file.name}`}
                  >
                    <DetailItem>
                      <Typography variant="caption" color="text.secondary">
                        File Size
                      </Typography>
                      <Typography variant="caption">
                        {(image.file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </DetailItem>

                    <DetailItem>
                      <Typography variant="caption" color="text.secondary">
                        Dimensions
                      </Typography>
                      <Typography variant="caption">
                        {imageDimensions[image.id]?.width || image.dimensions?.width || 'N/A'} × {imageDimensions[image.id]?.height || image.dimensions?.height || 'N/A'}
                      </Typography>
                    </DetailItem>

                    {image.analysis && (
                      <>
                        <DetailItem>
                          <Typography variant="caption" color="text.secondary">
                            Confidence
                          </Typography>
                          <Chip
                            size="small"
                            label={`${Math.round(image.analysis.confidence * 100)}%`}
                            color={getConfidenceColor(image.analysis.confidence)}
                          />
                        </DetailItem>

                        {image.analysis?.analysis?.breakdown && (
                          <>
                            <DetailItem>
                              <Typography variant="caption" color="text.secondary">
                                Human Features
                              </Typography>
                              <Typography variant="caption">
                                {Math.round(image.analysis.analysis.breakdown.humanLikelihood * 100)}%
                              </Typography>
                            </DetailItem>

                            <DetailItem>
                              <Typography variant="caption" color="text.secondary">
                                AI Artifacts
                              </Typography>
                              <Typography variant="caption">
                                {Math.round(image.analysis.analysis.breakdown.aiArtifacts * 100)}%
                              </Typography>
                            </DetailItem>

                            <DetailItem>
                              <Typography variant="caption" color="text.secondary">
                                Processing Quality
                              </Typography>
                              <Typography variant="caption">
                                {Math.round(image.analysis.analysis.breakdown.processingQuality * 100)}%
                              </Typography>
                            </DetailItem>
                          </>
                        )}

                        <DetailItem>
                          <Typography variant="caption" color="text.secondary">
                            Analyzed
                          </Typography>
                          <Typography variant="caption">
                            {new Date(image.uploadedAt).toLocaleString()}
                          </Typography>
                        </DetailItem>
                      </>
                    )}
                  </DetailsList>
                </Collapse>
              </CardContent>
            </ImageCard>
        );
      })}
    </Box>
  );
});

export { ImageGrid };