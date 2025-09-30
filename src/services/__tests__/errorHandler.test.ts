import APIErrorHandler from '../errorHandler';
import type { AppError } from '../../types/index';

describe('APIErrorHandler', () => {
  let errorHandler: APIErrorHandler;

  beforeEach(() => {
    errorHandler = APIErrorHandler.getInstance();
    errorHandler.clearErrors();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = APIErrorHandler.getInstance();
      const instance2 = APIErrorHandler.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('createError', () => {
    it('should create error with required properties', () => {
      const error = errorHandler.createError('TEST_ERROR', 'Test message');
      
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('Test message');
      expect(error.recoverable).toBe(true);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.userMessage).toBe('Something unexpected happened. Please try again.');
    });

    it('should create error with custom properties', () => {
      const details = { customProp: 'value' };
      const error = errorHandler.createError(
        'CUSTOM_ERROR',
        'Custom message',
        false,
        details
      );
      
      expect(error.recoverable).toBe(false);
      expect(error.details).toEqual(details);
    });

    it('should generate appropriate user messages for different error codes', () => {
      const networkError = errorHandler.createError('NETWORK_ERROR', 'Network failed');
      expect(networkError.userMessage).toContain('internet connection');

      const apiKeyError = errorHandler.createError('INVALID_API_KEY', 'API key invalid');
      expect(apiKeyError.userMessage).toContain('API key');

      const rateLimitError = errorHandler.createError('RATE_LIMIT_EXCEEDED', 'Too many requests', true, { waitTimeSeconds: 30 });
      expect(rateLimitError.userMessage).toContain('30 seconds');

      const fileSizeError = errorHandler.createError('FILE_TOO_LARGE', 'File is too big');
      expect(fileSizeError.userMessage).toContain('smaller image');

      const formatError = errorHandler.createError('INVALID_FILE_FORMAT', 'Bad format');
      expect(formatError.userMessage).toContain('file format');
    });
  });

  describe('handleAPIError', () => {
    it('should return null for successful API response', () => {
      const successResponse = {
        success: true,
        data: { test: 'value' }
      };

      const error = errorHandler.handleAPIError(successResponse);
      
      expect(error).toBeNull();
    });

    it('should create error for failed API response', () => {
      const failedResponse = {
        success: false,
        error: 'API_FAILURE',
        retryable: true,
        rateLimitReset: 1234567890
      };

      const error = errorHandler.handleAPIError(failedResponse);
      
      expect(error).not.toBeNull();
      expect(error?.code).toBe('API_ERROR');
      expect(error?.message).toBe('API_FAILURE');
      expect(error?.recoverable).toBe(true);
      expect(error?.details?.retryable).toBe(true);
      expect(error?.details?.rateLimitReset).toBe(1234567890);
    });

    it('should handle API response without error message', () => {
      const failedResponse = {
        success: false
      };

      const error = errorHandler.handleAPIError(failedResponse);
      
      expect(error?.message).toBe('An API error occurred');
    });
  });

  describe('handleNetworkError', () => {
    it('should create network error with retry information', () => {
      const networkError = new Error('Network timeout');
      
      const appError = errorHandler.handleNetworkError(networkError, 1);
      
      expect(appError.code).toBe('NETWORK_ERROR');
      expect(appError.message).toContain('Network timeout');
      expect(appError.details?.retryCount).toBe(1);
      expect(appError.details?.retryable).toBe(true);
      expect(appError.recoverable).toBe(true);
    });

    it('should mark as non-recoverable after max retries', () => {
      const networkError = new Error('Network failed');
      
      const appError = errorHandler.handleNetworkError(networkError, 3);
      
      expect(appError.recoverable).toBe(false);
      expect(appError.details?.retryable).toBe(false);
    });
  });

  describe('handleFileError', () => {
    it('should identify file size errors', () => {
      const fileSizeError = new Error('File size too large');
      
      const appError = errorHandler.handleFileError(fileSizeError, 'large.jpg', 60000000);
      
      expect(appError.code).toBe('FILE_TOO_LARGE');
      expect(appError.details?.fileName).toBe('large.jpg');
      expect(appError.details?.fileSize).toBe(60000000);
      expect(appError.recoverable).toBe(true);
    });

    it('should identify file format errors', () => {
      const formatError = new Error('Unsupported file format');
      
      const appError = errorHandler.handleFileError(formatError, 'document.pdf');
      
      expect(appError.code).toBe('INVALID_FILE_FORMAT');
      expect(appError.recoverable).toBe(true);
    });

    it('should identify file corruption errors', () => {
      const corruptError = new Error('File is corrupt and cannot be read');
      
      const appError = errorHandler.handleFileError(corruptError, 'corrupt.jpg');
      
      expect(appError.code).toBe('FILE_CORRUPTED');
      expect(appError.recoverable).toBe(true);
    });

    it('should handle generic file errors', () => {
      const genericError = new Error('Something went wrong with file processing');
      
      const appError = errorHandler.handleFileError(genericError, 'file.jpg');
      
      expect(appError.code).toBe('FILE_ERROR');
      expect(appError.recoverable).toBe(true);
    });
  });

  describe('handleAPIKeyError', () => {
    it('should create non-recoverable API key error', () => {
      const appError = errorHandler.handleAPIKeyError('Hive AI');
      
      expect(appError.code).toBe('INVALID_API_KEY');
      expect(appError.message).toContain('Hive AI');
      expect(appError.recoverable).toBe(false);
      expect(appError.details?.service).toBe('Hive AI');
      expect(appError.details?.retryable).toBe(false);
    });
  });

  describe('handleRateLimitError', () => {
    it('should create rate limit error with reset time', () => {
      const resetTime = Math.floor(Date.now() / 1000) + 60; // 60 seconds from now
      
      const appError = errorHandler.handleRateLimitError(resetTime, 'Test Service');
      
      expect(appError.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(appError.message).toContain('Test Service');
      expect(appError.recoverable).toBe(true);
      expect(appError.details?.waitTimeSeconds).toBeGreaterThan(0);
      expect(appError.details?.retryable).toBe(true);
    });

    it('should handle missing reset time', () => {
      const appError = errorHandler.handleRateLimitError(undefined, 'Test Service');
      
      expect(appError.details?.waitTimeSeconds).toBe(60); // Default wait time
    });

    it('should handle missing service name', () => {
      const appError = errorHandler.handleRateLimitError();
      
      expect(appError.message).toContain('API');
    });
  });

  describe('error queue management', () => {
    it('should add errors to queue', () => {
      errorHandler.createError('ERROR_1', 'First error');
      errorHandler.createError('ERROR_2', 'Second error');
      
      // Errors should be added to queue automatically when created
      const recentErrors = errorHandler.getRecentErrors();
      
      expect(recentErrors).toContainEqual(expect.objectContaining({ code: 'ERROR_1' }));
      expect(recentErrors).toContainEqual(expect.objectContaining({ code: 'ERROR_2' }));
    });

    it('should limit queue size', () => {
      // Create more than max queue size (10) errors
      for (let i = 0; i < 15; i++) {
        errorHandler.createError(`ERROR_${i}`, `Error ${i}`);
      }
      
      const recentErrors = errorHandler.getRecentErrors();
      
      expect(recentErrors.length).toBe(10); // Max queue size
      // Should contain the most recent errors
      expect(recentErrors).toContainEqual(expect.objectContaining({ code: 'ERROR_14' }));
      expect(recentErrors).not.toContainEqual(expect.objectContaining({ code: 'ERROR_0' }));
    });

    it('should clear error queue', () => {
      errorHandler.createError('TEST_ERROR', 'Test message');
      
      expect(errorHandler.getRecentErrors().length).toBeGreaterThan(0);
      
      errorHandler.clearErrors();
      
      expect(errorHandler.getRecentErrors().length).toBe(0);
    });

    it('should return limited number of recent errors', () => {
      // Create several errors
      for (let i = 0; i < 8; i++) {
        errorHandler.createError(`ERROR_${i}`, `Error ${i}`);
      }
      
      const recentErrors = errorHandler.getRecentErrors(3);
      
      expect(recentErrors.length).toBe(3);
      // Should return the most recent ones
      expect(recentErrors).toContainEqual(expect.objectContaining({ code: 'ERROR_7' }));
      expect(recentErrors).toContainEqual(expect.objectContaining({ code: 'ERROR_6' }));
      expect(recentErrors).toContainEqual(expect.objectContaining({ code: 'ERROR_5' }));
    });
  });

  describe('getUserMessage', () => {
    it('should return existing user message if available', () => {
      const error: AppError = {
        code: 'TEST_ERROR',
        message: 'Technical message',
        userMessage: 'Custom user message',
        timestamp: new Date(),
        recoverable: true
      };
      
      const message = errorHandler.getUserMessage(error);
      
      expect(message).toBe('Custom user message');
    });

    it('should generate user message for different error codes', () => {
      const networkError: AppError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: '',
        timestamp: new Date(),
        recoverable: true
      };
      
      const message = errorHandler.getUserMessage(networkError);
      
      expect(message).toContain('internet connection');
    });

    it('should return default message for unknown error codes', () => {
      const unknownError: AppError = {
        code: 'UNKNOWN_ERROR_CODE',
        message: 'Unknown error',
        userMessage: '',
        timestamp: new Date(),
        recoverable: true
      };
      
      const message = errorHandler.getUserMessage(unknownError);
      
      expect(message).toContain('Something unexpected happened');
    });
  });

  describe('getRecoveryActions', () => {
    it('should return retry action for network errors', () => {
      const networkError: AppError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        userMessage: '',
        timestamp: new Date(),
        recoverable: true,
        details: { retryable: true }
      };
      
      const actions = errorHandler.getRecoveryActions(networkError);
      
      expect(actions).toContainEqual(
        expect.objectContaining({ label: 'Retry', action: 'retry', primary: true })
      );
    });

    it('should return settings action for API key errors', () => {
      const apiKeyError: AppError = {
        code: 'INVALID_API_KEY',
        message: 'API key invalid',
        userMessage: '',
        timestamp: new Date(),
        recoverable: false
      };
      
      const actions = errorHandler.getRecoveryActions(apiKeyError);
      
      expect(actions).toContainEqual(
        expect.objectContaining({ label: 'Check Settings', action: 'settings', primary: true })
      );
    });

    it('should return file action for file errors', () => {
      const fileError: AppError = {
        code: 'FILE_TOO_LARGE',
        message: 'File too large',
        userMessage: '',
        timestamp: new Date(),
        recoverable: true
      };
      
      const actions = errorHandler.getRecoveryActions(fileError);
      
      expect(actions).toContainEqual(
        expect.objectContaining({ label: 'Choose Different File', action: 'file', primary: true })
      );
    });

    it('should always include general recovery actions', () => {
      const error: AppError = {
        code: 'SOME_ERROR',
        message: 'Some error',
        userMessage: '',
        timestamp: new Date(),
        recoverable: true
      };
      
      const actions = errorHandler.getRecoveryActions(error);
      
      expect(actions).toContainEqual(
        expect.objectContaining({ label: 'Go Home', action: 'home' })
      );
      expect(actions).toContainEqual(
        expect.objectContaining({ label: 'Refresh Page', action: 'refresh' })
      );
    });
  });
});