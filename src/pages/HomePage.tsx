import React, { useCallback, useEffect, useRef } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import UploadArea from '../components/UploadArea';
import { ImageGrid } from '../components/ImageGrid';
import ThemeDemo from '../components/ThemeDemo';
import { useSearch } from '../hooks/useSearch';
import type { UploadedImage } from '../types';

interface HomePageProps {
  uploadTriggerRef?: React.MutableRefObject<(() => void) | null>;
  uploadedImages: UploadedImage[];
  setUploadedImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>;
}

const HomePage: React.FC<HomePageProps> = ({ uploadTriggerRef, uploadedImages, setUploadedImages }) => {
  const { filteredImages } = useSearch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connect the upload trigger to the file input
  useEffect(() => {
    if (uploadTriggerRef) {
      uploadTriggerRef.current = () => {
        fileInputRef.current?.click();
      };
    }
  }, [uploadTriggerRef]);

  const handleFilesUpload = useCallback((files: File[]) => {
    console.log('Files uploaded:', files);

    // Convert files to UploadedImage objects
    const newImages: UploadedImage[] = files.map((file) => {
      const objectUrl = URL.createObjectURL(file);

      return {
        id: crypto.randomUUID(),
        file,
        url: objectUrl,
        preview: objectUrl,
        uploadedAt: new Date(),
        status: 'uploading',
        name: file.name,
        size: file.size,
        dimensions: {
          width: 0, // Will be calculated when image loads
          height: 0,
        },
      };
    });

    setUploadedImages((prev) => [...prev, ...newImages]);

    // Simulate AI detection process
    newImages.forEach((image, index) => {
      setTimeout(() => {
        setUploadedImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  status: 'analyzing',
                }
              : img
          )
        );

        // Simulate analysis completion after 2 seconds
        setTimeout(() => {
          const mockAnalysis = {
            imageId: image.id,
            confidence: Math.random() * 0.4 + 0.6, // Random confidence between 60-100%
            isAiGenerated: Math.random() > 0.5,
            analysis: {
              model: 'Hive AI Detection v2.1',
              timestamp: new Date(),
              breakdown: {
                humanLikelihood: Math.random() * 0.6 + 0.2, // 20-80%
                aiArtifacts: Math.random() * 0.8 + 0.1, // 10-90%
                processingQuality: Math.random() * 0.3 + 0.7, // 70-100%
                technicalScore: Math.random() * 100,
                artifactScore: Math.random() * 100,
                consistencyScore: Math.random() * 100,
                details: [
                  'Analyzed pixel consistency patterns',
                  'Checked for typical AI generation artifacts',
                  'Evaluated compression markers',
                  'Assessed edge sharpness and noise patterns',
                ],
              },
            },
          };

          setUploadedImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? {
                    ...img,
                    status: 'completed',
                    analysis: mockAnalysis,
                  }
                : img
            )
          );
        }, 2000);
      }, index * 500); // Stagger the analysis start times
    });
  }, [setUploadedImages]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      handleFilesUpload(files);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  }, [handleFilesUpload]);

  const handleImageDelete = useCallback((imageId: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
  }, [setUploadedImages]);

  const handleImageDownload = useCallback((image: UploadedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleImageShare = useCallback((image: UploadedImage) => {
    if (navigator.share) {
      navigator.share({
        title: 'AI Detection Result',
        text: `Analysis: ${image.analysis?.isAiGenerated ? 'AI Generated' : 'Human Created'} (${Math.round((image.analysis?.confidence || 0) * 100)}% confidence)`,
        url: window.location.href
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      const text = `AI Detection Result: ${image.analysis?.isAiGenerated ? 'AI Generated' : 'Human Created'} (${Math.round((image.analysis?.confidence || 0) * 100)}% confidence)`;
      navigator.clipboard.writeText(text).catch(console.error);
    }
  }, []);

  return (
    <Box sx={{ py: 3, width: '100%', px: 0 }}>
      {/* Hidden file input for header upload button */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />
      {uploadedImages.length === 0 ? (
        <UploadArea onFilesUpload={handleFilesUpload} />
      ) : (
        <ImageGrid
          images={filteredImages}
          onImageDelete={handleImageDelete}
          onImageDownload={handleImageDownload}
          onImageShare={handleImageShare}
        />
      )}

      {/* Theme Demo Section */}
      <Divider sx={{ my: 4 }} />
      <Typography variant="h5" component="h2" gutterBottom>
        Dark Mode Demo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Test the theme switching functionality and see all Material-UI components in action:
      </Typography>
      <ThemeDemo />
    </Box>
  );
};

export default HomePage;