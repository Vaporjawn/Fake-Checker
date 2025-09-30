/**
 * Comprehensive tests for remaining services
 * Covers errorHandler, imageProcessingService, and storageService
 */

import APIErrorHandler from '../errorHandler';
import { imageProcessingService } from '../imageProcessingService';
import { storageService } from '../storageService';
import type { AppError, UploadedImage } from '../../types';

describe('APIErrorHandler', () => {
  let errorHandler: APIErrorHandler;

  beforeEach(() => {
    errorHandler = new APIErrorHandler();
  });

  describe('createError', () => {
    it('should create a standardized error object', () => {
      const error = errorHandler.createError('TEST_ERROR', 'Test message');

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.userMessage).toBeDefined();
    });

    it('should handle non-recoverable errors', () => {
      const error = errorHandler.createError('FATAL_ERROR', 'Fatal message', false);

      expect(error.recoverable).toBe(false);
    });

    it('should include details when provided', () => {
      const details = { code: 500, source: 'API' };
      const error = errorHandler.createError('API_ERROR', 'API failed', true, details);

      expect(error.details).toEqual(details);
    });
  });

  describe('withRetry', () => {
    it('should execute operation successfully on first try', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.withRetry(mockOperation, 'NETWORK_ERROR');

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('success');

      const result = await errorHandler.withRetry(mockOperation, 'NETWORK_ERROR');

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should fail after maximum retry attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(errorHandler.withRetry(mockOperation, 'NETWORK_ERROR'))
        .rejects.toThrow('Persistent failure');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Default max attempts for NETWORK_ERROR
    });
  });

  describe('getUserMessage', () => {
    it('should return appropriate message for different error codes', () => {
      const networkError = errorHandler.createError('NETWORK_ERROR', 'Network failed');
      const apiKeyError = errorHandler.createError('INVALID_API_KEY', 'Invalid key');
      const rateLimitError = errorHandler.createError('RATE_LIMIT_EXCEEDED', 'Too many requests');

      expect(errorHandler.getUserMessage(networkError))
        .toContain('check your internet connection');
      expect(errorHandler.getUserMessage(apiKeyError))
        .toContain('API key is invalid');
      expect(errorHandler.getUserMessage(rateLimitError))
        .toContain('too many requests');
    });
  });

  describe('getRecoveryActions', () => {
    it('should provide appropriate recovery actions', () => {
      const networkError = errorHandler.createError('NETWORK_ERROR', 'Network failed');
      const actions = errorHandler.getRecoveryActions(networkError);

      expect(actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'Retry', action: 'retry', primary: true })
      ]));
    });

    it('should always include general actions', () => {
      const error = errorHandler.createError('UNKNOWN_ERROR', 'Unknown');
      const actions = errorHandler.getRecoveryActions(error);

      expect(actions).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'Go Home', action: 'home' }),
        expect.objectContaining({ label: 'Refresh Page', action: 'refresh' })
      ]));
    });
  });
});

describe('imageProcessingService', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockImage: HTMLImageElement;

  beforeEach(() => {
    // Mock Canvas API
    mockContext = {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray([255, 0, 0, 255]), // Red pixel
        width: 1,
        height: 1
      })),
      putImageData: jest.fn(),
      canvas: {} as HTMLCanvasElement
    } as any;

    mockCanvas = {
      getContext: jest.fn(() => mockContext),
      toBlob: jest.fn((callback) => {
        callback(new Blob(['mock'], { type: 'image/jpeg' }));
      }),
      width: 100,
      height: 100
    } as any;

    // Mock document.createElement for canvas
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas;
      if (tagName === 'img') return mockImage;
      return originalCreateElement.call(document, tagName);
    });

    // Mock HTMLImageElement
    mockImage = {
      addEventListener: jest.fn((event, handler) => {
        if (event === 'load') setTimeout(handler, 0);
      }),
      removeEventListener: jest.fn(),
      src: '',
      naturalWidth: 800,
      naturalHeight: 600
    } as any;

    Object.defineProperty(globalThis, 'Image', {
      value: jest.fn(() => mockImage),
      configurable: true
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processImage', () => {
    it('should process image with specified options', async () => {
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });

      const result = await imageProcessingService.processImage(mockFile, {
        maxWidth: 400,
        maxHeight: 300,
        quality: 0.8
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.file).toBeInstanceOf(File);
        expect(result.data?.compressionRatio).toBeGreaterThan(0);
      }
    });

    it('should handle invalid dimensions gracefully', async () => {
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });

      const result = await imageProcessingService.processImage(mockFile, {
        maxWidth: 0,
        maxHeight: 0
      });

      expect(result.success).toBe(false);
    });
  });

  describe('validateImage', () => {
    it('should validate supported image formats', async () => {
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });

      const result = await imageProcessingService.validateImage(mockFile);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.format).toBe('image/jpeg');
        expect(result.data?.size).toBeGreaterThan(0);
      }
    });

    it('should reject unsupported formats', async () => {
      const mockFile = new File(['mock'], 'test.txt', { type: 'text/plain' });

      const result = await imageProcessingService.validateImage(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('UNSUPPORTED_FORMAT');
    });
  });

  describe('extractImageMetadata', () => {
    it('should extract image dimensions and basic metadata', async () => {
      const mockFile = new File(['mock'], 'test.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const metadata = await imageProcessingService.extractImageMetadata(mockFile);

      expect(metadata).toEqual(expect.objectContaining({
        width: expect.any(Number),
        height: expect.any(Number),
        size: expect.any(Number),
        format: 'image/jpeg'
      }));
    });
  });

  describe('createThumbnail', () => {
    it('should create a thumbnail with default size', async () => {
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });

      const result = await imageProcessingService.createThumbnail(mockFile);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(File);
        expect(result.data?.name).toContain('thumb');
      }
    });

    it('should create a thumbnail with custom size', async () => {
      const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' });

      const result = await imageProcessingService.createThumbnail(mockFile, 64);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(File);
      }
    });
  });

  describe('getProcessingCapabilities', () => {
    it('should return service capabilities', () => {
      const capabilities = imageProcessingService.getProcessingCapabilities();

      expect(capabilities).toEqual(expect.objectContaining({
        supportedFormats: expect.any(Array),
        maxFileSize: expect.any(Number),
        maxDimensions: expect.any(Number),
        features: expect.any(Array)
      }));
    });
  });
});

describe('storageService', () => {
  const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  };

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      configurable: true
    });

    jest.clearAllMocks();
  });

  describe('saveImage', () => {
    it('should save individual image to localStorage', async () => {
      const mockImage: UploadedImage = {
        id: 'test-1',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        url: 'test-url',
        preview: 'test-preview',
        uploadedAt: new Date(),
        status: 'completed',
        name: 'test.jpg',
        size: 1024
      };

      const result = await storageService.saveImage(mockImage);

      expect(result.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should handle storage quota exceeded', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      const mockImage: UploadedImage = {
        id: 'test-1',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        url: 'test-url',
        preview: 'test-preview',
        uploadedAt: new Date(),
        status: 'completed',
        name: 'test.jpg',
        size: 1024
      };

      const result = await storageService.saveImage(mockImage);
      expect(result.success).toBe(false);
    });
  });

  describe('getAllImages', () => {
    it('should load images from localStorage', () => {
      const savedData = JSON.stringify([{
        id: 'test-1',
        name: 'test.jpg',
        size: 1024,
        uploadedAt: new Date().toISOString(),
        status: 'completed'
      }]);

      mockLocalStorage.getItem.mockReturnValue(savedData);

      const images = storageService.getAllImages();

      expect(images).toHaveLength(1);
      expect(images[0].id).toBe('test-1');
    });

    it('should return empty array when no data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const images = storageService.getAllImages();

      expect(images).toEqual([]);
    });

    it('should handle corrupted data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const images = storageService.getAllImages();

      expect(images).toEqual([]);
    });
  });

  describe('savePreferences', () => {
    it('should save preferences to localStorage', async () => {
      const preferences = {
        theme: 'dark' as const,
        autoAnalyze: true
      };

      const result = await storageService.savePreferences(preferences);

      expect(result.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('should load preferences from localStorage', () => {
      const savedSettings = {
        theme: 'dark',
        autoAnalyze: true
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));

      const preferences = storageService.getPreferences();

      expect(preferences).toEqual(expect.objectContaining(savedSettings));
    });

    it('should return default preferences when no data exists', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const preferences = storageService.getPreferences();

      expect(preferences).toEqual(expect.objectContaining({
        theme: 'auto',
        autoAnalyze: true
      }));
    });
  });

  describe('clearAllData', () => {
    it('should clear all stored data', async () => {
      const result = await storageService.clearAllData();

      expect(result.success).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(5); // All storage keys
    });
  });

  describe('getStorageStats', () => {
    it('should return storage usage information', () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('[]') // images
        .mockReturnValueOnce('[]') // results
        .mockReturnValueOnce('[]'); // cache

      const stats = storageService.getStorageStats();

      expect(stats).toEqual(expect.objectContaining({
        totalImages: expect.any(Number),
        totalResults: expect.any(Number),
        storageUsed: expect.any(Number)
      }));
    });
  });

  describe('exportData', () => {
    it('should export all data as JSON', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('[{"id":"test"}]') // images
        .mockReturnValueOnce('{"theme":"dark"}') // settings
        .mockReturnValueOnce('[{"session":"test"}]'); // history

      const exportedData = await storageService.exportData();

      expect(exportedData).toEqual(expect.objectContaining({
        images: expect.any(Array),
        settings: expect.any(Object),
        history: expect.any(Array),
        exportedAt: expect.any(String)
      }));
    });
  });

  describe('importData', () => {
    it('should import data and merge with existing', async () => {
      const importDataJson = JSON.stringify({
        version: '1.0',
        images: [{ id: 'imported-1', name: 'imported.jpg' }],
        results: [],
        preferences: { theme: 'light' },
        exportedAt: new Date().toISOString()
      });

      const result = await storageService.importData(importDataJson);

      expect(result.success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(3);
    });

    it('should validate import data structure', async () => {
      const invalidDataJson = JSON.stringify({ invalid: 'structure' });

      const result = await storageService.importData(invalidDataJson);

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_IMPORT_DATA');
    });
  });
});