/**
 * Security utilities for input validation, sanitization, and rate limiting
 */

/**
 * File upload security configuration
 */
export const SECURITY_CONFIG = {
  // File upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_FILES_PER_UPLOAD: 10,

  // Allowed MIME types for image uploads
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ],

  // Allowed file extensions
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],

  // Rate limiting
  RATE_LIMIT: {
    MAX_REQUESTS_PER_MINUTE: 30,
    MAX_REQUESTS_PER_HOUR: 100,
    MAX_REQUESTS_PER_DAY: 500,
    WINDOW_SIZE_MS: 60 * 1000, // 1 minute
  },

  // Content Security Policy
  CSP_DIRECTIVES: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", 'https://api.thehive.ai'],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'blob:', 'https://api.thehive.ai'],
    'connect-src': ["'self'", 'https://api.thehive.ai', 'https://*.netlify.app'],
    'media-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  }
} as const;

/**
 * File validation result interface
 */
interface FileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFile?: File;
}

/**
 * Rate limiting tracker for client-side rate limiting
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private cleanup: ReturnType<typeof setInterval>;
  private maxRequests: number;
  private windowSizeMs: number;

  constructor(
    maxRequests: number = SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS_PER_MINUTE,
    windowSizeMs: number = SECURITY_CONFIG.RATE_LIMIT.WINDOW_SIZE_MS
  ) {
    this.maxRequests = maxRequests;
    this.windowSizeMs = windowSizeMs;
    // Cleanup old entries every minute
    this.cleanup = setInterval(() => {
      this.cleanupOldEntries();
    }, this.windowSizeMs);
  }

  /**
   * Check if a request is allowed for the given identifier (IP, user ID, etc.)
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // Filter out requests outside the window
    const recentRequests = requests.filter(
      timestamp => now - timestamp < this.windowSizeMs
    );

    // Update the stored requests
    this.requests.set(identifier, recentRequests);

    // Check if limit exceeded
    return recentRequests.length < this.maxRequests;
  }

  /**
   * Record a new request for the given identifier
   */
  recordRequest(identifier: string): void {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    requests.push(now);
    this.requests.set(identifier, requests);
  }

  /**
   * Get remaining requests for the given identifier
   */
  getRemainingRequests(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    const now = Date.now();
    const recentRequests = requests.filter(
      timestamp => now - timestamp < this.windowSizeMs
    );
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * Get time until next request is allowed (in milliseconds)
   */
  getTimeUntilReset(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests);
    const resetTime = oldestRequest + this.windowSizeMs;
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanupOldEntries(): void {
    const now = Date.now();

    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(
        timestamp => now - timestamp < this.windowSizeMs
      );

      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }

  /**
   * Destroy the rate limiter and cleanup resources
   */
  destroy(): void {
    clearInterval(this.cleanup);
    this.requests.clear();
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter();

/**
 * Validates and sanitizes uploaded files for security
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (${SECURITY_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`
    };
  }

  // Check file type
  if (!(SECURITY_CONFIG.ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return {
      isValid: false,
      error: `File type '${file.type}' is not allowed. Supported types: ${SECURITY_CONFIG.ALLOWED_IMAGE_TYPES.join(', ')}`
    };
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  if (!(SECURITY_CONFIG.ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return {
      isValid: false,
      error: `File extension '${extension}' is not allowed. Supported extensions: ${SECURITY_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`
    };
  }

  // Sanitize filename
  const sanitizedName = sanitizeFilename(file.name);

  // Create sanitized file if needed
  const sanitizedFile = sanitizedName !== file.name
    ? new File([file], sanitizedName, { type: file.type, lastModified: file.lastModified })
    : file;

  return {
    isValid: true,
    sanitizedFile
  };
}

/**
 * Validates multiple files at once
 */
export function validateFiles(files: FileList | File[]): {
  validFiles: File[];
  errors: string[];
} {
  const fileArray = Array.from(files);

  // Check total number of files
  if (fileArray.length > SECURITY_CONFIG.MAX_FILES_PER_UPLOAD) {
    return {
      validFiles: [],
      errors: [`Cannot upload more than ${SECURITY_CONFIG.MAX_FILES_PER_UPLOAD} files at once`]
    };
  }

  const validFiles: File[] = [];
  const errors: string[] = [];

  fileArray.forEach((file, index) => {
    const validation = validateFile(file);

    if (validation.isValid && validation.sanitizedFile) {
      validFiles.push(validation.sanitizedFile);
    } else if (validation.error) {
      errors.push(`File ${index + 1} (${file.name}): ${validation.error}`);
    }
  });

  return { validFiles, errors };
}

/**
 * Sanitizes filename to prevent directory traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and special characters
  const sanitized = filename
    .replace(/[/\\?%*:|"<>]/g, '_')  // Replace unsafe characters
    .replace(/\.\./g, '_')           // Remove directory traversal
    .replace(/^\./g, '_')            // Remove leading dots
    .replace(/\s+/g, '_')            // Replace spaces with underscores
    .substring(0, 255);              // Limit length

  // Ensure we have a valid filename
  return sanitized || 'unnamed_file';
}

/**
 * Gets file extension safely
 */
export function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : filename.substring(lastDotIndex).toLowerCase();
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validates URL to ensure it's safe for fetching
 */
export function validateUrl(url: string): { isValid: boolean; error?: string; sanitizedUrl?: string } {
  try {
    const urlObj = new URL(url);

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: 'Only HTTP and HTTPS URLs are allowed'
      };
    }

    // Block localhost and private IPs (basic check)
    const hostname = urlObj.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return {
        isValid: false,
        error: 'Private network URLs are not allowed'
      };
    }

    return {
      isValid: true,
      sanitizedUrl: urlObj.toString()
    };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format'
    };
  }
}

/**
 * Generates Content Security Policy header value
 */
export function generateCSPHeader(): string {
  const directives = Object.entries(SECURITY_CONFIG.CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');

  return directives;
}

/**
 * Browser fingerprinting for rate limiting (basic)
 */
export function getBrowserFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return 'unknown';

  // Create a simple fingerprint based on canvas rendering
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('Browser fingerprint', 2, 2);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Security headers for API requests
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

/**
 * Creates a secure fetch wrapper with rate limiting and validation
 */
export async function secureApiCall(
  url: string,
  options: RequestInit = {},
  identifier?: string
): Promise<Response> {
  const fingerprintId = identifier || getBrowserFingerprint();

  // Check rate limit
  if (!globalRateLimiter.isAllowed(fingerprintId)) {
    const timeUntilReset = globalRateLimiter.getTimeUntilReset(fingerprintId);
    throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(timeUntilReset / 1000)} seconds.`);
  }

  // Record the request
  globalRateLimiter.recordRequest(fingerprintId);

  // Add security headers
  const secureHeaders = {
    ...getSecurityHeaders(),
    ...options.headers
  };

  // Perform the request
  const response = await fetch(url, {
    ...options,
    headers: secureHeaders
  });

  return response;
}

export default {
  validateFile,
  validateFiles,
  sanitizeFilename,
  sanitizeInput,
  validateUrl,
  generateCSPHeader,
  getBrowserFingerprint,
  secureApiCall,
  globalRateLimiter,
  SECURITY_CONFIG
};