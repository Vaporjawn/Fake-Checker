/**
 * Comprehensive tests for aiDetectionService
 * Expanded coverage including edge cases, error handling, and performance scenarios
 */

import { aiDetectionService, AIDetectionService } from '../aiDetectionService';
import APIErrorHandler from '../errorHandler';
import type { DetectionResult, APIResponse } from '../../types';

// Mock the error handler
jest.mock('../errorHandler', () => {
  const mockInstance = {
    withRetry: jest.fn(),
    logError: jest.fn(),
    reportError: jest.fn(),
    createError: jest.fn(),
    handleAPIError: jest.fn(),
    handleNetworkError: jest.fn(),
    getInstance: jest.fn()
  };

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockInstance),
    APIErrorHandler: jest.fn().mockImplementation(() => mockInstance)
  };
});

// Mock global objects
const originalGlobal = globalThis;

describe('aiDetectionService - Comprehensive Tests', () => {
  let mockFile: File;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock import.meta.env for Vite environment variables
    Object.defineProperty(globalThis, 'import', {
      value: {
        meta: {
          env: {
            VITE_HIVE_API_KEY: 'test-api-key-123'
          }
        }
      },
      configurable: true
    });

    // Mock localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      configurable: true
    });

    // Create mock file
    const imageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
    mockFile = new File([imageData], 'test-image.png', {
      type: 'image/png',
      lastModified: Date.now()
    });

    // Mock console methods
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reset all mocks
    jest.clearAllMocks();

    // Setup error handler mock to pass through by default
    (errorHandler.withRetry as jest.Mock).mockImplementation(async (operation) => {
      return operation();
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.resetAllMocks();
  });

  describe('analyzeImage - Success Scenarios', () => {
    beforeEach(() => {
      // Mock successful fetch response
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({
            'content-type': 'application/json'
          }),
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.85
                  }, {
                    class: 'human_generated',
                    score: 0.15
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;
    });

    it('should successfully analyze an image with AI detection', async () => {
      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result).toBeDefined();
      expect(result.imageId).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(typeof result.isAiGenerated).toBe('boolean');
      expect(result.analysis).toBeDefined();
      expect(result.analysis.model).toBe('Hive AI Detection v2.1');
      expect(result.analysis.timestamp).toBeInstanceOf(Date);
    });

    it('should correctly identify AI-generated content', async () => {
      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result.isAiGenerated).toBe(true);
      expect(result.confidence).toBe(0.85);
    });

    it('should include comprehensive analysis breakdown', async () => {
      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result.analysis.breakdown).toBeDefined();
      expect(result.analysis.breakdown.humanLikelihood).toBe(0.15);
      expect(result.analysis.breakdown.aiArtifacts).toBe(0.85);
      expect(result.analysis.breakdown.details).toBeInstanceOf(Array);
      expect(result.analysis.breakdown.details.length).toBeGreaterThan(0);
    });

    it('should handle human-generated content correctly', async () => {
      // Mock response for human content
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.25
                  }, {
                    class: 'human_generated',
                    score: 0.75
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;

      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result.isAiGenerated).toBe(false);
      expect(result.confidence).toBe(0.75);
      expect(result.analysis.breakdown.humanLikelihood).toBe(0.75);
    });

    it('should make correct API call with proper headers', async () => {
      await aiDetectionService.analyzeImage(mockFile);

      expect(fetch).toHaveBeenCalledTimes(1);

      const [url, options] = (fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://api.thehive.ai/api/v2/task/sync');
      expect(options.method).toBe('POST');
      expect(options.headers['Authorization']).toBe('token test-api-key-123');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.body).toBeDefined();

      const body = JSON.parse(options.body);
      expect(body.models).toEqual(['ai-generated-media']);
      expect(body.media).toHaveLength(1);
    });

    it('should handle multiple model responses', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.92
                  }, {
                    class: 'human_generated',
                    score: 0.08
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;

      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result.confidence).toBe(0.92);
      expect(result.isAiGenerated).toBe(true);
    });
  });

  describe('analyzeImage - Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as jest.Mock;

      await expect(aiDetectionService.analyzeImage(mockFile))
        .rejects.toThrow('Network error occurred during image analysis');

      expect(errorHandler.withRetry).toHaveBeenCalled();
    });

    it('should handle API rate limiting (429)', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          headers: new Headers({
            'retry-after': '60'
          }),
          json: () => Promise.resolve({
            error: 'Rate limit exceeded'
          })
        })
      ) as jest.Mock;

      await expect(aiDetectionService.analyzeImage(mockFile))
        .rejects.toThrow('Rate limit exceeded. Please try again later.');

      expect(errorHandler.withRetry).toHaveBeenCalled();
    });

    it('should handle unauthorized access (401)', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({
            error: 'Invalid API key'
          })
        })
      ) as jest.Mock;

      await expect(aiDetectionService.analyzeImage(mockFile))
        .rejects.toThrow('Invalid API key. Please check your configuration.');
    });

    it('should handle server errors (500)', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({
            error: 'Internal server error'
          })
        })
      ) as jest.Mock;

      await expect(aiDetectionService.analyzeImage(mockFile))
        .rejects.toThrow('Server error occurred. Please try again later.');
    });

    it('should handle malformed API responses', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            // Missing required fields
            invalid: 'response'
          })
        })
      ) as jest.Mock;

      await expect(aiDetectionService.analyzeImage(mockFile))
        .rejects.toThrow('Invalid response format from API');
    });

    it('should handle missing API configuration', async () => {
      process.env.VITE_HIVE_API_KEY = '';
      process.env.VITE_HIVE_API_URL = '';

      await expect(aiDetectionService.analyzeImage(mockFile))
        .rejects.toThrow('API configuration missing');
    });

    it('should handle invalid file types', async () => {
      const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });

      await expect(aiDetectionService.analyzeImage(invalidFile))
        .rejects.toThrow('Unsupported file type');
    });

    it('should handle oversized files', async () => {
      const largeData = new ArrayBuffer(20 * 1024 * 1024); // 20MB
      const largeFile = new File([largeData], 'large.png', { type: 'image/png' });

      await expect(aiDetectionService.analyzeImage(largeFile))
        .rejects.toThrow('File size exceeds maximum limit');
    });
  });

  describe('analyzeImage - Edge Cases', () => {
    it('should handle empty files', async () => {
      const emptyFile = new File([], 'empty.png', { type: 'image/png' });

      await expect(aiDetectionService.analyzeImage(emptyFile))
        .rejects.toThrow('File is empty');
    });

    it('should handle files with special characters in names', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.65
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;

      const specialFile = new File([new Uint8Array([137, 80, 78, 71])],
        'test-файл-🖼️.png', { type: 'image/png' });

      const result = await aiDetectionService.analyzeImage(specialFile);

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0.65);
    });

    it('should handle concurrent requests', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.75
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;

      const promises = Array(5).fill(null).map(() =>
        aiDetectionService.analyzeImage(mockFile)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.confidence).toBe(0.75);
      });
    });

    it('should handle timeout scenarios', async () => {
      global.fetch = jest.fn(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        })
      ) as jest.Mock;

      await expect(aiDetectionService.analyzeImage(mockFile))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('analyzeImage - Performance Tests', () => {
    it('should complete analysis within reasonable time', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.85
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;

      const startTime = Date.now();
      await aiDetectionService.analyzeImage(mockFile);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle multiple file types efficiently', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.5
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;

      const pngFile = new File([new Uint8Array([137, 80, 78, 71])], 'test.png', { type: 'image/png' });
      const jpgFile = new File([new Uint8Array([255, 216, 255])], 'test.jpg', { type: 'image/jpeg' });
      const webpFile = new File([new Uint8Array([82, 73, 70, 70])], 'test.webp', { type: 'image/webp' });

      const results = await Promise.all([
        aiDetectionService.analyzeImage(pngFile),
        aiDetectionService.analyzeImage(jpgFile),
        aiDetectionService.analyzeImage(webpFile)
      ]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.confidence).toBe(0.5);
      });
    });
  });

  describe('parseHiveResponse - Internal Method Testing', () => {
    it('should parse valid Hive API responses correctly', () => {
      const mockResponse = {
        status: [{
          response: {
            output: [{
              classes: [{
                class: 'ai_generated',
                score: 0.9
              }, {
                class: 'human_generated',
                score: 0.1
              }]
            }]
          }
        }]
      };

      // Access private method for testing
      const parseMethod = (aiDetectionService as any).parseHiveResponse;
      const result = parseMethod.call(aiDetectionService, mockResponse);

      expect(result.aiScore).toBe(0.9);
      expect(result.humanScore).toBe(0.1);
    });

    it('should handle missing classes in response', () => {
      const mockResponse = {
        status: [{
          response: {
            output: [{}]
          }
        }]
      };

      const parseMethod = (aiDetectionService as any).parseHiveResponse;

      expect(() => {
        parseMethod.call(aiDetectionService, mockResponse);
      }).toThrow('Invalid response format from API');
    });

    it('should handle empty status array', () => {
      const mockResponse = {
        status: []
      };

      const parseMethod = (aiDetectionService as any).parseHiveResponse;

      expect(() => {
        parseMethod.call(aiDetectionService, mockResponse);
      }).toThrow('Invalid response format from API');
    });
  });

  describe('createAnalysisBreakdown - Internal Method Testing', () => {
    it('should create comprehensive analysis breakdown', () => {
      const mockScores = {
        aiScore: 0.85,
        humanScore: 0.15
      };

      const createBreakdownMethod = (aiDetectionService as any).createAnalysisBreakdown;
      const breakdown = createBreakdownMethod.call(aiDetectionService, mockScores, mockFile.name);

      expect(breakdown.humanLikelihood).toBe(0.15);
      expect(breakdown.aiArtifacts).toBe(0.85);
      expect(breakdown.processingQuality).toBeGreaterThan(0);
      expect(breakdown.technicalScore).toBeGreaterThan(0);
      expect(breakdown.details).toContain(`File: ${mockFile.name}`);
      expect(breakdown.details).toContain('AI artifacts detected with high confidence');
    });

    it('should adjust analysis based on confidence levels', () => {
      const lowConfidenceScores = {
        aiScore: 0.3,
        humanScore: 0.7
      };

      const createBreakdownMethod = (aiDetectionService as any).createAnalysisBreakdown;
      const breakdown = createBreakdownMethod.call(aiDetectionService, lowConfidenceScores, mockFile.name);

      expect(breakdown.details).toContain('Analysis confidence is moderate');
    });
  });

  describe('Configuration and Environment', () => {
    it('should use custom API URL when provided', async () => {
      process.env.VITE_HIVE_API_URL = 'https://custom.api.com';

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.5
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;

      await aiDetectionService.analyzeImage(mockFile);

      expect(fetch).toHaveBeenCalledWith(
        'https://custom.api.com/task/sync',
        expect.any(Object)
      );
    });

    it('should validate API key format', async () => {
      process.env.VITE_HIVE_API_KEY = 'invalid-key';

      await expect(aiDetectionService.analyzeImage(mockFile))
        .rejects.toThrow();
    });

    it('should respect different model configurations', async () => {
      // Test with different model configuration if supported
      process.env.VITE_HIVE_MODEL = 'ai-generated-media-v2';

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            status: [{
              response: {
                output: [{
                  classes: [{
                    class: 'ai_generated',
                    score: 0.8
                  }]
                }]
              }
            }]
          })
        })
      ) as jest.Mock;

      await aiDetectionService.analyzeImage(mockFile);

      const [, options] = (fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(options.body);

      // Should use default model if custom not supported
      expect(body.models).toEqual(['ai-generated-media']);
    });
  });

  describe('Retry Logic Integration', () => {
    it('should use error handler retry logic for transient failures', async () => {
      let attempts = 0;
      (errorHandler.withRetry as jest.Mock).mockImplementation(async (operation) => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Transient error');
        }
        return {
          imageId: 'test-id',
          confidence: 0.75,
          isAiGenerated: true,
          analysis: {
            model: 'Hive AI Detection v2.1',
            timestamp: new Date(),
            breakdown: {
              humanLikelihood: 0.25,
              aiArtifacts: 0.75,
              processingQuality: 0.8,
              technicalScore: 75,
              artifactScore: 80,
              consistencyScore: 70,
              details: ['Retried successfully']
            }
          }
        };
      });

      const result = await aiDetectionService.analyzeImage(mockFile);

      expect(result).toBeDefined();
      expect(result.confidence).toBe(0.75);
      expect(errorHandler.withRetry).toHaveBeenCalledTimes(1);
    });
  });
});