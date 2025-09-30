# 📚 Fake Checker API Documentation

Comprehensive documentation for all service APIs in the Fake Checker application, including usage examples, error handling, and integration guidelines.

## 🚀 Quick Start

All services follow a consistent API pattern using the `APIResponse<T>` wrapper:

```typescript
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  retryable?: boolean;
  rateLimitReset?: number;
}
```

## 🤖 AI Detection Service

The core service for AI-generated image detection using Hive AI's advanced machine learning models.

### Class: `AIDetectionService`

Provides comprehensive AI detection capabilities with industry-leading accuracy.

#### Key Features
- ✅ Real-time AI detection with confidence scoring
- ✅ Multi-generator identification (DALL-E, Midjourney, Stable Diffusion, etc.)
- ✅ C2PA metadata analysis for provenance tracking
- ✅ Rate limiting and comprehensive error handling
- ✅ Support for files up to 50MB

### Methods

#### `setApiKey(apiKey: string): void`

Configures the Hive AI API key for authentication.

**Parameters:**
- `apiKey` (string): Your Hive AI API key from [thehive.ai](https://thehive.ai/api)

**Example:**
```typescript
import { aiDetectionService } from '@services/aiDetectionService';

aiDetectionService.setApiKey('your-hive-ai-api-key');
```

#### `hasApiKey(): boolean`

Checks if a valid API key is configured.

**Returns:** `boolean` - True if API key is available

**Example:**
```typescript
if (!aiDetectionService.hasApiKey()) {
  console.warn('Please configure your API key');
  // Redirect to settings or show API key input
}
```

#### `analyzeImage(file: File): Promise<APIResponse<DetectionResult>>`

Analyzes an uploaded image file for AI-generated content detection.

**Parameters:**
- `file` (File): Image file to analyze (JPEG, PNG, WebP, GIF supported)

**Returns:** `Promise<APIResponse<DetectionResult>>` - Detection results with confidence scoring

**Validation:**
- File must be an image type (`image/*`)
- Maximum file size: 50MB
- Requires valid API key

**Example:**
```typescript
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file) {
  try {
    const result = await aiDetectionService.analyzeImage(file);

    if (result.success) {
      const { isAiGenerated, confidence, analysis } = result.data;
      console.log(`AI Generated: ${isAiGenerated ? 'Yes' : 'No'}`);
      console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
      console.log(`Generator: ${analysis.breakdown.details.join(', ')}`);
    } else {
      console.error(`Analysis failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}
```

#### `analyzeImageFromUrl(imageUrl: string): Promise<APIResponse<DetectionResult>>`

Analyzes an image from a URL for AI-generated content detection.

**Parameters:**
- `imageUrl` (string): URL of the image to analyze (must be publicly accessible)

**Returns:** `Promise<APIResponse<DetectionResult>>` - Detection results with confidence scoring

**Example:**
```typescript
const imageUrl = 'https://example.com/suspicious-image.jpg';

try {
  const result = await aiDetectionService.analyzeImageFromUrl(imageUrl);

  if (result.success) {
    const { isAiGenerated, confidence } = result.data;
    console.log(`Image at ${imageUrl} is ${isAiGenerated ? 'likely AI-generated' : 'likely authentic'}`);
    console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
  } else {
    console.error(`URL analysis failed: ${result.error}`);
  }
} catch (error) {
  console.error('Network or parsing error:', error);
}
```

#### `getServiceInfo(): ServiceInfo`

Retrieves information about the AI detection service capabilities.

**Returns:**
```typescript
interface ServiceInfo {
  name: string;           // Service name
  version: string;        // Current version
  capabilities: string[]; // Available features
}
```

**Example:**
```typescript
const info = aiDetectionService.getServiceInfo();
console.log(`Using ${info.name} v${info.version}`);
console.log('Capabilities:', info.capabilities.join(', '));
```

### Error Codes

| Error Code | Description | Retryable |
|------------|-------------|-----------|
| `API_KEY_MISSING` | No API key configured | No |
| `INVALID_FILE_TYPE` | File is not an image | No |
| `FILE_TOO_LARGE` | File exceeds 50MB limit | No |
| `NETWORK_ERROR` | Connection issues | Yes |
| `API_ERROR` | Hive AI API error | Maybe |
| `RATE_LIMITED` | Too many requests | Yes |
| `UNKNOWN_ERROR` | Unexpected error | Maybe |

## 📁 Storage Service

Manages local storage of images, analysis results, and user preferences with comprehensive caching.

### Class: `StorageService`

Provides persistent storage capabilities with automatic cleanup and optimization.

#### Key Features
- ✅ Image metadata storage with analysis caching
- ✅ User preferences management
- ✅ Automatic storage cleanup and optimization
- ✅ Cross-session persistence
- ✅ Storage quota monitoring

### Methods

#### Image Management

##### `saveImage(image: UploadedImage): Promise<APIResponse<boolean>>`

Saves an uploaded image to local storage.

**Parameters:**
- `image` (UploadedImage): Complete image object with metadata

**Returns:** `Promise<APIResponse<boolean>>` - Success status

**Example:**
```typescript
import { storageService } from '@services/storageService';

const image: UploadedImage = {
  id: crypto.randomUUID(),
  file: selectedFile,
  name: selectedFile.name,
  url: URL.createObjectURL(selectedFile),
  uploadedAt: new Date(),
  status: 'completed'
};

const result = await storageService.saveImage(image);
if (result.success) {
  console.log('Image saved successfully');
} else {
  console.error('Save failed:', result.error);
}
```

##### `getAllStoredImages(): StoredImage[]`

Retrieves all stored images (without file data).

**Returns:** `StoredImage[]` - Array of stored image metadata

**Example:**
```typescript
const storedImages = storageService.getAllStoredImages();
console.log(`Found ${storedImages.length} stored images`);

storedImages.forEach(img => {
  console.log(`- ${img.name} (${img.uploadedAt.toLocaleDateString()})`);
});
```

##### `getImage(id: string): Promise<APIResponse<UploadedImage | null>>`

Retrieves a specific image by ID.

**Parameters:**
- `id` (string): Unique image identifier

**Returns:** `Promise<APIResponse<UploadedImage | null>>` - Image data or null if not found

##### `deleteImage(id: string): Promise<APIResponse<boolean>>`

Deletes an image and its associated data.

**Parameters:**
- `id` (string): Unique image identifier

**Returns:** `Promise<APIResponse<boolean>>` - Success status

#### Analysis Results Management

##### `saveResult(result: DetectionResult): Promise<APIResponse<boolean>>`

Saves AI detection analysis results.

**Parameters:**
- `result` (DetectionResult): Complete detection analysis

**Example:**
```typescript
const analysisResult = await aiDetectionService.analyzeImage(file);

if (analysisResult.success) {
  const saveResult = await storageService.saveResult(analysisResult.data);
  if (saveResult.success) {
    console.log('Analysis cached for future reference');
  }
}
```

##### `getCachedAnalysis(imageHash: string): Promise<APIResponse<DetectionResult | null>>`

Retrieves cached analysis results for an image.

**Parameters:**
- `imageHash` (string): SHA-256 hash of the image content

**Returns:** `Promise<APIResponse<DetectionResult | null>>` - Cached analysis or null

#### User Preferences Management

##### `savePreferences(preferences: UserPreferences): Promise<APIResponse<boolean>>`

Saves user application preferences.

**Parameters:**
- `preferences` (UserPreferences): User settings object

**Example:**
```typescript
const preferences: UserPreferences = {
  theme: 'dark',
  autoSave: true,
  notifications: true,
  apiSettings: {
    timeout: 30000,
    retryAttempts: 3
  }
};

await storageService.savePreferences(preferences);
```

##### `getPreferences(): UserPreferences`

Retrieves current user preferences.

**Returns:** `UserPreferences` - Current settings with defaults

#### Storage Management

##### `getStorageStats(): StorageStats`

Retrieves storage usage statistics.

**Returns:**
```typescript
interface StorageStats {
  totalSize: number;        // Total storage used (bytes)
  imageCount: number;       // Number of stored images
  resultCount: number;      // Number of cached analyses
  availableSpace: number;   // Estimated available space
  lastCleanup: Date;       // Last automatic cleanup
}
```

##### `clearStorage(): Promise<APIResponse<boolean>>`

Clears all stored data (images, results, preferences).

**Returns:** `Promise<APIResponse<boolean>>` - Success status

##### `optimizeStorage(): Promise<APIResponse<number>>`

Performs storage optimization and cleanup.

**Returns:** `Promise<APIResponse<number>>` - Bytes freed during optimization

## 🎨 Image Processing Service

Handles client-side image processing, optimization, and metadata extraction.

### Class: `ImageProcessingService`

Provides comprehensive image processing capabilities for analysis preparation.

#### Key Features
- ✅ Image optimization and compression
- ✅ Metadata extraction (EXIF, IPTC, XMP)
- ✅ Format conversion and validation
- ✅ Thumbnail generation
- ✅ Hash calculation for caching

### Methods

#### `processImage(file: File, options?: ImageProcessingOptions): Promise<APIResponse<ProcessedImageResult>>`

Processes an image file with optional optimization.

**Parameters:**
- `file` (File): Image file to process
- `options` (ImageProcessingOptions, optional): Processing configuration

**Processing Options:**
```typescript
interface ImageProcessingOptions {
  maxWidth?: number;         // Maximum width (default: 4096)
  maxHeight?: number;        // Maximum height (default: 4096)
  quality?: number;          // JPEG quality 0-1 (default: 0.9)
  format?: 'jpeg' | 'png' | 'webp'; // Output format
  preserveMetadata?: boolean; // Keep EXIF data (default: true)
  generateThumbnail?: boolean; // Create thumbnail (default: true)
}
```

**Example:**
```typescript
import { imageProcessingService } from '@services/imageProcessingService';

const options: ImageProcessingOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.85,
  preserveMetadata: true,
  generateThumbnail: true
};

const result = await imageProcessingService.processImage(file, options);

if (result.success) {
  const { processedFile, thumbnail, metadata, hash } = result.data;
  console.log(`Processed: ${processedFile.size} bytes`);
  console.log(`Original: ${metadata.originalSize} bytes`);
  console.log(`Thumbnail: ${thumbnail ? 'Generated' : 'Not created'}`);
  console.log(`Hash: ${hash}`);
}
```

#### `extractMetadata(file: File): Promise<APIResponse<ImageMetadata>>`

Extracts comprehensive metadata from an image file.

**Parameters:**
- `file` (File): Image file to analyze

**Returns:**
```typescript
interface ImageMetadata {
  filename: string;
  fileSize: number;
  mimeType: string;
  dimensions: { width: number; height: number };
  exif?: ExifData;          // Camera/device information
  iptc?: IPTCData;          // Image description metadata
  xmp?: XMPData;            // Adobe extensible metadata
  colorSpace?: string;      // Color profile information
  created?: Date;           // Creation timestamp
  modified?: Date;          // Last modification
}
```

#### `generateThumbnail(file: File, size?: number): Promise<APIResponse<Blob>>`

Generates a thumbnail image.

**Parameters:**
- `file` (File): Source image file
- `size` (number, optional): Thumbnail size in pixels (default: 200)

**Example:**
```typescript
const thumbnailResult = await imageProcessingService.generateThumbnail(file, 150);

if (thumbnailResult.success) {
  const thumbnailUrl = URL.createObjectURL(thumbnailResult.data);
  document.querySelector('#thumbnail').src = thumbnailUrl;
}
```

#### `calculateHash(file: File): Promise<APIResponse<string>>`

Calculates SHA-256 hash for image content identification.

**Parameters:**
- `file` (File): Image file to hash

**Returns:** `Promise<APIResponse<string>>` - SHA-256 hash string

## 🛡️ Error Handler Service

Provides centralized error handling, logging, and recovery mechanisms.

### Class: `ErrorHandler`

Manages application-wide error handling with automatic retry and reporting.

#### Key Features
- ✅ Centralized error logging and reporting
- ✅ Automatic retry with exponential backoff
- ✅ User-friendly error message translation
- ✅ Performance monitoring integration
- ✅ Configurable error reporting endpoints

### Methods

#### `withRetry<T>(operation: () => Promise<T>, options?: RetryOptions): Promise<T>`

Executes an operation with automatic retry on failure.

**Parameters:**
- `operation` (function): Async function to execute
- `options` (RetryOptions, optional): Retry configuration

**Retry Options:**
```typescript
interface RetryOptions {
  maxAttempts?: number;     // Maximum retry attempts (default: 3)
  baseDelay?: number;       // Base delay in ms (default: 1000)
  maxDelay?: number;        // Maximum delay in ms (default: 30000)
  backoffFactor?: number;   // Exponential backoff factor (default: 2)
  retryCondition?: (error: Error) => boolean; // Custom retry condition
}
```

**Example:**
```typescript
import { errorHandler } from '@services/errorHandler';

const analysisWithRetry = await errorHandler.withRetry(
  () => aiDetectionService.analyzeImage(file),
  {
    maxAttempts: 5,
    baseDelay: 2000,
    retryCondition: (error) => error.message.includes('timeout')
  }
);
```

#### `logError(error: Error, context?: ErrorContext): void`

Logs an error with contextual information.

**Parameters:**
- `error` (Error): The error to log
- `context` (ErrorContext, optional): Additional context

**Context Options:**
```typescript
interface ErrorContext {
  userId?: string;          // User identifier
  sessionId?: string;       // Session identifier
  component?: string;       // Component where error occurred
  action?: string;          // Action being performed
  metadata?: Record<string, any>; // Additional data
}
```

#### `translateError(error: string | Error): string`

Converts technical error messages to user-friendly descriptions.

**Example:**
```typescript
const technicalError = 'ECONNREFUSED: Connection refused';
const userMessage = errorHandler.translateError(technicalError);
// Returns: "Unable to connect to the service. Please check your internet connection."
```

## 🔧 Advanced Features Service

Provides advanced image analysis capabilities and experimental features.

### Functions

#### `detectArtifacts(imageData: ImageData): Promise<ArtifactAnalysis[]>`

Analyzes image for visual artifacts that may indicate AI generation.

**Parameters:**
- `imageData` (ImageData): Canvas ImageData object

**Returns:**
```typescript
interface ArtifactAnalysis {
  type: 'blur_inconsistency' | 'lighting_anomaly' | 'compression_artifact' | 'upscaling_artifact' | 'generation_pattern';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  description: string;
  location?: { x: number; y: number; width: number; height: number };
}
```

#### `analyzeCompression(imageData: ImageData): Promise<CompressionAnalysis>`

Analyzes image compression patterns and quality.

#### `detectUpscaling(imageData: ImageData): Promise<UpscalingAnalysis>`

Detects signs of AI-based image upscaling or enhancement.

## 🔗 Integration Examples

### Complete Detection Workflow

```typescript
import {
  aiDetectionService,
  storageService,
  imageProcessingService,
  errorHandler
} from '@services';

async function analyzeUploadedImage(file: File): Promise<void> {
  try {
    // 1. Process and validate image
    const processResult = await imageProcessingService.processImage(file, {
      maxWidth: 2048,
      preserveMetadata: true
    });

    if (!processResult.success) {
      throw new Error(`Processing failed: ${processResult.error}`);
    }

    const { processedFile, hash } = processResult.data;

    // 2. Check for cached analysis
    const cachedResult = await storageService.getCachedAnalysis(hash);

    if (cachedResult.success && cachedResult.data) {
      console.log('Using cached analysis');
      displayResults(cachedResult.data);
      return;
    }

    // 3. Perform AI analysis with retry logic
    const analysisResult = await errorHandler.withRetry(
      () => aiDetectionService.analyzeImage(processedFile),
      { maxAttempts: 3, baseDelay: 1000 }
    );

    if (!analysisResult.success) {
      throw new Error(`Analysis failed: ${analysisResult.error}`);
    }

    // 4. Save results for future reference
    await Promise.all([
      storageService.saveResult(analysisResult.data),
      storageService.saveImage({
        id: crypto.randomUUID(),
        file: processedFile,
        name: file.name,
        url: URL.createObjectURL(processedFile),
        uploadedAt: new Date(),
        status: 'completed'
      })
    ]);

    // 5. Display results to user
    displayResults(analysisResult.data);

  } catch (error) {
    const userMessage = errorHandler.translateError(error);
    showErrorToUser(userMessage);

    errorHandler.logError(error, {
      component: 'ImageAnalysis',
      action: 'analyzeUploadedImage',
      metadata: { filename: file.name, size: file.size }
    });
  }
}

function displayResults(result: DetectionResult): void {
  const { isAiGenerated, confidence, analysis } = result;

  console.log(`Result: ${isAiGenerated ? 'AI Generated' : 'Likely Authentic'}`);
  console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
  console.log(`Analysis Details:`);
  analysis.breakdown.details.forEach(detail => {
    console.log(`- ${detail}`);
  });
}
```

### Batch Processing

```typescript
async function processBatchImages(files: FileList): Promise<DetectionResult[]> {
  const results: DetectionResult[] = [];
  const batchSize = 3; // Process 3 images concurrently

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = Array.from(files).slice(i, i + batchSize);

    const batchPromises = batch.map(async (file) => {
      try {
        const result = await analyzeUploadedImage(file);
        return result;
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter(Boolean));

    // Add delay between batches to respect rate limits
    if (i + batchSize < files.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}
```

## 📊 Performance Monitoring

### Service Metrics Collection

```typescript
class PerformanceMonitor {
  static trackServiceCall(serviceName: string, methodName: string) {
    const startTime = performance.now();

    return {
      end: (success: boolean, error?: string) => {
        const duration = performance.now() - startTime;

        console.log(`Service Call: ${serviceName}.${methodName}`);
        console.log(`Duration: ${duration.toFixed(2)}ms`);
        console.log(`Success: ${success}`);

        if (error) {
          console.log(`Error: ${error}`);
        }

        // Send to analytics if configured
        if (typeof gtag !== 'undefined') {
          gtag('event', 'service_call', {
            service_name: serviceName,
            method_name: methodName,
            duration_ms: Math.round(duration),
            success: success
          });
        }
      }
    };
  }
}

// Usage in service calls
const monitor = PerformanceMonitor.trackServiceCall('AIDetectionService', 'analyzeImage');
try {
  const result = await aiDetectionService.analyzeImage(file);
  monitor.end(result.success, result.error);
  return result;
} catch (error) {
  monitor.end(false, error.message);
  throw error;
}
```

## 🐛 Troubleshooting Guide

### Common Issues and Solutions

#### API Key Issues
```typescript
// Check API key configuration
if (!aiDetectionService.hasApiKey()) {
  console.error('API key not configured');
  // Solution: Guide user to settings page
}

// Test API key validity
try {
  const testResult = await aiDetectionService.getServiceInfo();
  console.log('API key is valid');
} catch (error) {
  console.error('API key invalid or network issue');
}
```

#### Rate Limiting
```typescript
// Handle rate limits gracefully
const result = await aiDetectionService.analyzeImage(file);

if (!result.success && result.error === 'RATE_LIMITED') {
  const retryAfter = result.rateLimitReset || 60000;
  console.log(`Rate limited. Retry after ${retryAfter}ms`);

  setTimeout(() => {
    // Retry the request
    analyzeImage(file);
  }, retryAfter);
}
```

#### Storage Issues
```typescript
// Check storage availability
const stats = storageService.getStorageStats();

if (stats.availableSpace < 10 * 1024 * 1024) { // Less than 10MB
  console.warn('Low storage space');

  // Trigger cleanup
  const freedBytes = await storageService.optimizeStorage();
  console.log(`Freed ${freedBytes} bytes`);
}
```

#### Network Connectivity
```typescript
// Network connectivity check
async function checkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('/api/health', {
      method: 'HEAD',
      cache: 'no-cache'
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Use before making API calls
if (!(await checkConnectivity())) {
  showOfflineMessage();
  return;
}
```

## 📈 Best Practices

### Error Handling
1. **Always check `APIResponse.success`** before using data
2. **Use `errorHandler.withRetry()`** for network operations
3. **Provide user-friendly error messages** using `translateError()`
4. **Log errors with context** for debugging

### Performance Optimization
1. **Cache analysis results** using `StorageService`
2. **Process images** before analysis to reduce API costs
3. **Use batch processing** for multiple files
4. **Implement proper rate limiting**

### Security Considerations
1. **Never expose API keys** in client-side code
2. **Validate file types** before processing
3. **Implement file size limits**
4. **Sanitize user inputs**

## 🔗 Additional Resources

- [Hive AI API Documentation](https://thehive.ai/api)
- [Security Best Practices](./SECURITY.md)
- [Accessibility Guidelines](./ACCESSIBILITY.md)
- [Architecture Overview](./ARCHITECTURE.md)

---

**Last Updated**: September 30, 2025
**Version**: 1.0.0
**Maintainer**: Victor Williams (@Vaporjawn)