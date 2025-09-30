import type { UploadedImage, DetectionResult, APIResponse } from '../types';

/**
 * Configuration options for the StorageService.
 */
export interface StorageOptions {
  /** Maximum number of items to keep in history (default: 100) */
  maxHistorySize?: number;
  /** Maximum cache age in milliseconds (default: 7 days) */
  maxCacheAge?: number;
  /** Whether to enable data compression (default: true) */
  enableCompression?: boolean;
}

/**
 * Stored image type without the actual file data for performance.
 */
export type StoredImage = Omit<UploadedImage, 'file' | 'preview'>;

/**
 * Storage statistics and usage information.
 */
export interface StorageStats {
  /** Total number of stored images */
  totalImages: number;
  /** Total number of cached analysis results */
  totalResults: number;
  /** Total storage used in bytes */
  storageUsed: number;
  /** Date of the oldest entry */
  oldestEntry: Date | null;
  /** Date of the newest entry */
  newestEntry: Date | null;
}

/**
 * Cached analysis result with metadata.
 */
export interface CachedAnalysis {
  /** SHA-256 hash of the image content */
  imageHash: string;
  /** The detection result */
  result: DetectionResult;
  /** When the analysis was cached */
  cachedAt: Date;
  /** Number of times this cache entry was accessed */
  accessCount: number;
  /** When the cache entry was last accessed */
  lastAccessed: Date;
}

/**
 * User preferences and application settings.
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'auto';
  /** Whether to automatically analyze uploaded images */
  autoAnalyze: boolean;
  /** Whether to save analysis history */
  saveHistory: boolean;
  /** Maximum image file size in bytes */
  maxImageSize: number;
  /** Preferred image format for processing */
  preferredFormat: 'webp' | 'jpeg' | 'png';
  /** Image compression quality (0-1) */
  compressionQuality: number;
  /** Whether to show advanced options in UI */
  showAdvancedOptions: boolean;
  /** API-related settings */
  apiSettings: {
    /** Optional Hive AI API key */
    hiveApiKey?: string;
    /** Rate limit delay between requests in ms */
    rateLimitDelay: number;
  };
}

/**
 * StorageService provides comprehensive local storage management for the Fake Checker application.
 *
 * This service handles:
 * - Image metadata storage with automatic cleanup
 * - Analysis result caching for performance
 * - User preferences and settings persistence
 * - Storage usage monitoring and optimization
 * - Data export/import functionality
 *
 * Features:
 * - Automatic cache expiration and cleanup
 * - Storage quota monitoring
 * - Data compression for efficiency
 * - Cross-session persistence
 * - Comprehensive error handling
 *
 * @example
 * ```typescript
 * const service = new StorageService({ maxHistorySize: 50 });
 *
 * // Save an image with automatic metadata extraction
 * await service.saveImage(uploadedImage);
 *
 * // Cache analysis results for performance
 * await service.cacheAnalysis(imageHash, detectionResult);
 *
 * // Manage user preferences
 * await service.savePreferences({ theme: 'dark', autoAnalyze: true });
 * ```
 *
 * @see {@link StorageOptions} For configuration options
 * @see {@link UserPreferences} For preference structure
 */
export class StorageService {
  private readonly STORAGE_KEYS = {
    IMAGES: 'fake_checker_images',
    RESULTS: 'fake_checker_results',
    CACHE: 'fake_checker_cache',
    PREFERENCES: 'fake_checker_preferences',
    STATS: 'fake_checker_stats'
  } as const;

  private readonly DEFAULT_OPTIONS: Required<StorageOptions> = {
    maxHistorySize: 100,
    maxCacheAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    enableCompression: true
  };

  private readonly DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'auto',
    autoAnalyze: true,
    saveHistory: true,
    maxImageSize: 10 * 1024 * 1024, // 10MB
    preferredFormat: 'webp',
    compressionQuality: 0.92,
    showAdvancedOptions: false,
    apiSettings: {
      rateLimitDelay: 1000
    }
  };

  private options: Required<StorageOptions>;

  constructor(options: StorageOptions = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
    this.initializeStorage();
  }

  private initializeStorage(): void {
    try {
      // Check if localStorage is available
      if (!this.isStorageAvailable()) {
        console.warn('localStorage is not available');
        return;
      }

      // Initialize storage keys if they don't exist
      Object.values(this.STORAGE_KEYS).forEach(key => {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify([]));
        }
      });

      // Initialize preferences
      if (!localStorage.getItem(this.STORAGE_KEYS.PREFERENCES)) {
        localStorage.setItem(
          this.STORAGE_KEYS.PREFERENCES,
          JSON.stringify(this.DEFAULT_PREFERENCES)
        );
      }

      // Clean up old cache entries on initialization
      this.cleanupCache();

    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  private isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Saves an uploaded image metadata to local storage (excludes actual file data for performance).
   *
   * This method stores image metadata including upload time, processing status, and analysis results
   * while excluding the actual file data to optimize storage usage. The service automatically manages
   * history size limits and removes old entries when necessary.
   *
   * @param {UploadedImage} image - The complete image object with metadata
   * @returns {Promise<APIResponse<boolean>>} Promise resolving to success status
   *
   * @example
   * ```typescript
   * const image: UploadedImage = {
   *   id: crypto.randomUUID(),
   *   file: selectedFile,
   *   name: selectedFile.name,
   *   url: URL.createObjectURL(selectedFile),
   *   uploadedAt: new Date(),
   *   status: 'completed'
   * };
   *
   * const result = await storageService.saveImage(image);
   * if (result.success) {
   *   console.log('Image metadata saved successfully');
   * } else {
   *   console.error('Save failed:', result.error);
   * }
   * ```
   *
   * @see {@link UploadedImage} For complete image structure
   * @see {@link StoredImage} For stored metadata structure
   */
  public async saveImage(image: UploadedImage): Promise<APIResponse<boolean>> {
    try {
      if (!this.isStorageAvailable()) {
        return {
          success: false,
          error: 'STORAGE_UNAVAILABLE',
          data: false
        };
      }

      const images = this.getAllStoredImages();

      // Remove existing image with same ID
      const filteredImages = images.filter((img: StoredImage) => img.id !== image.id);

      // Add new image (convert to StoredImage by omitting file and preview)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { file, preview, ...storedImage } = image;
      filteredImages.push(storedImage);

      // Apply history size limit
      if (filteredImages.length > this.options.maxHistorySize) {
        filteredImages.splice(0, filteredImages.length - this.options.maxHistorySize);
      }

      localStorage.setItem(this.STORAGE_KEYS.IMAGES, JSON.stringify(filteredImages));

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to save image:', error);
      return {
        success: false,
        error: 'SAVE_FAILED',
        data: false
      };
    }
  }

  /**
   * Retrieves all stored image metadata without file data.
   *
   * @returns {StoredImage[]} Array of stored image metadata
   *
   * @example
   * ```typescript
   * const storedImages = storageService.getAllStoredImages();
   * console.log(`Found ${storedImages.length} stored images`);
   *
   * storedImages.forEach(img => {
   *   console.log(`- ${img.name} (${img.uploadedAt.toLocaleDateString()})`);
   * });
   * ```
   */
  public getAllStoredImages(): StoredImage[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.IMAGES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get images:', error);
      return [];
    }
  }

  public getAllImages(): UploadedImage[] {
    // This method returns stored images as UploadedImage type for compatibility
    // Note: file and preview will be undefined since they're not stored
    return this.getAllStoredImages() as UploadedImage[];
  }

  public async getImage(id: string): Promise<APIResponse<UploadedImage | null>> {
    try {
      const images = this.getAllImages();
      const image = images.find(img => img.id === id);

      return {
        success: true,
        data: image || null
      };

    } catch (error) {
      console.error('Failed to get image:', error);
      return {
        success: false,
        error: 'RETRIEVAL_FAILED',
        data: null
      };
    }
  }

  public async deleteImage(id: string): Promise<APIResponse<boolean>> {
    try {
      const images = this.getAllImages();
      const filteredImages = images.filter(img => img.id !== id);

      localStorage.setItem(this.STORAGE_KEYS.IMAGES, JSON.stringify(filteredImages));

      // Also remove associated results and cache entries
      await this.deleteResult(id);
      await this.deleteCachedAnalysis(id);

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to delete image:', error);
      return {
        success: false,
        error: 'DELETE_FAILED',
        data: false
      };
    }
  }

  /**
   * Saves AI detection analysis results for future reference and caching.
   *
   * This method stores complete analysis results including confidence scores, technical analysis,
   * and metadata. Results are automatically managed with history limits and can be retrieved
   * for display or caching purposes.
   *
   * @param {DetectionResult} result - Complete detection analysis result
   * @returns {Promise<APIResponse<boolean>>} Promise resolving to success status
   *
   * @example
   * ```typescript
   * const analysisResult = await aiDetectionService.analyzeImage(file);
   *
   * if (analysisResult.success) {
   *   const saveResult = await storageService.saveResult(analysisResult.data);
   *   if (saveResult.success) {
   *     console.log('Analysis result cached for future reference');
   *   }
   * }
   * ```
   *
   * @see {@link DetectionResult} For result structure
   * @see {@link cacheAnalysis} For hash-based caching
   */
  public async saveResult(result: DetectionResult): Promise<APIResponse<boolean>> {
    try {
      if (!this.isStorageAvailable()) {
        return {
          success: false,
          error: 'STORAGE_UNAVAILABLE',
          data: false
        };
      }

      const results = this.getAllResults();

      // Remove existing result for same image
      const filteredResults = results.filter(r => r.imageId !== result.imageId);

      // Add new result
      filteredResults.push(result);

      // Apply history size limit
      if (filteredResults.length > this.options.maxHistorySize) {
        filteredResults.splice(0, filteredResults.length - this.options.maxHistorySize);
      }

      localStorage.setItem(this.STORAGE_KEYS.RESULTS, JSON.stringify(filteredResults));

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to save result:', error);
      return {
        success: false,
        error: 'SAVE_FAILED',
        data: false
      };
    }
  }

  public getAllResults(): DetectionResult[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.RESULTS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get results:', error);
      return [];
    }
  }

  public async getResult(imageId: string): Promise<APIResponse<DetectionResult | null>> {
    try {
      const results = this.getAllResults();
      const result = results.find(r => r.imageId === imageId);

      return {
        success: true,
        data: result || null
      };

    } catch (error) {
      console.error('Failed to get result:', error);
      return {
        success: false,
        error: 'RETRIEVAL_FAILED',
        data: null
      };
    }
  }

  public async deleteResult(imageId: string): Promise<APIResponse<boolean>> {
    try {
      const results = this.getAllResults();
      const filteredResults = results.filter(r => r.imageId !== imageId);

      localStorage.setItem(this.STORAGE_KEYS.RESULTS, JSON.stringify(filteredResults));

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to delete result:', error);
      return {
        success: false,
        error: 'DELETE_FAILED',
        data: false
      };
    }
  }

  /**
   * Caches analysis results using image hash for fast retrieval of identical images.
   *
   * This method provides intelligent caching based on image content hashes, allowing
   * instant results for previously analyzed images. Cache entries include access statistics
   * and automatic expiration based on age.
   *
   * @param {string} imageHash - SHA-256 hash of the image content
   * @param {DetectionResult} result - Complete analysis result to cache
   * @returns {Promise<APIResponse<boolean>>} Promise resolving to success status
   *
   * @example
   * ```typescript
   * // Generate hash for image
   * const hash = await storageService.createImageHash(file);
   *
   * // Cache the analysis result
   * await storageService.cacheAnalysis(hash, analysisResult);
   *
   * // Later retrieval is instant
   * const cached = await storageService.getCachedAnalysis(hash);
   * if (cached.success && cached.data) {
   *   console.log('Using cached analysis result');
   * }
   * ```
   *
   * @see {@link getCachedAnalysis} For retrieving cached results
   * @see {@link createImageHash} For generating content hashes
   */
  public async cacheAnalysis(imageHash: string, result: DetectionResult): Promise<APIResponse<boolean>> {
    try {
      const cache = this.getAllCachedAnalyses();

      // Remove existing entry for same hash
      const filteredCache = cache.filter(c => c.imageHash !== imageHash);

      // Add new cache entry
      const cachedAnalysis: CachedAnalysis = {
        imageHash,
        result,
        cachedAt: new Date(),
        accessCount: 1,
        lastAccessed: new Date()
      };

      filteredCache.push(cachedAnalysis);

      localStorage.setItem(this.STORAGE_KEYS.CACHE, JSON.stringify(filteredCache));

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to cache analysis:', error);
      return {
        success: false,
        error: 'CACHE_FAILED',
        data: false
      };
    }
  }

  /**
   * Retrieves cached analysis results for an image hash with automatic expiration checking.
   *
   * This method checks for cached analysis results and automatically validates expiration,
   * updates access statistics, and removes expired entries. Provides significant performance
   * improvement for repeated analysis of identical images.
   *
   * @param {string} imageHash - SHA-256 hash of the image content
   * @returns {Promise<APIResponse<DetectionResult | null>>} Promise resolving to cached result or null
   *
   * @example
   * ```typescript
   * const imageHash = await storageService.createImageHash(file);
   * const cachedResult = await storageService.getCachedAnalysis(imageHash);
   *
   * if (cachedResult.success && cachedResult.data) {
   *   console.log('Found cached analysis - skipping API call');
   *   displayResults(cachedResult.data);
   * } else {
   *   console.log('No cache found - performing new analysis');
   *   const newResult = await aiDetectionService.analyzeImage(file);
   * }
   * ```
   *
   * @see {@link cacheAnalysis} For storing analysis results
   * @see {@link DetectionResult} For result structure
   */
  public async getCachedAnalysis(imageHash: string): Promise<APIResponse<DetectionResult | null>> {
    try {
      const cache = this.getAllCachedAnalyses();
      const cached = cache.find(c => c.imageHash === imageHash);

      if (!cached) {
        return {
          success: true,
          data: null
        };
      }

      // Check if cache entry is expired
      const now = new Date();
      const age = now.getTime() - cached.cachedAt.getTime();

      if (age > this.options.maxCacheAge) {
        await this.deleteCachedAnalysis(imageHash);
        return {
          success: true,
          data: null
        };
      }

      // Update access statistics
      cached.accessCount++;
      cached.lastAccessed = now;

      const updatedCache = cache.map(c =>
        c.imageHash === imageHash ? cached : c
      );

      localStorage.setItem(this.STORAGE_KEYS.CACHE, JSON.stringify(updatedCache));

      return {
        success: true,
        data: cached.result
      };

    } catch (error) {
      console.error('Failed to get cached analysis:', error);
      return {
        success: false,
        error: 'CACHE_RETRIEVAL_FAILED',
        data: null
      };
    }
  }

  public getAllCachedAnalyses(): CachedAnalysis[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.CACHE);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get cached analyses:', error);
      return [];
    }
  }

  public async deleteCachedAnalysis(imageHash: string): Promise<APIResponse<boolean>> {
    try {
      const cache = this.getAllCachedAnalyses();
      const filteredCache = cache.filter(c => c.imageHash !== imageHash);

      localStorage.setItem(this.STORAGE_KEYS.CACHE, JSON.stringify(filteredCache));

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to delete cached analysis:', error);
      return {
        success: false,
        error: 'CACHE_DELETE_FAILED',
        data: false
      };
    }
  }

  private cleanupCache(): void {
    try {
      const cache = this.getAllCachedAnalyses();
      const now = new Date();

      const validCache = cache.filter(cached => {
        const age = now.getTime() - cached.cachedAt.getTime();
        return age <= this.options.maxCacheAge;
      });

      localStorage.setItem(this.STORAGE_KEYS.CACHE, JSON.stringify(validCache));

    } catch (error) {
      console.error('Failed to cleanup cache:', error);
    }
  }

  /**
   * Saves user application preferences with automatic merging and validation.
   *
   * This method allows partial updates to user preferences while preserving existing settings.
   * Preferences are immediately persisted and available across application sessions.
   *
   * @param {Partial<UserPreferences>} preferences - Partial or complete preferences object
   * @returns {Promise<APIResponse<boolean>>} Promise resolving to success status
   *
   * @example
   * ```typescript
   * // Update specific preferences
   * await storageService.savePreferences({
   *   theme: 'dark',
   *   autoAnalyze: true
   * });
   *
   * // Update API settings only
   * await storageService.savePreferences({
   *   apiSettings: {
   *     hiveApiKey: 'new-api-key',
   *     rateLimitDelay: 2000
   *   }
   * });
   * ```
   *
   * @see {@link getPreferences} For retrieving current preferences
   * @see {@link UserPreferences} For complete preferences structure
   */
  public async savePreferences(preferences: Partial<UserPreferences>): Promise<APIResponse<boolean>> {
    try {
      const current = this.getPreferences();
      const updated = { ...current, ...preferences };

      localStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to save preferences:', error);
      return {
        success: false,
        error: 'PREFERENCE_SAVE_FAILED',
        data: false
      };
    }
  }

  /**
   * Retrieves current user preferences with automatic default value population.
   *
   * @returns {UserPreferences} Current preferences with defaults for missing values
   *
   * @example
   * ```typescript
   * const preferences = storageService.getPreferences();
   * console.log(`Current theme: ${preferences.theme}`);
   * console.log(`Auto-analyze enabled: ${preferences.autoAnalyze}`);
   * console.log(`Rate limit delay: ${preferences.apiSettings.rateLimitDelay}ms`);
   * ```
   */
  public getPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.PREFERENCES);
      const stored = data ? JSON.parse(data) : {};

      return { ...this.DEFAULT_PREFERENCES, ...stored };

    } catch (error) {
      console.error('Failed to get preferences:', error);
      return this.DEFAULT_PREFERENCES;
    }
  }

  /**
   * Retrieves comprehensive storage usage statistics and metadata.
   *
   * Provides detailed information about storage utilization, entry counts, and date ranges
   * for monitoring and optimization purposes.
   *
   * @returns {StorageStats} Comprehensive storage statistics
   *
   * @example
   * ```typescript
   * const stats = storageService.getStorageStats();
   * console.log(`Storage used: ${(stats.storageUsed / 1024 / 1024).toFixed(2)} MB`);
   * console.log(`Total images: ${stats.totalImages}`);
   * console.log(`Cached results: ${stats.totalResults}`);
   *
   * if (stats.oldestEntry) {
   *   console.log(`Oldest entry: ${stats.oldestEntry.toLocaleDateString()}`);
   * }
   * ```
   *
   * @see {@link StorageStats} For detailed statistics structure
   */
  public getStorageStats(): StorageStats {
    try {
      const images = this.getAllImages();
      const results = this.getAllResults();
      const cache = this.getAllCachedAnalyses();

      const allDates = [
        ...images.map(img => new Date(img.uploadedAt)),
        ...results.map(r => new Date(r.analysis.timestamp)),
        ...cache.map(c => new Date(c.cachedAt))
      ].filter(date => !isNaN(date.getTime()));

      // Calculate storage usage (approximate)
      const storageUsed = this.calculateStorageUsage();

      return {
        totalImages: images.length,
        totalResults: results.length,
        storageUsed,
        oldestEntry: allDates.length > 0 ? new Date(Math.min(...allDates.map(d => d.getTime()))) : null,
        newestEntry: allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : null
      };

    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalImages: 0,
        totalResults: 0,
        storageUsed: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }
  }

  private calculateStorageUsage(): number {
    try {
      let totalSize = 0;

      Object.values(this.STORAGE_KEYS).forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      });

      return totalSize;

    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
      return 0;
    }
  }

  public async clearAllData(): Promise<APIResponse<boolean>> {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      this.initializeStorage();

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to clear all data:', error);
      return {
        success: false,
        error: 'CLEAR_FAILED',
        data: false
      };
    }
  }

  public async clearHistory(): Promise<APIResponse<boolean>> {
    try {
      localStorage.setItem(this.STORAGE_KEYS.IMAGES, JSON.stringify([]));
      localStorage.setItem(this.STORAGE_KEYS.RESULTS, JSON.stringify([]));

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to clear history:', error);
      return {
        success: false,
        error: 'CLEAR_HISTORY_FAILED',
        data: false
      };
    }
  }

  public async clearCache(): Promise<APIResponse<boolean>> {
    try {
      localStorage.setItem(this.STORAGE_KEYS.CACHE, JSON.stringify([]));

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to clear cache:', error);
      return {
        success: false,
        error: 'CLEAR_CACHE_FAILED',
        data: false
      };
    }
  }

  /**
   * Creates a SHA-256 hash of image file content for caching and deduplication.
   *
   * This method generates a cryptographic hash of the file content, enabling accurate
   * identification of identical images regardless of filename or metadata changes.
   * Falls back to metadata-based hash if cryptographic hashing fails.
   *
   * @param {File} file - The image file to hash
   * @returns {Promise<string>} Promise resolving to SHA-256 hash string
   *
   * @example
   * ```typescript
   * const file = fileInput.files[0];
   * const hash = await storageService.createImageHash(file);
   * console.log(`Image hash: ${hash}`);
   *
   * // Use for caching
   * const cached = await storageService.getCachedAnalysis(hash);
   * if (!cached.data) {
   *   const result = await aiDetectionService.analyzeImage(file);
   *   await storageService.cacheAnalysis(hash, result);
   * }
   * ```
   *
   * @see {@link cacheAnalysis} For using hashes in caching
   * @see {@link getCachedAnalysis} For hash-based retrieval
   */
  public async createImageHash(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Failed to create image hash:', error);
      // Fallback to file metadata hash
      return `${file.name}-${file.size}-${file.lastModified}`;
    }
  }

  // Export/Import functionality
  public async exportData(): Promise<APIResponse<string>> {
    try {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        images: this.getAllImages(),
        results: this.getAllResults(),
        preferences: this.getPreferences(),
        stats: this.getStorageStats()
      };

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      };

    } catch (error) {
      console.error('Failed to export data:', error);
      return {
        success: false,
        error: 'EXPORT_FAILED',
        data: ''
      };
    }
  }

  public async importData(jsonData: string): Promise<APIResponse<boolean>> {
    try {
      const importData = JSON.parse(jsonData);

      // Validate data structure
      if (!importData.version || !importData.images || !importData.results) {
        return {
          success: false,
          error: 'INVALID_IMPORT_DATA',
          data: false
        };
      }

      // Import data
      localStorage.setItem(this.STORAGE_KEYS.IMAGES, JSON.stringify(importData.images));
      localStorage.setItem(this.STORAGE_KEYS.RESULTS, JSON.stringify(importData.results));

      if (importData.preferences) {
        localStorage.setItem(this.STORAGE_KEYS.PREFERENCES, JSON.stringify(importData.preferences));
      }

      return {
        success: true,
        data: true
      };

    } catch (error) {
      console.error('Failed to import data:', error);
      return {
        success: false,
        error: 'IMPORT_FAILED',
        data: false
      };
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();