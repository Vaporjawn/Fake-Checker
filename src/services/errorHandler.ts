import type { AppError, APIResponse } from '../types';

/**
 * Configuration for retry behavior on different types of errors.
 */
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Whether to add random jitter to prevent thundering herd */
  jitter: boolean;
}

/**
 * Predefined retry configurations optimized for different error scenarios.
 */
const RETRY_CONFIGS: Record<string, RetryConfig> = {
  NETWORK_ERROR: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },
  API_ERROR: {
    maxAttempts: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    jitter: true
  },
  RATE_LIMIT_EXCEEDED: {
    maxAttempts: 1,
    baseDelay: 60000,
    maxDelay: 300000,
    backoffMultiplier: 1,
    jitter: false
  }
};

/**
 * APIErrorHandler provides centralized error management, retry logic, and user-friendly error translation.
 *
 * This service handles:
 * - Automatic retry with exponential backoff for transient failures
 * - Error categorization and appropriate handling strategies
 * - User-friendly error message translation
 * - Error logging and analytics integration
 * - Rate limiting and request throttling
 *
 * Features:
 * - Configurable retry strategies per error type
 * - Jitter support to prevent thundering herd problems
 * - Error queue management for offline scenarios
 * - Comprehensive error classification and handling
 * - Performance monitoring and error analytics
 *
 * @example
 * ```typescript
 * const errorHandler = APIErrorHandler.getInstance();
 *
 * // Execute operation with automatic retry
 * const result = await errorHandler.executeWithRetry(
 *   () => aiDetectionService.analyzeImage(file),
 *   'NETWORK_ERROR'
 * );
 *
 * // Translate error for user display
 * const userMessage = errorHandler.translateError(technicalError);
 * ```
 *
 * @see {@link RetryConfig} For retry configuration options
 * @see {@link AppError} For error structure
 */
export class APIErrorHandler {
  private static instance: APIErrorHandler;
  private errorQueue: AppError[] = [];
  private readonly maxQueueSize = 10;
  private retryAttempts: Map<string, number> = new Map();

  static getInstance(): APIErrorHandler {
    if (!APIErrorHandler.instance) {
      APIErrorHandler.instance = new APIErrorHandler();
    }
    return APIErrorHandler.instance;
  }

  /**
   * Calculates the delay for exponential backoff with optional jitter
   */
  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const baseDelay = Math.min(
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay
    );

    if (config.jitter) {
      // Add random jitter ±25% to avoid thundering herd
      const jitter = baseDelay * 0.25 * (Math.random() - 0.5);
      return Math.max(0, baseDelay + jitter);
    }

    return baseDelay;
  }

  /**
   * Executes a function with retry logic and exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    errorType: string,
    operationId?: string
  ): Promise<T> {
    const config = RETRY_CONFIGS[errorType] || RETRY_CONFIGS.NETWORK_ERROR;
    const id = operationId || `${errorType}_${Date.now()}`;

    let attempt = this.retryAttempts.get(id) || 0;

    for (let i = attempt; i < config.maxAttempts; i++) {
      try {
        const result = await operation();
        // Success - clear retry count
        this.retryAttempts.delete(id);
        return result;
      } catch (error) {
        attempt = i + 1;
        this.retryAttempts.set(id, attempt);

        if (attempt >= config.maxAttempts) {
          // Max attempts reached - clear retry count and throw
          this.retryAttempts.delete(id);
          throw error;
        }

        // Calculate delay and wait
        const delay = this.calculateBackoffDelay(attempt, config);

        console.log(`🔄 Retry attempt ${attempt}/${config.maxAttempts} for ${errorType} after ${delay}ms`);

        await this.delay(delay);
      }
    }

    throw new Error(`Max retry attempts (${config.maxAttempts}) exceeded for ${errorType}`);
  }

  /**
   * Promise-based delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets the current retry attempt count for an operation
   */
  getRetryAttempts(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  /**
   * Clears retry attempts for a specific operation
   */
  clearRetryAttempts(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Creates a standardized AppError from various error types
   */
  createError(
    code: string,
    message: string,
    recoverable = true,
    details?: Record<string, unknown>
  ): AppError {
    return {
      code,
      message,
      details,
      timestamp: new Date(),
      recoverable,
      userMessage: this.generateUserMessage(code, details)
    };
  }

  /**
   * Generates user-friendly message from error code and details
   */
  private generateUserMessage(code: string, details?: Record<string, unknown>): string {
    switch (code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to our servers. Please check your internet connection and try again.';
      case 'INVALID_API_KEY':
        return 'Your API key is invalid or missing. Please check your settings.';
      case 'RATE_LIMIT_EXCEEDED': {
        const waitTime = details?.waitTimeSeconds || 60;
        return `You've made too many requests. Please wait ${waitTime} seconds before trying again.`;
      }
      case 'FILE_TOO_LARGE':
        return 'The selected file is too large. Please choose a smaller image (max 10MB).';
      case 'INVALID_FILE_FORMAT':
        return 'This file format is not supported. Please choose a JPEG, PNG, GIF, or WebP image.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Handles API response errors with standardized error creation
   */
  handleAPIError<T>(response: APIResponse<T>): AppError | null {
    if (response.success) {
      return null;
    }

    const error = this.createError(
      'API_ERROR',
      response.error || 'An API error occurred',
      response.retryable !== false,
      {
        retryable: response.retryable,
        rateLimitReset: response.rateLimitReset
      }
    );

    this.logError(error);
    return error;
  }

  /**
   * Handles network errors with retry logic information
   */
  handleNetworkError(error: Error, retryCount = 0): AppError {
    const appError = this.createError(
      'NETWORK_ERROR',
      `Network connection failed: ${error.message}`,
      retryCount < 3,
      {
        originalError: error.message,
        retryCount,
        retryable: retryCount < 3
      }
    );

    this.logError(appError);
    return appError;
  }

  /**
   * Handles file processing errors
   */
  handleFileError(error: Error, fileName?: string, fileSize?: number): AppError {
    let errorCode = 'FILE_ERROR';
    let recoverable = true;

    if (error.message.includes('size') || error.message.includes('large')) {
      errorCode = 'FILE_TOO_LARGE';
      recoverable = true;
    } else if (error.message.includes('format') || error.message.includes('type')) {
      errorCode = 'INVALID_FILE_FORMAT';
      recoverable = true;
    } else if (error.message.includes('corrupt')) {
      errorCode = 'FILE_CORRUPTED';
      recoverable = true;
    }

    const appError = this.createError(
      errorCode,
      `File processing failed: ${error.message}`,
      recoverable,
      {
        fileName,
        fileSize,
        originalError: error.message
      }
    );

    this.logError(appError);
    return appError;
  }

  /**
   * Handles API key validation errors
   */
  handleAPIKeyError(service: string): AppError {
    const appError = this.createError(
      'INVALID_API_KEY',
      `Invalid or missing API key for ${service}`,
      false,
      {
        service,
        retryable: false
      }
    );

    this.logError(appError);
    return appError;
  }

  /**
   * Handles rate limit errors
   */
  handleRateLimitError(resetTime?: number, service?: string): AppError {
    const resetDate = resetTime ? new Date(resetTime * 1000) : null;
    const waitTime = resetDate ? Math.ceil((resetDate.getTime() - Date.now()) / 1000) : 60;

    const appError = this.createError(
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded for ${service || 'API'}. Please wait ${waitTime} seconds.`,
      true,
      {
        service,
        resetTime: resetDate?.toISOString(),
        waitTimeSeconds: waitTime,
        retryable: true
      }
    );

    this.logError(appError);
    return appError;
  }



  /**
   * Reports error to external monitoring service (optional)
   */
  private async reportError(error: AppError): Promise<void> {
    try {
      // Only report non-recoverable errors and rate limiting issues
      const shouldReport = !error.recoverable || error.code === 'RATE_LIMIT_EXCEEDED';

      if (!shouldReport || !import.meta.env.VITE_ENABLE_ERROR_REPORTING) {
        return;
      }

      // Example integration with external error reporting
      // Replace with your preferred service (Sentry, LogRocket, etc.)
      const errorReport = {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp.toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(), // Implement based on your auth system
        sessionId: this.getSessionId()
      };

      if (import.meta.env.VITE_ERROR_REPORTING_ENDPOINT) {
        await fetch(import.meta.env.VITE_ERROR_REPORTING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(errorReport),
        });
      }

      // Alternative: Browser's built-in error reporting
      if ('ReportingObserver' in window) {
        const observer = new ReportingObserver((reports) => {
          for (const report of reports) {
            console.log('Browser Error Report:', report);
          }
        });
        observer.observe();
      }

    } catch (reportingError) {
      console.warn('Failed to report error to external service:', reportingError);
    }
  }

  /**
   * Gets user ID for error reporting (implement based on your auth system)
   */
  private getUserId(): string | undefined {
    // Implement based on your authentication system
    // Example: return store.getState().auth.user?.id;
    return undefined;
  }

  /**
   * Gets or creates a session ID for error tracking
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('error_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Logs error to queue and console
   */
  private logError(error: AppError): void {
    // Add to error queue
    this.errorQueue.push(error);

    // Keep queue size manageable
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    // Log to console based on recoverable status
    const logMethod = !error.recoverable ? console.error :
                     error.code.includes('RATE_LIMIT') ? console.warn : console.log;

    logMethod('🚨 App Error:', {
      code: error.code,
      message: error.message,
      recoverable: error.recoverable,
      userMessage: error.userMessage,
      details: error.details,
      timestamp: error.timestamp.toISOString()
    });

    // Report to external service if configured
    this.reportError(error).catch(err => {
      console.warn('Error reporting failed:', err);
    });
  }

  /**
   * Gets recent errors from the queue
   */
  getRecentErrors(count = 5): AppError[] {
    return this.errorQueue.slice(-count);
  }

  /**
   * Clears the error queue
   */
  clearErrors(): void {
    this.errorQueue = [];
  }

  /**
   * Gets user-friendly error message
   */
  getUserMessage(error: AppError): string {
    // Return existing userMessage if available
    if (error.userMessage) {
      return error.userMessage;
    }

    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to our servers. Please check your internet connection and try again.';

      case 'INVALID_API_KEY':
        return 'Your API key is invalid or missing. Please check your settings and ensure your API key is correct.';

      case 'RATE_LIMIT_EXCEEDED': {
        const waitTime = error.details?.waitTimeSeconds || 60;
        return `You've made too many requests. Please wait ${waitTime} seconds before trying again.`;
      }

      case 'FILE_TOO_LARGE':
        return 'The selected file is too large. Please choose a smaller image (max 10MB).';

      case 'INVALID_FILE_FORMAT':
        return 'This file format is not supported. Please choose a JPEG, PNG, GIF, or WebP image.';

      case 'FILE_CORRUPTED':
        return 'The selected file appears to be corrupted. Please try a different image.';

      case 'API_ERROR':
        return 'An unexpected error occurred while processing your request.';

      default:
        return 'Something unexpected happened. Please try again or contact support if the problem persists.';
    }
  }

  /**
   * Gets recovery actions for an error
   */
  getRecoveryActions(error: AppError): Array<{
    label: string;
    action: string;
    primary?: boolean;
  }> {
    const actions = [];

    switch (error.code) {
      case 'NETWORK_ERROR':
        if (error.recoverable && error.details?.retryable) {
          actions.push({ label: 'Retry', action: 'retry', primary: true });
        }
        break;

      case 'INVALID_API_KEY':
        actions.push({ label: 'Check Settings', action: 'settings', primary: true });
        break;

      case 'RATE_LIMIT_EXCEEDED':
        actions.push({ label: 'Wait and Retry', action: 'wait', primary: true });
        break;

      case 'FILE_TOO_LARGE':
      case 'INVALID_FILE_FORMAT':
      case 'FILE_CORRUPTED':
        actions.push({ label: 'Choose Different File', action: 'file', primary: true });
        break;
    }

    // Always add general recovery actions
    actions.push(
      { label: 'Go Home', action: 'home' },
      { label: 'Refresh Page', action: 'refresh' }
    );

    return actions;
  }
}

export default APIErrorHandler;