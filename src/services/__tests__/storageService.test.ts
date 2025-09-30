import { StorageService, storageService } from '../storageService';
import type { UploadedImage, DetectionResult } from '../../types/index';
import type { UserPreferences } from '../storageService';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock crypto.subtle for hash creation
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
});

// Mock File.prototype.arrayBuffer
Object.defineProperty(File.prototype, 'arrayBuffer', {
  value: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
  writable: true,
  configurable: true
});

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const service = new StorageService();
      expect(service).toBeInstanceOf(StorageService);
    });

    it('should initialize with custom options', () => {
      const options = {
        maxHistorySize: 50,
        maxCacheAge: 1000 * 60 * 60 * 24, // 1 day
        enableCompression: false
      };

      const service = new StorageService(options);
      expect(service).toBeInstanceOf(StorageService);
    });

    it('should handle localStorage unavailability', () => {
      // Mock localStorage to throw error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error('localStorage not available');
      });

      expect(() => new StorageService()).not.toThrow();

      // Restore
      localStorage.getItem = originalGetItem;
    });
  });

  describe('image management', () => {
    const mockImage: UploadedImage = {
      id: 'test-id',
      file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
      url: 'blob:test-url',
      preview: 'blob:preview-url',
      uploadedAt: new Date(),
      status: 'completed',
      name: 'test.jpg',
      size: 1024,
      dimensions: { width: 100, height: 100 }
    };

    it('should save image successfully', async () => {
      localStorageMock.setItem.mockImplementation(() => {});

      const result = await storageService.saveImage(mockImage);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle save image error', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await storageService.saveImage(mockImage);

      expect(result.success).toBe(false);
      expect(result.error).toBe('STORAGE_UNAVAILABLE');
    });

    it('should get all stored images', () => {
      const testDate = '2025-09-30T04:26:00.556Z';
      const mockStoredImages = [
        { id: '1', name: 'image1.jpg', uploadedAt: testDate },
        { id: '2', name: 'image2.jpg', uploadedAt: testDate }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStoredImages));

      const images = storageService.getAllStoredImages();

      expect(images).toEqual(mockStoredImages);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('fake_checker_images');
    });

    it('should return empty array when no images stored', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const images = storageService.getAllStoredImages();

      expect(images).toEqual([]);
    });

    it('should get specific image by id', async () => {
      const mockImages = [mockImage];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockImages));

      const result = await storageService.getImage('test-id');

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('test-id');
    });

    it('should return null for non-existent image', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const result = await storageService.getImage('non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should delete image successfully', async () => {
      const mockImages = [mockImage];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockImages));
      localStorageMock.setItem.mockImplementation(() => {});

      const result = await storageService.deleteImage('test-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should enforce history size limit', async () => {
      const service = new StorageService({ maxHistorySize: 2 });

      // Mock existing images at limit
      const existingImages = [
        { id: '1', name: 'old1.jpg' },
        { id: '2', name: 'old2.jpg' }
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingImages));

      const newImage: UploadedImage = {
        ...mockImage,
        id: 'new-id'
      };

      await service.saveImage(newImage);

      // Should have removed oldest image
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fake_checker_images',
        expect.stringContaining('"id":"2"')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fake_checker_images',
        expect.stringContaining('"id":"new-id"')
      );
    });
  });

  describe('analysis results management', () => {
    const mockResult: DetectionResult = {
      imageId: 'test-id',
      confidence: 0.85,
      isAiGenerated: true,
      analysis: {
        model: 'Test Model',
        timestamp: new Date('2025-09-30T04:26:00.507Z'),
        breakdown: {
          humanLikelihood: 0.15,
          aiArtifacts: 0.85,
          processingQuality: 0.9,
          technicalScore: 85,
          artifactScore: 90,
          consistencyScore: 80,
          details: ['Test detail']
        }
      }
    };

    it('should save result successfully', async () => {
      localStorageMock.setItem.mockImplementation(() => {});

      const result = await storageService.saveResult(mockResult);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should get all results', () => {
      const serializedResults = [
        {
          ...mockResult,
          analysis: {
            ...mockResult.analysis,
            timestamp: '2025-09-30T04:26:00.507Z'
          }
        }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(serializedResults));

      const results = storageService.getAllResults();

      expect(results).toEqual(serializedResults);
    });

    it('should get specific result by image id', async () => {
      const mockResults = [mockResult];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockResults));

      const result = await storageService.getResult('test-id');

      expect(result.success).toBe(true);
      expect(result.data?.imageId).toBe('test-id');
    });

    it('should delete result successfully', async () => {
      const mockResults = [mockResult];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockResults));

      const result = await storageService.deleteResult('test-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe('cache management', () => {
    const mockCachedAnalysis = {
      imageHash: 'test-hash',
      result: {
        imageId: 'test-id',
        confidence: 0.8,
        isAiGenerated: false,
        analysis: {
          model: 'Test',
          timestamp: new Date(),
          breakdown: {
            humanLikelihood: 0.8,
            aiArtifacts: 0.2,
            processingQuality: 0.9,
            technicalScore: 80,
            artifactScore: 20,
            consistencyScore: 85,
            details: ['Test']
          }
        }
      },
      cachedAt: new Date(),
      accessCount: 1,
      lastAccessed: new Date()
    };

    it('should cache analysis successfully', async () => {
      const result = await storageService.cacheAnalysis('test-hash', mockCachedAnalysis.result);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should get cached analysis', async () => {
      // Mock getAllCachedAnalyses to return properly structured data
      const mockCacheFn = jest.spyOn(storageService, 'getAllCachedAnalyses').mockReturnValue([mockCachedAnalysis]);

      const result = await storageService.getCachedAnalysis('test-hash');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCachedAnalysis.result);

      mockCacheFn.mockRestore();
    });

    it('should return null for non-existent cache', async () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const result = await storageService.getCachedAnalysis('non-existent');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle expired cache entries', async () => {
      const expiredCache = {
        ...mockCachedAnalysis,
        cachedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) // 8 days ago
      };

      const mockCacheFn = jest.spyOn(storageService, 'getAllCachedAnalyses').mockReturnValue([expiredCache]);
      const mockDeleteFn = jest.spyOn(storageService, 'deleteCachedAnalysis').mockResolvedValue({ success: true, data: true });

      const result = await storageService.getCachedAnalysis('test-hash');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull(); // Should be null due to expiration

      mockCacheFn.mockRestore();
      mockDeleteFn.mockRestore();
    });

    it('should update access statistics on cache hit', async () => {
      const mockCacheFn = jest.spyOn(storageService, 'getAllCachedAnalyses').mockReturnValue([mockCachedAnalysis]);

      await storageService.getCachedAnalysis('test-hash');

      expect(localStorageMock.setItem).toHaveBeenCalled();

      mockCacheFn.mockRestore();
    });

    it('should delete cached analysis', async () => {
      const result = await storageService.deleteCachedAnalysis('test-hash');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });
  });

  describe('user preferences management', () => {
    const mockPreferences: Partial<UserPreferences> = {
      theme: 'dark',
      autoAnalyze: false,
      saveHistory: true
    };

    it('should save preferences successfully', async () => {
      const result = await storageService.savePreferences(mockPreferences);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fake_checker_preferences',
        expect.stringContaining('"theme":"dark"')
      );
    });

    it('should get preferences with defaults', () => {
      localStorageMock.getItem.mockReturnValue('{}');

      const preferences = storageService.getPreferences();

      expect(preferences.theme).toBe('auto'); // Default value
      expect(preferences.autoAnalyze).toBe(true); // Default value
    });

    it('should merge stored preferences with defaults', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ theme: 'dark' }));

      const preferences = storageService.getPreferences();

      expect(preferences.theme).toBe('dark'); // Stored value
      expect(preferences.autoAnalyze).toBe(true); // Default value
    });

    it('should handle corrupted preferences data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const preferences = storageService.getPreferences();

      expect(preferences.theme).toBe('auto'); // Should return defaults
    });
  });

  describe('storage statistics', () => {
    it('should calculate storage stats correctly', () => {
      const mockImages = [
        { id: '1', uploadedAt: new Date('2023-01-01') },
        { id: '2', uploadedAt: new Date('2023-01-02') }
      ];
      const mockResults = [
        { imageId: '1', analysis: { timestamp: new Date('2023-01-01') } }
      ];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'fake_checker_images') return JSON.stringify(mockImages);
        if (key === 'fake_checker_results') return JSON.stringify(mockResults);
        return '[]';
      });

      const stats = storageService.getStorageStats();

      expect(stats.totalImages).toBe(2);
      expect(stats.totalResults).toBe(1);
      expect(typeof stats.storageUsed).toBe('number');
      expect(stats.oldestEntry).toEqual(new Date('2023-01-01'));
      expect(stats.newestEntry).toEqual(new Date('2023-01-02'));
    });

    it('should handle empty storage stats', () => {
      localStorageMock.getItem.mockReturnValue('[]');

      const stats = storageService.getStorageStats();

      expect(stats.totalImages).toBe(0);
      expect(stats.totalResults).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('data management operations', () => {
    it('should clear all data successfully', async () => {
      const result = await storageService.clearAllData();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('should clear history successfully', async () => {
      const result = await storageService.clearHistory();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fake_checker_images', '[]');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fake_checker_results', '[]');
    });

    it('should clear cache successfully', async () => {
      const result = await storageService.clearCache();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('fake_checker_cache', '[]');
    });
  });

  describe('export/import functionality', () => {
    it('should export data successfully', async () => {
      const mockImages = [{ id: '1', name: 'test.jpg' }];
      const mockResults = [{ imageId: '1', confidence: 0.8 }];

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'fake_checker_images') return JSON.stringify(mockImages);
        if (key === 'fake_checker_results') return JSON.stringify(mockResults);
        if (key === 'fake_checker_preferences') return JSON.stringify({ theme: 'dark' });
        return '[]';
      });

      const result = await storageService.exportData();

      expect(result.success).toBe(true);
      expect(result.data).toContain('version');
      expect(result.data).toContain('exportedAt');
      expect(result.data).toContain('images');
      expect(result.data).toContain('results');
    });

    it('should handle export errors', async () => {
      const mockGetAllImages = jest.spyOn(storageService, 'getAllImages').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = await storageService.exportData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('EXPORT_FAILED');

      mockGetAllImages.mockRestore();
    });

    it('should import data successfully', async () => {
      const importData = {
        version: '1.0',
        images: [{ id: '1', name: 'imported.jpg' }],
        results: [{ imageId: '1', confidence: 0.9 }],
        preferences: { theme: 'light' }
      };

      const result = await storageService.importData(JSON.stringify(importData));

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fake_checker_images',
        JSON.stringify(importData.images)
      );
    });

    it('should handle invalid import data', async () => {
      const result = await storageService.importData('invalid json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('IMPORT_FAILED');
    });

    it('should validate import data structure', async () => {
      const invalidData = { version: '1.0' }; // Missing required fields

      const result = await storageService.importData(JSON.stringify(invalidData));

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_IMPORT_DATA');
    });
  });

  describe('utility methods', () => {
    it('should create image hash from file', async () => {
      const mockFile = new File(['test data'], 'test.jpg', { type: 'image/jpeg' });

      // Mock crypto.subtle.digest
      const mockDigest = new Uint8Array([1, 2, 3, 4]).buffer;
      (globalThis.crypto.subtle.digest as jest.Mock).mockResolvedValue(mockDigest);

      const hash = await storageService.createImageHash(mockFile);

      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should create fallback hash on crypto error', async () => {
      const mockFile = new File(['test data'], 'test.jpg', { type: 'image/jpeg' });

      // Mock crypto.subtle.digest to fail
      (globalThis.crypto.subtle.digest as jest.Mock).mockRejectedValue(new Error('Crypto error'));

      const hash = await storageService.createImageHash(mockFile);

      expect(hash).toContain('test.jpg');
      expect(hash).toContain(mockFile.size.toString());
    });
  });
});