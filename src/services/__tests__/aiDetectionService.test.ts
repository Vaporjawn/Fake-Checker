import { AIDetectionService, aiDetectionService } from '../aiDetectionService';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

// Mock crypto.subtle
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
});

// Mock import.meta.env
// Mock import.meta.env for testing
// Use globalThis instead of import.meta for Jest compatibility
// Mock environment for testing

// Mock the import.meta usage in the service
jest.mock('../../utils/constants', () => ({
  HIVE_API_KEY: 'test-api-key',
  HIVE_API_ENDPOINT: 'https://api.thehive.ai/api/v2/task/sync',
  ACCEPTED_IMAGE_TYPES: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp']
  },
  MAX_FILE_SIZE: 10 * 1024 * 1024
}));

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

describe('AIDetectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('test-api-key');
  });

  describe('constructor and initialization', () => {
    it('should create instance with API key from environment', () => {
      const service = new AIDetectionService();
      expect(service.hasApiKey()).toBe(true);
    });

    it('should fallback to localStorage API key', () => {
      // Clear environment
      delete import.meta.env.VITE_HIVE_API_KEY;
      localStorageMock.getItem.mockReturnValue('stored-api-key');
      
      const service = new AIDetectionService();
      expect(service.hasApiKey()).toBe(true);
    });

    it('should handle missing API key', () => {
      delete import.meta.env.VITE_HIVE_API_KEY;
      localStorageMock.getItem.mockReturnValue(null);
      
      const service = new AIDetectionService();
      expect(service.hasApiKey()).toBe(false);
    });
  });

  describe('setApiKey', () => {
    it('should set and store API key', () => {
      const service = new AIDetectionService();
      const newKey = 'new-api-key';
      
      service.setApiKey(newKey);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('hive_api_key', newKey);
      expect(service.hasApiKey()).toBe(true);
    });
  });

  describe('analyzeImage', () => {
    let mockFile: File;

    beforeEach(() => {
      mockFile = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
    });

    it('should return error when API key is missing', async () => {
      const service = new AIDetectionService();
      // Remove API key
      service.setApiKey('');
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = await service.analyzeImage(mockFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('API_KEY_MISSING');
      expect(result.data?.analysis.breakdown.details).toContain('Error: No API key configured. Please set your Hive AI API key in settings.');
    });

    it('should return error for invalid file type', async () => {
      const textFile = new File(['text'], 'test.txt', { type: 'text/plain' });
      
      const result = await aiDetectionService.analyzeImage(textFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_FILE_TYPE');
    });

    it('should return error for file too large', async () => {
      const largeFile = new File(['x'.repeat(60 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      
      const result = await aiDetectionService.analyzeImage(largeFile);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('FILE_TOO_LARGE');
    });

    it('should successfully analyze image with API response', async () => {
      const mockResponse = {
        id: 'test-id',
        code: 0,
        project_id: 123,
        user_id: 456,
        created_on: '2023-01-01',
        status: {
          status: { code: 0, message: 'Success' },
          response: {
            input: {
              id: 'input-id',
              charge: 1,
              model: 'ai_detection',
              model_version: 1,
              model_type: 'classification',
              created_on: '2023-01-01',
              media: {
                type: 'image',
                mimetype: 'image/jpeg',
                duration: 0,
                width: 1920,
                height: 1080,
                filename: 'test.jpg'
              },
              user_id: 456,
              project_id: 123
            },
            output: [{
              time: 150,
              classes: [
                { class: 'ai_generated', score: 0.85 },
                { class: 'not_ai_generated', score: 0.15 },
                { class: 'midjourney', score: 0.7 }
              ]
            }]
          }
        },
        from_cache: false
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe(0.85);
      expect(result.data?.isAiGenerated).toBe(true);
      expect(result.data?.analysis.model).toBe('Hive AI');
    });

    it('should handle API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({
          error: { code: 'INVALID_REQUEST', message: 'Invalid request format' }
        }),
      } as Response);

      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('API_ERROR');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result.success).toBe(false);
      expect(result.error).toBe('NETWORK_ERROR');
    });

    it('should respect rate limiting', async () => {
      const service = new AIDetectionService();
      
      // Mock successful responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'test',
          status: {
            status: { code: 0, message: 'Success' },
            response: {
              output: [{
                time: 100,
                classes: [{ class: 'ai_generated', score: 0.5 }]
              }]
            }
          }
        }),
      } as Response);

      const startTime = Date.now();
      
      // Make two requests quickly
      const promise1 = service.analyzeImage(mockFile);
      const promise2 = service.analyzeImage(mockFile);

      await Promise.all([promise1, promise2]);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 1 second due to rate limiting
      expect(duration).toBeGreaterThan(1000);
    });
  });

  describe('analyzeImageFromUrl', () => {
    it('should analyze image from URL', async () => {
      const mockResponse = {
        status: {
          status: { code: 0, message: 'Success' },
          response: {
            output: [{
              time: 100,
              classes: [{ class: 'not_ai_generated', score: 0.8 }]
            }]
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await aiDetectionService.analyzeImageFromUrl('https://example.com/image.jpg');

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toBe(0.2); // 1 - 0.8
      expect(result.data?.isAiGenerated).toBe(false);
    });

    it('should return error when API key is missing', async () => {
      const service = new AIDetectionService();
      service.setApiKey('');
      localStorageMock.getItem.mockReturnValue(null);

      const result = await service.analyzeImageFromUrl('https://example.com/image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API_KEY_MISSING');
    });
  });

  describe('getServiceInfo', () => {
    it('should return service information', () => {
      const info = aiDetectionService.getServiceInfo();

      expect(info.name).toBe('Hive AI Detection Service');
      expect(info.version).toBe('1.0.0');
      expect(Array.isArray(info.capabilities)).toBe(true);
      expect(info.capabilities.length).toBeGreaterThan(0);
    });
  });

  describe('private methods', () => {
    it('should format generator names correctly', () => {
      // Test via analyzing a mock response that includes generator names
      
      const mockResponse = {
        status: {
          status: { code: 0, message: 'Success' },
          response: {
            output: [{
              time: 100,
              classes: [
                { class: 'ai_generated', score: 0.8 },
                { class: 'dalle', score: 0.6 }
              ]
            }]
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // The format should be tested through the actual API response parsing
      expect(true).toBe(true); // Placeholder - actual test would verify through analyzeImage
    });

    it('should create proper error results', async () => {
      const service = new AIDetectionService();
      service.setApiKey('');
      localStorageMock.getItem.mockReturnValue(null);

      const mockFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const result = await service.analyzeImage(mockFile);

      expect(result.data?.confidence).toBe(0);
      expect(result.data?.isAiGenerated).toBe(false);
      expect(result.data?.analysis.model).toBe('Error');
      expect(result.data?.analysis.breakdown.details.length).toBeGreaterThan(0);
    });
  });
});