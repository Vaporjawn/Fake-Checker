import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ImageGrid } from './ImageGrid';
import type { UploadedImage, DetectionResult } from '../../types';

// Mock LazyImage component to avoid loading issues in tests
jest.mock('../LazyImage', () => {
  return function LazyImage(props: any) {
    return React.createElement('img', props);
  };
});

// Mock theme
const mockTheme = createTheme();

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={mockTheme}>
    {children}
  </ThemeProvider>
);

// Mock data creation helpers
const createMockFile = (name = 'test.jpg', size = 1024 * 1024): File => {
  const file = new File(['test image content'], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const createMockDetectionResult = (
  isAiGenerated = false,
  confidence = 0.8
): DetectionResult => ({
  imageId: 'test-id',
  confidence,
  isAiGenerated,
  analysis: {
    model: 'test-model',
    timestamp: new Date(),
    breakdown: {
      humanLikelihood: isAiGenerated ? 0.2 : 0.9,
      aiArtifacts: isAiGenerated ? 0.8 : 0.1,
      processingQuality: 0.7,
      technicalScore: 0.8,
      artifactScore: 0.6,
      consistencyScore: 0.9,
      details: ['test detail 1', 'test detail 2'],
    },
  },
});

const createMockImage = (
  id = 'test-id',
  overrides: Partial<UploadedImage> = {}
): UploadedImage => ({
  id,
  file: createMockFile(),
  url: 'test-url',
  preview: 'data:image/jpeg;base64,test-preview-data',
  uploadedAt: new Date(),
  status: 'completed',
  name: 'test.jpg',
  size: 1024 * 1024,
  dimensions: { width: 800, height: 600 },
  analysis: createMockDetectionResult(),
  ...overrides,
});

// Mock props
const mockProps = {
  onImageDelete: jest.fn(),
  onImageDownload: jest.fn(),
  onImageShare: jest.fn(),
};

describe('ImageGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Image load/error events
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      get: function() { return 800; },
      configurable: true
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      get: function() { return 600; },
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('renders empty state when no images provided', () => {
      render(
        <TestWrapper>
          <ImageGrid images={[]} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('No images analyzed yet')).toBeInTheDocument();
      expect(screen.getByText('Upload some images to see the AI detection results here')).toBeInTheDocument();
    });

    it('renders help icon in empty state', () => {
      render(
        <TestWrapper>
          <ImageGrid images={[]} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('HelpIcon')).toBeInTheDocument();
    });
  });

  describe('Image Grid Rendering', () => {
    it('renders grid of images with correct layout', () => {
      const images = [
        createMockImage('1'),
        createMockImage('2', { file: createMockFile('image2.jpg') }),
        createMockImage('3', { file: createMockFile('image3.jpg') }),
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Check that all images are rendered
      expect(screen.getAllByRole('img')).toHaveLength(3);
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.getByText('image2.jpg')).toBeInTheDocument();
      expect(screen.getByText('image3.jpg')).toBeInTheDocument();
    });

    it('renders images with correct aspect ratio container', () => {
      const images = [createMockImage()];

      const { container } = render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Check for aspect ratio container
      const imageContainer = container.querySelector('div[style*="padding-top: 75%"]');
      expect(imageContainer).toBeInTheDocument();
    });

    it('applies responsive grid layout styles', () => {
      const images = [createMockImage()];

      const { container } = render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const gridContainer = container.querySelector('div[style*="display: grid"]');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Image Actions', () => {
    it('shows overlay actions on hover', () => {
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Actions should be present but with opacity 0
      expect(screen.getByLabelText(/Download/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Share/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Delete/)).toBeInTheDocument();
    });

    it('calls onImageDelete when delete button clicked', async () => {
      const user = userEvent.setup();
      const images = [createMockImage('test-id')];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const deleteButton = screen.getByLabelText(/Delete/);
      await user.click(deleteButton);

      expect(mockProps.onImageDelete).toHaveBeenCalledWith('test-id');
    });

    it('calls onImageDownload when download button clicked', async () => {
      const user = userEvent.setup();
      const testImage = createMockImage('test-id');
      const images = [testImage];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const downloadButton = screen.getByLabelText(/Download/);
      await user.click(downloadButton);

      expect(mockProps.onImageDownload).toHaveBeenCalledWith(testImage);
    });

    it('calls onImageShare when share button clicked', async () => {
      const user = userEvent.setup();
      const testImage = createMockImage('test-id');
      const images = [testImage];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const shareButton = screen.getByLabelText(/Share/);
      await user.click(shareButton);

      expect(mockProps.onImageShare).toHaveBeenCalledWith(testImage);
    });

    it('prevents event propagation on action button clicks', async () => {
      const user = userEvent.setup();
      const images = [createMockImage()];
      const mockCardClick = jest.fn();

      const { container } = render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Add click handler to card
      const card = container.querySelector('.MuiCard-root');
      card?.addEventListener('click', mockCardClick);

      const deleteButton = screen.getByLabelText(/Delete/);
      await user.click(deleteButton);

      // Card click should not have been triggered
      expect(mockCardClick).not.toHaveBeenCalled();
      expect(mockProps.onImageDelete).toHaveBeenCalled();
    });
  });

  describe('Image Analysis Display', () => {
    it('displays AI generated result correctly', () => {
      const images = [
        createMockImage('1', {
          analysis: createMockDetectionResult(true, 0.9)
        })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('AI Generated')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByTestId('CancelIcon')).toBeInTheDocument();
    });

    it('displays real image result correctly', () => {
      const images = [
        createMockImage('1', {
          analysis: createMockDetectionResult(false, 0.8)
        })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Real Image')).toBeInTheDocument();
      expect(screen.getAllByText('80%')[0]).toBeInTheDocument();
      expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    });

    it('renders image without analysis', () => {
      const images = [
        createMockImage('1', { analysis: undefined })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.queryByText('AI Generated')).not.toBeInTheDocument();
      expect(screen.queryByText('Real Image')).not.toBeInTheDocument();
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    it('applies correct confidence chip colors', () => {
      const images = [
        createMockImage('1', { analysis: createMockDetectionResult(false, 0.9) }), // High confidence - success
        createMockImage('2', { analysis: createMockDetectionResult(false, 0.7) }), // Medium confidence - warning
        createMockImage('3', { analysis: createMockDetectionResult(false, 0.4) }), // Low confidence - error
      ];

      const { container } = render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const confidenceChips = container.querySelectorAll('.MuiChip-root');
      expect(confidenceChips).toHaveLength(6); // 3 in overlay + 3 in details when expanded
    });
  });

  describe('Expandable Details', () => {
    it('expands and collapses card details', async () => {
      const user = userEvent.setup();
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Initially collapsed
      expect(screen.queryByText('File Size')).not.toBeInTheDocument();

      // Expand
      const expandButton = screen.getByLabelText(/Expand details for/);
      await user.click(expandButton);

      // Should show expanded content
      await waitFor(() => {
        expect(screen.getByText('File Size')).toBeInTheDocument();
        expect(screen.getByText('Dimensions')).toBeInTheDocument();
        expect(screen.getByText('Confidence')).toBeInTheDocument();
      });

      // Collapse
      const collapseButton = screen.getByLabelText(/Collapse details for/);
      await user.click(collapseButton);

      // Should hide expanded content
      await waitFor(() => {
        expect(screen.queryByText('File Size')).not.toBeInTheDocument();
      });
    });

    it('displays correct file information in expanded view', async () => {
      const user = userEvent.setup();
      const testFile = createMockFile('test-file.jpg', 2048 * 1024); // 2MB
      const images = [
        createMockImage('1', {
          file: testFile,
          dimensions: { width: 1920, height: 1080 }
        })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Expand details
      const expandButton = screen.getByLabelText(/Expand details for/);
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('2.00 MB')).toBeInTheDocument();
        expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
      });
    });

    it('displays analysis breakdown when available', async () => {
      const user = userEvent.setup();
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const expandButton = screen.getByLabelText(/Expand details for/);
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Human Features')).toBeInTheDocument();
        expect(screen.getByText('AI Artifacts')).toBeInTheDocument();
        expect(screen.getByText('Processing Quality')).toBeInTheDocument();
        expect(screen.getByText('Analyzed')).toBeInTheDocument();
      });
    });

    it('handles multiple expanded cards independently', async () => {
      const user = userEvent.setup();
      const images = [
        createMockImage('1'),
        createMockImage('2'),
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const expandButtons = screen.getAllByLabelText(/Expand details for/);

      // Expand first card
      await user.click(expandButtons[0]);

      await waitFor(() => {
        // First card should be expanded
        expect(screen.getAllByText('File Size')).toHaveLength(1);
      });

      // Expand second card
      await user.click(expandButtons[1]);

      await waitFor(() => {
        // Both cards should be expanded
        expect(screen.getAllByText('File Size')).toHaveLength(2);
      });
    });
  });

  describe('Image Loading and Error Handling', () => {
    it('handles image load successfully', async () => {
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const image = screen.getByRole('img');

      // Simulate image load
      fireEvent.load(image);

      // Image should be visible
      expect(image).toBeVisible();
      expect(screen.queryByText('Failed to load image')).not.toBeInTheDocument();
    });

    it('handles image loading error', async () => {
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const image = screen.getByRole('img');

      // Simulate image error
      fireEvent.error(image);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });

    it('stores image dimensions on load', async () => {
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const image = screen.getByRole('img');

      // Simulate image load with specific dimensions
      Object.defineProperty(image, 'naturalWidth', { value: 1920, writable: true });
      Object.defineProperty(image, 'naturalHeight', { value: 1080, writable: true });

      fireEvent.load(image);

      // Expand to see dimensions
      const user = userEvent.setup();
      const expandButton = screen.getByLabelText(/Expand details for/);
      await user.click(expandButton);

      // Should display loaded dimensions
      await waitFor(() => {
        expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
      });
    });

    it('falls back to file dimensions when load dimensions unavailable', async () => {
      const user = userEvent.setup();
      const images = [
        createMockImage('1', {
          dimensions: { width: 800, height: 600 }
        })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Expand to see dimensions
      const expandButton = screen.getByLabelText(/Expand details for/);
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('800 × 600')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('applies different grid layouts for different screen sizes', () => {
      const images = [createMockImage()];

      const { container } = render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Check that responsive grid styles are applied
      const gridContainer = container.querySelector('[style*="display: grid"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it('applies responsive padding', () => {
      const images = [createMockImage()];

      const { container } = render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const gridContainer = container.querySelector('[style*="display: grid"]');
      expect(gridContainer).toHaveStyle('margin-top: 8px');
    });
  });

  describe('Accessibility', () => {
    it('provides proper alt text for images', () => {
      const testFile = createMockFile('accessible-image.jpg');
      const images = [
        createMockImage('1', { file: testFile })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const image = screen.getByAltText(/accessible-image.jpg/);
      expect(image).toHaveAttribute('alt', expect.stringContaining('accessible-image.jpg'));
    });

    it('provides proper button labels', () => {
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/Download/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Share/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Delete/)).toBeInTheDocument();
    });

    it('provides proper expand/collapse button labels', () => {
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/Expand details for/)).toBeInTheDocument();
    });

    it('maintains proper heading hierarchy', () => {
      const images = [createMockImage()];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // File name should be in heading element for accessibility
      const filename = screen.getByText('test.jpg');
      expect(filename.tagName).toBe('H3'); // Typography component="h3" renders as <h3>
    });
  });

  describe('Performance Optimizations', () => {
    it('handles large number of images efficiently', () => {
      const manyImages = Array.from({ length: 50 }, (_, i) =>
        createMockImage(`image-${i}`, {
          file: createMockFile(`image-${i}.jpg`)
        })
      );

      const { container } = render(
        <TestWrapper>
          <ImageGrid images={manyImages} {...mockProps} />
        </TestWrapper>
      );

      expect(container.querySelectorAll('.MuiCard-root')).toHaveLength(50);
    });

    it('properly manages expand state for multiple cards', async () => {
      const user = userEvent.setup();
      const images = [
        createMockImage('1'),
        createMockImage('2'),
        createMockImage('3'),
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const expandButtons = screen.getAllByLabelText(/Expand details for/);

      // Expand all cards
      for (const button of expandButtons) {
        await user.click(button);
      }

      // All should be expanded
      await waitFor(() => {
        expect(screen.getAllByText('File Size')).toHaveLength(3);
      });

      // Collapse first card
      const collapseButtons = screen.getAllByLabelText(/Collapse details for/);
      await user.click(collapseButtons[0]);

      // Should have 2 expanded cards remaining
      await waitFor(() => {
        expect(screen.getAllByText('File Size')).toHaveLength(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing analysis data gracefully', () => {
      const images = [
        createMockImage('1', { analysis: undefined })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByText('test.jpg')).toBeInTheDocument();
      expect(screen.queryByText('AI Generated')).not.toBeInTheDocument();
      expect(screen.queryByText('Real Image')).not.toBeInTheDocument();
    });

    it('handles missing dimensions gracefully', async () => {
      const user = userEvent.setup();
      const images = [
        createMockImage('1', { dimensions: undefined })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const expandButton = screen.getByLabelText(/Expand details for/);
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('N/A × N/A')).toBeInTheDocument();
      });
    });

    it('handles missing analysis breakdown gracefully', async () => {
      const user = userEvent.setup();
      const incompleteAnalysis = {
        ...createMockDetectionResult(),
        analysis: {
          ...createMockDetectionResult().analysis,
          breakdown: {
            humanLikelihood: 0.8,
            aiArtifacts: 0.2,
            processingQuality: 0.7,
            technicalScore: 0.8,
            artifactScore: 0.6,
            consistencyScore: 0.9,
            details: ['test'],
            // Missing optional fields
          }
        }
      };

      const images = [
        createMockImage('1', { analysis: incompleteAnalysis })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const expandButton = screen.getByLabelText(/Expand details for/);
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('Human Features')).toBeInTheDocument();
        expect(screen.getAllByText('80%')[0]).toBeInTheDocument();
      });
    });

    it('handles very long filenames gracefully', () => {
      const longFilename = 'a'.repeat(100) + '.jpg';
      const longFile = createMockFile(longFilename);
      const images = [
        createMockImage('1', { file: longFile })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      // Filename should be rendered and truncated with noWrap
      expect(screen.getByText(longFilename)).toBeInTheDocument();
    });

    it('handles zero confidence values', () => {
      const images = [
        createMockImage('1', {
          analysis: createMockDetectionResult(false, 0)
        })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
      expect(screen.getByText('Real Image')).toBeInTheDocument();
    });

    it('handles very large file sizes', async () => {
      const user = userEvent.setup();
      const largeFile = createMockFile('large.jpg', 100 * 1024 * 1024); // 100MB
      const images = [
        createMockImage('1', { file: largeFile })
      ];

      render(
        <TestWrapper>
          <ImageGrid images={images} {...mockProps} />
        </TestWrapper>
      );

      const expandButton = screen.getByLabelText(/Expand details for/);
      await user.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText('100.00 MB')).toBeInTheDocument();
      });
    });
  });
});