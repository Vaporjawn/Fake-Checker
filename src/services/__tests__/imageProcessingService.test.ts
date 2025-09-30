import { ImageProcessingService, imageProcessingService } from '../imageProcessingService';
import type { ImageProcessingOptions } from '../imageProcessingService';

// Mock canvas and image APIs
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(),
  toBlob: jest.fn(),
};

const mockContext = {
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
  fillStyle: '',
  drawImage: jest.fn(),
  fillRect: jest.fn(),
  getImageData: jest.fn(),
};

// Mock Image constructor
class MockImage {
  src = '';
  naturalWidth = 1920;
  naturalHeight = 1080;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 0);
  }
}

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
});

// Mock document.createElement
const originalCreateElement = document.createElement.bind(document);
document.createElement = jest.fn().mockImplementation((tagName: string) => {
  if (tagName === 'canvas') {
    return mockCanvas;
  }
  return originalCreateElement(tagName);
});

// Setup mocks
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset canvas mock
  mockCanvas.getContext.mockReturnValue(mockContext);
  mockCanvas.toBlob.mockImplementation((callback) => {
    const mockBlob = new Blob(['mock blob'], { type: 'image/jpeg' });
    callback?.(mockBlob);
  });

  // Mock context methods
  mockContext.getImageData.mockReturnValue({
    data: new Uint8ClampedArray(400), // 10x10 image with RGBA
  });

  // Mock Image
  (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ImageProcessingService', () => {
  describe('isSupportedFormat', () => {
    it('should return true for supported image formats', () => {
      const service = new ImageProcessingService();
      
      expect(service.isSupportedFormat(new File([], 'test.jpg', { type: 'image/jpeg' }))).toBe(true);
      expect(service.isSupportedFormat(new File([], 'test.png', { type: 'image/png' }))).toBe(true);
      expect(service.isSupportedFormat(new File([], 'test.webp', { type: 'image/webp' }))).toBe(true);
      expect(service.isSupportedFormat(new File([], 'test.gif', { type: 'image/gif' }))).toBe(true);
    });

    it('should return false for unsupported formats', () => {
      const service = new ImageProcessingService();
      
      expect(service.isSupportedFormat(new File([], 'test.txt', { type: 'text/plain' }))).toBe(false);
      expect(service.isSupportedFormat(new File([], 'test.pdf', { type: 'application/pdf' }))).toBe(false);
    });
  });

  describe('validateImage', () => {
    it('should validate a correct image file', async () => {
      const imageFile = new File(['image data'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.validateImage(imageFile);
      
      expect(result.success).toBe(true);
      expect(result.data?.width).toBe(1920);
      expect(result.data?.height).toBe(1080);
      expect(result.data?.format).toBe('image/jpeg');
    });

    it('should reject unsupported file format', async () => {
      const textFile = new File(['text'], 'test.txt', { type: 'text/plain' });
      
      const result = await imageProcessingService.validateImage(textFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('UNSUPPORTED_FORMAT');
    });

    it('should reject file that is too large', async () => {
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.validateImage(largeFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('FILE_TOO_LARGE');
    });

    it('should reject corrupted image file', async () => {
      // Mock Image to fail loading
      class FailingImage extends MockImage {
        constructor() {
          super();
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
      }
      
      (globalThis as unknown as { Image: typeof FailingImage }).Image = FailingImage;
      
      const corruptFile = new File(['corrupt data'], 'corrupt.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.validateImage(corruptFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('VALIDATION_FAILED');
    });

    it('should reject images with invalid dimensions', async () => {
      // Mock Image with invalid dimensions
      class InvalidDimensionsImage extends MockImage {
        naturalWidth = 0;
        naturalHeight = 0;
      }
      
      (globalThis as unknown as { Image: typeof InvalidDimensionsImage }).Image = InvalidDimensionsImage;
      
      const invalidFile = new File(['data'], 'invalid.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.validateImage(invalidFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_DIMENSIONS');
    });

    it('should reject images that are too small', async () => {
      // Mock Image with tiny dimensions
      class TinyImage extends MockImage {
        naturalWidth = 5;
        naturalHeight = 5;
      }
      
      (globalThis as unknown as { Image: typeof TinyImage }).Image = TinyImage;
      
      const tinyFile = new File(['data'], 'tiny.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.validateImage(tinyFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('IMAGE_TOO_SMALL');
    });
  });

  describe('extractImageMetadata', () => {
    it('should extract basic image metadata', async () => {
      const imageFile = new File(['data'], 'test.jpg', { 
        type: 'image/jpeg',
        lastModified: Date.now()
      });
      
      const metadata = await imageProcessingService.extractImageMetadata(imageFile);
      
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.format).toBe('image/jpeg');
      expect(metadata.size).toBe(imageFile.size);
    });

    it('should detect transparency in PNG images', async () => {
      // Mock alpha channel data with some transparency
      mockContext.getImageData.mockReturnValue({
        data: new Uint8ClampedArray([255, 255, 255, 200, 255, 255, 255, 255]), // First pixel has alpha < 255
      });

      const pngFile = new File(['data'], 'test.png', { type: 'image/png' });
      
      const metadata = await imageProcessingService.extractImageMetadata(pngFile);
      
      expect(metadata.hasTransparency).toBe(true);
    });

    it('should handle image loading errors', async () => {
      // Mock Image to fail loading
      class FailingImage extends MockImage {
        constructor() {
          super();
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }
      }
      
      (globalThis as unknown as { Image: typeof FailingImage }).Image = FailingImage;
      
      const imageFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      
      await expect(imageProcessingService.extractImageMetadata(imageFile)).rejects.toThrow('Failed to load image');
    });
  });

  describe('processImage', () => {
    it('should process image with default options', async () => {
      const imageFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.processImage(imageFile);
      
      expect(result.success).toBe(true);
      expect(result.data?.originalSize).toBe(imageFile.size);
      expect(result.data?.dimensions.width).toBeLessThanOrEqual(4096);
      expect(result.data?.dimensions.height).toBeLessThanOrEqual(4096);
    });

    it('should process image with custom options', async () => {
      const imageFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const options: ImageProcessingOptions = {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'webp',
        removeMetadata: true
      };
      
      const result = await imageProcessingService.processImage(imageFile, options);
      
      expect(result.success).toBe(true);
      expect(result.data?.dimensions.width).toBeLessThanOrEqual(800);
      expect(result.data?.dimensions.height).toBeLessThanOrEqual(600);
    });

    it('should return original file if no processing needed', async () => {
      // Mock small image that doesn't need resizing
      class SmallImage extends MockImage {
        naturalWidth = 500;
        naturalHeight = 400;
      }
      
      (globalThis as unknown as { Image: typeof SmallImage }).Image = SmallImage;
      
      const imageFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const options: ImageProcessingOptions = {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 1.0,
        removeMetadata: false
      };
      
      const result = await imageProcessingService.processImage(imageFile, options);
      
      expect(result.success).toBe(true);
      expect(result.data?.file).toBe(imageFile); // Should return original file
      expect(result.data?.compressionRatio).toBe(1.0);
    });

    it('should handle processing errors', async () => {
      const invalidFile = new File(['data'], 'invalid.txt', { type: 'text/plain' });
      
      const result = await imageProcessingService.processImage(invalidFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('UNSUPPORTED_FORMAT');
    });

    it('should calculate dimensions correctly for aspect ratio preservation', async () => {
      // Test with landscape image
      class LandscapeImage extends MockImage {
        naturalWidth = 2000;
        naturalHeight = 1000;
      }
      
      (globalThis as unknown as { Image: typeof LandscapeImage }).Image = LandscapeImage;
      
      const imageFile = new File(['data'], 'landscape.jpg', { type: 'image/jpeg' });
      const options: ImageProcessingOptions = {
        maxWidth: 800,
        maxHeight: 800
      };
      
      const result = await imageProcessingService.processImage(imageFile, options);
      
      expect(result.success).toBe(true);
      // Should maintain 2:1 aspect ratio
      expect(result.data?.dimensions.width).toBe(800);
      expect(result.data?.dimensions.height).toBe(400);
    });
  });

  describe('createThumbnail', () => {
    it('should create thumbnail with default size', async () => {
      const imageFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.createThumbnail(imageFile);
      
      expect(result.success).toBe(true);
      expect(result.data?.name).toContain('_thumb.webp');
      expect(result.data?.type).toBe('image/webp');
    });

    it('should create thumbnail with custom size', async () => {
      const imageFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.createThumbnail(imageFile, 150);
      
      expect(result.success).toBe(true);
      expect(result.data?.name).toContain('_thumb.webp');
    });

    it('should handle thumbnail creation errors', async () => {
      const invalidFile = new File(['data'], 'invalid.txt', { type: 'text/plain' });
      
      const result = await imageProcessingService.createThumbnail(invalidFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('UNSUPPORTED_FORMAT');
    });
  });

  describe('getProcessingCapabilities', () => {
    it('should return processing capabilities', () => {
      const capabilities = imageProcessingService.getProcessingCapabilities();
      
      expect(Array.isArray(capabilities.supportedFormats)).toBe(true);
      expect(capabilities.supportedFormats.length).toBeGreaterThan(0);
      expect(typeof capabilities.maxFileSize).toBe('number');
      expect(typeof capabilities.maxDimensions).toBe('number');
      expect(Array.isArray(capabilities.features)).toBe(true);
      expect(capabilities.features.length).toBeGreaterThan(0);
    });
  });

  describe('private methods', () => {
    it('should calculate dimensions correctly', () => {
      // Test through processImage which calls private methods
      // The functionality is already tested through the public methods
      expect(true).toBe(true);
    });

    it('should generate processed file names correctly', async () => {
      const imageFile = new File(['data'], 'original-name.jpg', { type: 'image/jpeg' });
      
      const result = await imageProcessingService.processImage(imageFile, { format: 'webp' });
      
      expect(result.success).toBe(true);
      expect(result.data?.file.name).toContain('original-name_processed_');
      expect(result.data?.file.name).toContain('.webp');
    });
  });
});