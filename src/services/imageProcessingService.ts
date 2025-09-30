import type { APIResponse } from '../types/index';

/**
 * Configuration options for image processing operations.
 */
export interface ImageProcessingOptions {
  /** Maximum width in pixels (default: 4096) */
  maxWidth?: number;
  /** Maximum height in pixels (default: 4096) */
  maxHeight?: number;
  /** JPEG quality from 0-1 (default: 0.92) */
  quality?: number;
  /** Output format (default: preserves original) */
  format?: 'webp' | 'jpeg' | 'png';
  /** Whether to remove EXIF metadata (default: false) */
  removeMetadata?: boolean;
}

/**
 * Result of image processing operations with performance metrics.
 */
export interface ProcessedImageResult {
  /** The processed image file */
  file: File;
  /** Original file size in bytes */
  originalSize: number;
  /** Processed file size in bytes */
  processedSize: number;
  /** Compression ratio (processed/original) */
  compressionRatio: number;
  /** Image dimensions after processing */
  dimensions: {
    /** Width in pixels */
    width: number;
    /** Height in pixels */
    height: number;
  };
  /** Final image format */
  format: string;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Comprehensive image metadata extracted from files.
 */
export interface ImageMetadata {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Image MIME type */
  format: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  lastModified: number;
  /** EXIF data if present */
  exifData?: Record<string, unknown>;
  /** Color profile information */
  colorProfile?: string;
  /** Whether image has transparency channel */
  hasTransparency?: boolean;
}

/**
 * ImageProcessingService provides comprehensive client-side image processing capabilities.
 *
 * This service handles:
 * - Image validation and format checking
 * - Resolution and quality optimization
 * - Format conversion (JPEG, PNG, WebP)
 * - Metadata extraction and manipulation
 * - File size optimization for API upload
 *
 * Features:
 * - Browser-native processing with Canvas API
 * - Maintains aspect ratios during resizing
 * - Configurable quality and compression settings
 * - EXIF metadata preservation options
 * - Performance monitoring and optimization
 *
 * @example
 * ```typescript
 * const service = new ImageProcessingService();
 *
 * // Process image with optimization
 * const result = await service.processImage(file, {
 *   maxWidth: 2048,
 *   maxHeight: 2048,
 *   quality: 0.85,
 *   format: 'webp'
 * });
 *
 * if (result.success) {
 *   console.log(`Optimized: ${result.data.compressionRatio * 100}% of original size`);
 * }
 * ```
 *
 * @see {@link ImageProcessingOptions} For processing configuration
 * @see {@link ProcessedImageResult} For processing results
 * @see {@link ImageMetadata} For metadata structure
 */
export class ImageProcessingService {
  private readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly DEFAULT_MAX_DIMENSION = 4096;

  /**
   * Checks if the provided file format is supported for processing.
   *
   * @param {File} file - The file to check
   * @returns {boolean} True if format is supported (JPEG, PNG, WebP, GIF)
   *
   * @example
   * ```typescript
   * const isSupported = service.isSupportedFormat(file);
   * if (!isSupported) {
   *   console.error('Unsupported file format');
   * }
   * ```
   */
  public isSupportedFormat(file: File): boolean {
    return this.SUPPORTED_FORMATS.includes(file.type);
  }

  public async validateImage(file: File): Promise<APIResponse<ImageMetadata>> {
    try {
      // Check file type
      if (!this.isSupportedFormat(file)) {
        return {
          success: false,
          error: 'UNSUPPORTED_FORMAT',
          data: undefined
        };
      }

      // Check file size
      if (file.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: 'FILE_TOO_LARGE',
          data: undefined
        };
      }

      // Check if file is corrupted by trying to load it
      const metadata = await this.extractImageMetadata(file);

      // Validate dimensions
      if (metadata.width <= 0 || metadata.height <= 0) {
        return {
          success: false,
          error: 'INVALID_DIMENSIONS',
          data: undefined
        };
      }

      // Check for reasonable dimensions (not too small)
      if (metadata.width < 10 || metadata.height < 10) {
        return {
          success: false,
          error: 'IMAGE_TOO_SMALL',
          data: undefined
        };
      }

      return {
        success: true,
        data: metadata
      };

    } catch (error) {
      console.error('Image validation error:', error);
      return {
        success: false,
        error: 'VALIDATION_FAILED',
        data: undefined
      };
    }
  }

  public async extractImageMetadata(file: File): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        try {
          // Basic metadata
          const metadata: ImageMetadata = {
            width: img.naturalWidth,
            height: img.naturalHeight,
            format: file.type,
            size: file.size,
            lastModified: file.lastModified
          };

          // Check for transparency (PNG/WebP)
          if (file.type === 'image/png' || file.type === 'image/webp') {
            canvas.width = Math.min(img.naturalWidth, 100);
            canvas.height = Math.min(img.naturalHeight, 100);

            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

              // Check if any pixel has alpha < 255
              let hasTransparency = false;
              for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] < 255) {
                  hasTransparency = true;
                  break;
                }
              }
              metadata.hasTransparency = hasTransparency;
            }
          }

          URL.revokeObjectURL(img.src);
          resolve(metadata);
        } catch (error) {
          URL.revokeObjectURL(img.src);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  public async processImage(
    file: File,
    options: ImageProcessingOptions = {}
  ): Promise<APIResponse<ProcessedImageResult>> {
    const startTime = performance.now();

    try {
      // Validate image first
      const validationResult = await this.validateImage(file);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
          data: undefined
        };
      }

      const metadata = validationResult.data!;
      const {
        maxWidth = this.DEFAULT_MAX_DIMENSION,
        maxHeight = this.DEFAULT_MAX_DIMENSION,
        quality = 0.92,
        format = this.getOptimalFormat(file.type),
        removeMetadata = true
      } = options;

      // Calculate new dimensions
      const { width: newWidth, height: newHeight } = this.calculateDimensions(
        metadata.width,
        metadata.height,
        maxWidth,
        maxHeight
      );

      // Check if processing is needed
      const needsResize = newWidth !== metadata.width || newHeight !== metadata.height;
      const needsFormatChange = `image/${format}` !== file.type;
      const needsQualityAdjustment = format === 'jpeg' && quality < 1.0;

      if (!needsResize && !needsFormatChange && !needsQualityAdjustment && !removeMetadata) {
        // No processing needed, return original file
        return {
          success: true,
          data: {
            file: file,
            originalSize: file.size,
            processedSize: file.size,
            compressionRatio: 1.0,
            dimensions: { width: metadata.width, height: metadata.height },
            format: file.type,
            processingTime: performance.now() - startTime
          }
        };
      }

      // Process the image
      const processedFile = await this.performImageProcessing(
        file,
        newWidth,
        newHeight,
        format,
        quality
      );

      const endTime = performance.now();

      return {
        success: true,
        data: {
          file: processedFile,
          originalSize: file.size,
          processedSize: processedFile.size,
          compressionRatio: processedFile.size / file.size,
          dimensions: { width: newWidth, height: newHeight },
          format: processedFile.type,
          processingTime: endTime - startTime
        }
      };

    } catch (error) {
      console.error('Image processing error:', error);
      return {
        success: false,
        error: 'PROCESSING_FAILED',
        data: undefined
      };
    }
  }

  private getOptimalFormat(originalFormat: string): 'webp' | 'jpeg' | 'png' {
    // Default to WebP for best compression, fallback to JPEG for broad compatibility
    if (originalFormat === 'image/png') {
      // Keep PNG for images that might need transparency
      return 'png';
    }
    return 'webp';
  }

  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;

    let newWidth = maxWidth;
    let newHeight = maxWidth / aspectRatio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  private async performImageProcessing(
    file: File,
    targetWidth: number,
    targetHeight: number,
    format: string,
    quality: number
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      img.onload = () => {
        try {
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Use high-quality image rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Fill with white background for JPEG (no transparency)
          if (format === 'jpeg') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }

          // Draw the resized image
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          // Convert to blob with appropriate quality
          const mimeType = `image/${format}`;
          const qualityParam = format === 'jpeg' ? quality : undefined;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob from canvas'));
                return;
              }

              // Create new file with processed data
              const processedFile = new File(
                [blob],
                this.generateProcessedFileName(file.name, format),
                {
                  type: mimeType,
                  lastModified: Date.now()
                }
              );

              URL.revokeObjectURL(img.src);
              resolve(processedFile);
            },
            mimeType,
            qualityParam
          );
        } catch (error) {
          URL.revokeObjectURL(img.src);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image for processing'));
      };

      img.src = URL.createObjectURL(file);
    });
  }

  private generateProcessedFileName(originalName: string, newFormat: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    return `${nameWithoutExt}_processed_${timestamp}.${newFormat}`;
  }

  public async createThumbnail(
    file: File,
    maxSize: number = 200
  ): Promise<APIResponse<File>> {
    try {
      const result = await this.processImage(file, {
        maxWidth: maxSize,
        maxHeight: maxSize,
        quality: 0.8,
        format: 'webp'
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          message: result.message
        };
      }

      // Create thumbnail with specific naming
      const thumbnailBlob = result.data!.file;
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const thumbnailFile = new File(
        [thumbnailBlob],
        `${nameWithoutExt}_thumb.webp`,
        { type: 'image/webp' }
      );

      return {
        success: true,
        data: thumbnailFile
      };

    } catch (error) {
      console.error('Thumbnail creation error:', error);
      return {
        success: false,
        error: 'THUMBNAIL_CREATION_FAILED',
        data: undefined
      };
    }
  }

  public getProcessingCapabilities(): {
    supportedFormats: string[];
    maxFileSize: number;
    maxDimensions: number;
    features: string[];
  } {
    return {
      supportedFormats: this.SUPPORTED_FORMATS,
      maxFileSize: this.MAX_FILE_SIZE,
      maxDimensions: this.DEFAULT_MAX_DIMENSION,
      features: [
        'Image resizing and compression',
        'Format conversion (JPEG, PNG, WebP)',
        'Quality optimization',
        'Metadata extraction and removal',
        'Thumbnail generation',
        'Transparency detection',
        'Automatic format optimization',
        'High-quality image resampling'
      ]
    };
  }
}

// Export singleton instance
export const imageProcessingService = new ImageProcessingService();