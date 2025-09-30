# 🔧 Service Integration Guide

Complete integration guide for Fake Checker services with practical examples, common patterns, and troubleshooting.

## 🚀 Quick Integration

### Basic Setup

```typescript
// services/index.ts - Central service exports
export { aiDetectionService } from './aiDetectionService';
export { storageService } from './storageService';
export { imageProcessingService } from './imageProcessingService';
export { errorHandler } from './errorHandler';
export * from './types';

// Import in your components
import {
  aiDetectionService,
  storageService,
  imageProcessingService,
  errorHandler
} from '../services';
```

### Environment Setup

```typescript
// Initialize services with configuration
import { aiDetectionService } from './services';

// Set API key (preferably from environment or user input)
const apiKey = import.meta.env.VITE_HIVE_AI_API_KEY || localStorage.getItem('hive_api_key');

if (apiKey) {
  aiDetectionService.setApiKey(apiKey);
} else {
  console.warn('Hive AI API key not configured');
  // Redirect to settings or show configuration UI
}
```

## 🎯 Common Integration Patterns

### Pattern 1: Single Image Analysis

Complete workflow for analyzing a single uploaded image:

```typescript
import {
  aiDetectionService,
  storageService,
  imageProcessingService,
  errorHandler
} from '../services';

interface AnalysisState {
  loading: boolean;
  result: DetectionResult | null;
  error: string | null;
  progress: number;
}

class ImageAnalyzer {
  private state: AnalysisState = {
    loading: false,
    result: null,
    error: null,
    progress: 0
  };

  async analyzeImage(file: File, onProgress?: (progress: number) => void): Promise<DetectionResult | null> {
    try {
      this.state.loading = true;
      this.state.error = null;
      this.updateProgress(10, onProgress);

      // Step 1: Validate and process image
      const processingResult = await imageProcessingService.processImage(file, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.9,
        preserveMetadata: true
      });

      if (!processingResult.success) {
        throw new Error(processingResult.error || 'Image processing failed');
      }

      this.updateProgress(30, onProgress);

      // Step 2: Check for cached analysis
      const { hash } = processingResult.data;
      const cachedResult = await storageService.getCachedAnalysis(hash);

      if (cachedResult.success && cachedResult.data) {
        this.updateProgress(100, onProgress);
        this.state.result = cachedResult.data;
        return cachedResult.data;
      }

      this.updateProgress(40, onProgress);

      // Step 3: Perform AI detection with retry
      const analysisResult = await errorHandler.withRetry(
        async () => {
          this.updateProgress(70, onProgress);
          return await aiDetectionService.analyzeImage(processingResult.data.processedFile);
        },
        {
          maxAttempts: 3,
          baseDelay: 1000,
          retryCondition: (error) =>
            error.message.includes('timeout') ||
            error.message.includes('network')
        }
      );

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Analysis failed');
      }

      this.updateProgress(90, onProgress);

      // Step 4: Save results for future use
      await Promise.all([
        storageService.saveResult(analysisResult.data),
        storageService.saveImage({
          id: crypto.randomUUID(),
          file: processingResult.data.processedFile,
          name: file.name,
          url: URL.createObjectURL(processingResult.data.processedFile),
          uploadedAt: new Date(),
          status: 'completed'
        })
      ]);

      this.updateProgress(100, onProgress);
      this.state.result = analysisResult.data;

      return analysisResult.data;

    } catch (error) {
      this.state.error = errorHandler.translateError(error as Error);

      errorHandler.logError(error as Error, {
        component: 'ImageAnalyzer',
        action: 'analyzeImage',
        metadata: {
          filename: file.name,
          fileSize: file.size,
          mimeType: file.type
        }
      });

      return null;
    } finally {
      this.state.loading = false;
    }
  }

  private updateProgress(progress: number, callback?: (progress: number) => void): void {
    this.state.progress = progress;
    if (callback) {
      callback(progress);
    }
  }

  getState(): AnalysisState {
    return { ...this.state };
  }
}

// Usage in React component
export const ImageUploadComponent: React.FC = () => {
  const [analyzer] = useState(() => new ImageAnalyzer());
  const [state, setState] = useState(analyzer.getState());

  const handleFileUpload = async (file: File) => {
    const result = await analyzer.analyzeImage(
      file,
      (progress) => setState(analyzer.getState())
    );

    if (result) {
      console.log('Analysis complete:', result);
      // Update UI with results
    } else {
      console.error('Analysis failed:', analyzer.getState().error);
      // Show error to user
    }
  };

  return (
    <div>
      {state.loading && (
        <div>
          <progress value={state.progress} max={100} />
          <span>Processing... {state.progress}%</span>
        </div>
      )}

      {state.error && (
        <div className="error">
          Error: {state.error}
        </div>
      )}

      {state.result && (
        <div className="results">
          <h3>Analysis Results</h3>
          <p>AI Generated: {state.result.isAiGenerated ? 'Yes' : 'No'}</p>
          <p>Confidence: {(state.result.confidence * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
};
```

### Pattern 2: Batch Image Processing

Handle multiple images with proper queue management and rate limiting:

```typescript
import { EventEmitter } from 'events';

interface BatchJob {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: DetectionResult;
  error?: string;
  progress: number;
}

class BatchProcessor extends EventEmitter {
  private queue: BatchJob[] = [];
  private processing = false;
  private concurrentLimit = 2;
  private activeJobs = 0;

  addFiles(files: FileList | File[]): string[] {
    const fileArray = Array.from(files);
    const jobIds: string[] = [];

    fileArray.forEach(file => {
      const job: BatchJob = {
        id: crypto.randomUUID(),
        file,
        status: 'pending',
        progress: 0
      };

      this.queue.push(job);
      jobIds.push(job.id);
      this.emit('jobAdded', job);
    });

    this.processQueue();
    return jobIds;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeJobs < this.concurrentLimit) {
      const job = this.queue.find(j => j.status === 'pending');
      if (!job) break;

      this.activeJobs++;
      this.processJob(job);
    }

    if (this.activeJobs === 0) {
      this.processing = false;
      this.emit('batchComplete');
    }
  }

  private async processJob(job: BatchJob): Promise<void> {
    try {
      job.status = 'processing';
      this.emit('jobStarted', job);

      // Use ImageAnalyzer from previous pattern
      const analyzer = new ImageAnalyzer();
      const result = await analyzer.analyzeImage(
        job.file,
        (progress) => {
          job.progress = progress;
          this.emit('jobProgress', job);
        }
      );

      if (result) {
        job.result = result;
        job.status = 'completed';
        this.emit('jobCompleted', job);
      } else {
        job.error = analyzer.getState().error || 'Analysis failed';
        job.status = 'failed';
        this.emit('jobFailed', job);
      }

    } catch (error) {
      job.error = errorHandler.translateError(error as Error);
      job.status = 'failed';
      this.emit('jobFailed', job);
    } finally {
      this.activeJobs--;

      // Add delay between jobs to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.processQueue();
    }
  }

  getJobs(): BatchJob[] {
    return [...this.queue];
  }

  getJobById(id: string): BatchJob | undefined {
    return this.queue.find(job => job.id === id);
  }

  removeJob(id: string): boolean {
    const index = this.queue.findIndex(job => job.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }

  getBatchStats() {
    const total = this.queue.length;
    const completed = this.queue.filter(j => j.status === 'completed').length;
    const failed = this.queue.filter(j => j.status === 'failed').length;
    const processing = this.queue.filter(j => j.status === 'processing').length;
    const pending = this.queue.filter(j => j.status === 'pending').length;

    return { total, completed, failed, processing, pending };
  }
}

// Usage with React hooks
export const useBatchProcessor = () => {
  const [processor] = useState(() => new BatchProcessor());
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [stats, setStats] = useState(processor.getBatchStats());

  useEffect(() => {
    const updateState = () => {
      setJobs(processor.getJobs());
      setStats(processor.getBatchStats());
    };

    processor.on('jobAdded', updateState);
    processor.on('jobStarted', updateState);
    processor.on('jobProgress', updateState);
    processor.on('jobCompleted', updateState);
    processor.on('jobFailed', updateState);
    processor.on('batchComplete', () => {
      updateState();
      console.log('Batch processing complete!');
    });

    return () => {
      processor.removeAllListeners();
    };
  }, [processor]);

  return {
    processor,
    jobs,
    stats,
    addFiles: (files: FileList | File[]) => processor.addFiles(files),
    removeJob: (id: string) => processor.removeJob(id)
  };
};
```

### Pattern 3: Real-time Analysis with WebWorkers

Offload image processing to web workers for better performance:

```typescript
// workers/imageProcessor.worker.ts
import { imageProcessingService, aiDetectionService } from '../services';

self.addEventListener('message', async (event) => {
  const { type, payload, id } = event.data;

  try {
    switch (type) {
      case 'PROCESS_IMAGE': {
        const { file, options } = payload;
        const result = await imageProcessingService.processImage(file, options);

        self.postMessage({
          id,
          type: 'PROCESS_COMPLETE',
          payload: result
        });
        break;
      }

      case 'ANALYZE_IMAGE': {
        const { file } = payload;
        const result = await aiDetectionService.analyzeImage(file);

        self.postMessage({
          id,
          type: 'ANALYSIS_COMPLETE',
          payload: result
        });
        break;
      }

      case 'EXTRACT_METADATA': {
        const { file } = payload;
        const result = await imageProcessingService.extractMetadata(file);

        self.postMessage({
          id,
          type: 'METADATA_COMPLETE',
          payload: result
        });
        break;
      }
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      payload: { error: error.message }
    });
  }
});

// services/workerService.ts
class WorkerService {
  private worker: Worker;
  private pendingTasks = new Map<string, { resolve: Function; reject: Function }>();

  constructor() {
    this.worker = new Worker(
      new URL('../workers/imageProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.addEventListener('message', this.handleMessage.bind(this));
  }

  private handleMessage(event: MessageEvent) {
    const { id, type, payload } = event.data;
    const task = this.pendingTasks.get(id);

    if (!task) return;

    if (type === 'ERROR') {
      task.reject(new Error(payload.error));
    } else {
      task.resolve(payload);
    }

    this.pendingTasks.delete(id);
  }

  private sendTask<T>(type: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      this.pendingTasks.set(id, { resolve, reject });

      this.worker.postMessage({ id, type, payload });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingTasks.has(id)) {
          this.pendingTasks.delete(id);
          reject(new Error('Worker task timeout'));
        }
      }, 30000);
    });
  }

  async processImage(file: File, options?: any): Promise<any> {
    return this.sendTask('PROCESS_IMAGE', { file, options });
  }

  async analyzeImage(file: File): Promise<any> {
    return this.sendTask('ANALYZE_IMAGE', { file });
  }

  async extractMetadata(file: File): Promise<any> {
    return this.sendTask('EXTRACT_METADATA', { file });
  }

  terminate(): void {
    this.worker.terminate();
  }
}

export const workerService = new WorkerService();
```

### Pattern 4: Offline-First with Service Workers

Enable offline functionality with service worker caching:

```typescript
// utils/offlineManager.ts
class OfflineManager {
  private isOnline = navigator.onLine;
  private pendingOperations: Array<{
    id: string;
    operation: () => Promise<any>;
    retry: number;
  }> = [];

  constructor() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.isOnline = true;
    console.log('Connection restored - processing pending operations');
    this.processPendingOperations();
  }

  private handleOffline(): void {
    this.isOnline = false;
    console.log('Connection lost - operations will be queued');
  }

  async executeWithOfflineSupport<T>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    if (this.isOnline) {
      try {
        return await operation();
      } catch (error) {
        if (this.isNetworkError(error)) {
          return this.queueOperation(operation, fallback);
        }
        throw error;
      }
    } else {
      return this.queueOperation(operation, fallback);
    }
  }

  private async queueOperation<T>(
    operation: () => Promise<T>,
    fallback?: () => T
  ): Promise<T> {
    const id = crypto.randomUUID();

    this.pendingOperations.push({
      id,
      operation,
      retry: 0
    });

    // Store in localStorage for persistence across sessions
    localStorage.setItem('pendingOperations', JSON.stringify(
      this.pendingOperations.map(op => ({ id: op.id, retry: op.retry }))
    ));

    if (fallback) {
      return fallback();
    }

    throw new Error('Operation queued for retry when online');
  }

  private async processPendingOperations(): Promise<void> {
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const op of operations) {
      try {
        await op.operation();
        console.log(`Successfully executed pending operation ${op.id}`);
      } catch (error) {
        op.retry++;
        if (op.retry < 3) {
          this.pendingOperations.push(op);
          console.log(`Retrying operation ${op.id} (attempt ${op.retry})`);
        } else {
          console.error(`Failed to execute operation ${op.id} after 3 attempts`);
        }
      }
    }

    // Update localStorage
    localStorage.setItem('pendingOperations', JSON.stringify(
      this.pendingOperations.map(op => ({ id: op.id, retry: op.retry }))
    ));
  }

  private isNetworkError(error: any): boolean {
    return error.message.includes('fetch') ||
           error.message.includes('network') ||
           error.message.includes('timeout');
  }

  getPendingOperationsCount(): number {
    return this.pendingOperations.length;
  }
}

export const offlineManager = new OfflineManager();

// Enhanced service integration with offline support
export class OfflineAwareAIService {
  async analyzeImage(file: File): Promise<DetectionResult | null> {
    return offlineManager.executeWithOfflineSupport(
      () => aiDetectionService.analyzeImage(file),
      () => {
        // Fallback: return cached analysis or null
        const hash = this.calculateSimpleHash(file);
        const cached = storageService.getCachedAnalysis(hash);
        return cached.data;
      }
    );
  }

  private calculateSimpleHash(file: File): string {
    // Simple hash for fallback (not cryptographic)
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
}
```

## 🔧 Advanced Configuration

### Custom Error Handlers

```typescript
// Create custom error handling strategies
class CustomErrorHandler extends ErrorHandler {
  constructor() {
    super();
    this.setupCustomHandlers();
  }

  private setupCustomHandlers(): void {
    // Handle API quota exceeded
    this.addHandler('QUOTA_EXCEEDED', (error) => {
      return {
        userMessage: 'API quota exceeded. Please try again later or upgrade your plan.',
        retryable: false,
        action: 'SHOW_UPGRADE_DIALOG'
      };
    });

    // Handle network timeouts
    this.addHandler('TIMEOUT', (error) => {
      return {
        userMessage: 'The request timed out. Please check your connection.',
        retryable: true,
        retryDelay: 5000
      };
    });

    // Handle file format issues
    this.addHandler('UNSUPPORTED_FORMAT', (error) => {
      return {
        userMessage: 'This file format is not supported. Please use JPEG, PNG, or WebP.',
        retryable: false,
        action: 'SHOW_FORMAT_HELP'
      };
    });
  }

  protected addHandler(errorType: string, handler: (error: Error) => any): void {
    // Implementation for adding custom error handlers
  }
}

export const customErrorHandler = new CustomErrorHandler();
```

### Performance Monitoring Integration

```typescript
// Advanced performance monitoring
class ServicePerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTiming(operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  private recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const durations = this.metrics.get(operation)!;
    durations.push(duration);

    // Keep only last 100 measurements
    if (durations.length > 100) {
      durations.shift();
    }

    // Log slow operations
    if (duration > 5000) {
      console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }

  getMetrics(operation: string) {
    const durations = this.metrics.get(operation) || [];
    if (durations.length === 0) return null;

    const avg = durations.reduce((a, b) => a + b) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return { avg, min, max, count: durations.length };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [operation, durations] of this.metrics) {
      result[operation] = this.getMetrics(operation);
    }
    return result;
  }
}

export const performanceMonitor = new ServicePerformanceMonitor();

// Usage with services
export class MonitoredAIService {
  async analyzeImage(file: File): Promise<APIResponse<DetectionResult>> {
    const endTiming = performanceMonitor.startTiming('ai-analysis');

    try {
      const result = await aiDetectionService.analyzeImage(file);
      return result;
    } finally {
      endTiming();
    }
  }
}
```

## 🧪 Testing Integration

### Service Testing Utilities

```typescript
// test/utils/serviceTestUtils.ts
export class ServiceTestUtils {
  static createMockFile(name = 'test.jpg', size = 1024 * 1024): File {
    const content = new Uint8Array(size);
    return new File([content], name, { type: 'image/jpeg' });
  }

  static createMockDetectionResult(overrides?: Partial<DetectionResult>): DetectionResult {
    return {
      isAiGenerated: false,
      confidence: 0.85,
      analysis: {
        breakdown: {
          details: ['High quality natural textures', 'Consistent lighting'],
          confidence_scores: { authentic: 0.85, ai_generated: 0.15 }
        }
      },
      metadata: {
        imageId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        processingTime: 2500
      },
      ...overrides
    };
  }

  static async waitForAsyncOperations(ms = 0): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static mockAPIResponse<T>(data: T, success = true, error?: string): APIResponse<T> {
    return {
      success,
      data: success ? data : undefined,
      error: success ? undefined : error
    };
  }
}

// Example test using the utilities
describe('ImageAnalyzer Integration', () => {
  let analyzer: ImageAnalyzer;
  let mockFile: File;

  beforeEach(() => {
    analyzer = new ImageAnalyzer();
    mockFile = ServiceTestUtils.createMockFile();
  });

  it('should analyze image successfully', async () => {
    // Mock service responses
    jest.spyOn(imageProcessingService, 'processImage').mockResolvedValue(
      ServiceTestUtils.mockAPIResponse({
        processedFile: mockFile,
        hash: 'mock-hash',
        metadata: {}
      })
    );

    jest.spyOn(storageService, 'getCachedAnalysis').mockResolvedValue(
      ServiceTestUtils.mockAPIResponse(null)
    );

    jest.spyOn(aiDetectionService, 'analyzeImage').mockResolvedValue(
      ServiceTestUtils.mockAPIResponse(
        ServiceTestUtils.createMockDetectionResult()
      )
    );

    const result = await analyzer.analyzeImage(mockFile);

    expect(result).toBeTruthy();
    expect(result?.isAiGenerated).toBe(false);
    expect(result?.confidence).toBe(0.85);
  });

  it('should handle analysis failure gracefully', async () => {
    jest.spyOn(aiDetectionService, 'analyzeImage').mockResolvedValue(
      ServiceTestUtils.mockAPIResponse(null, false, 'API_KEY_MISSING')
    );

    const result = await analyzer.analyzeImage(mockFile);

    expect(result).toBe(null);
    expect(analyzer.getState().error).toBeTruthy();
  });
});
```

## 📱 Mobile Optimization

### Touch-Friendly File Handling

```typescript
// Mobile-optimized file handling
export class MobileFileHandler {
  static async handleFileSelection(
    accept = 'image/*',
    multiple = false
  ): Promise<File[]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;

      // Handle mobile camera access
      if (this.isMobile()) {
        input.capture = 'environment'; // Use back camera
      }

      input.addEventListener('change', (event) => {
        const files = Array.from((event.target as HTMLInputElement).files || []);
        if (files.length > 0) {
          resolve(files);
        } else {
          reject(new Error('No files selected'));
        }
      });

      input.addEventListener('cancel', () => {
        reject(new Error('File selection cancelled'));
      });

      input.click();
    });
  }

  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  static async compressForMobile(file: File): Promise<File> {
    if (!this.isMobile() || file.size <= 2 * 1024 * 1024) {
      return file; // No compression needed
    }

    const options = {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8
    };

    const result = await imageProcessingService.processImage(file, options);

    if (result.success) {
      return result.data.processedFile;
    }

    return file; // Fallback to original if compression fails
  }
}
```

## 🎨 UI Integration Examples

### React Hook Integration

```typescript
// Custom hook for service integration
export const useImageAnalysis = () => {
  const [state, setState] = useState({
    loading: false,
    result: null as DetectionResult | null,
    error: null as string | null,
    progress: 0
  });

  const analyzeImage = useCallback(async (file: File) => {
    setState(prev => ({ ...prev, loading: true, error: null, progress: 0 }));

    try {
      const analyzer = new ImageAnalyzer();
      const result = await analyzer.analyzeImage(
        file,
        (progress) => setState(prev => ({ ...prev, progress }))
      );

      if (result) {
        setState(prev => ({ ...prev, result, loading: false }));
      } else {
        setState(prev => ({
          ...prev,
          error: analyzer.getState().error || 'Analysis failed',
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: errorHandler.translateError(error as Error),
        loading: false
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      result: null,
      error: null,
      progress: 0
    });
  }, []);

  return {
    ...state,
    analyzeImage,
    reset
  };
};

// Usage in component
export const AnalysisComponent: React.FC = () => {
  const { loading, result, error, progress, analyzeImage, reset } = useImageAnalysis();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await analyzeImage(file);
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileSelect} />

      {loading && (
        <div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>Analyzing... {progress}%</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
          <button onClick={reset}>Try Again</button>
        </div>
      )}

      {result && (
        <div className="results">
          <h3>Analysis Complete</h3>
          <div className={result.isAiGenerated ? 'ai-detected' : 'authentic'}>
            Status: {result.isAiGenerated ? 'AI Generated' : 'Likely Authentic'}
          </div>
          <div>Confidence: {(result.confidence * 100).toFixed(1)}%</div>
          {result.analysis.breakdown.details.map((detail, index) => (
            <div key={index} className="analysis-detail">
              {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 📊 Analytics Integration

### Service Usage Tracking

```typescript
// Analytics integration for service usage
class ServiceAnalytics {
  private analytics: any;

  constructor() {
    // Initialize with your analytics service (Google Analytics, Mixpanel, etc.)
    this.analytics = (window as any).gtag || console.log;
  }

  trackServiceCall(serviceName: string, methodName: string, duration: number, success: boolean): void {
    this.analytics('event', 'service_call', {
      service_name: serviceName,
      method_name: methodName,
      duration_ms: Math.round(duration),
      success: success,
      timestamp: Date.now()
    });
  }

  trackAnalysisResult(result: DetectionResult): void {
    this.analytics('event', 'analysis_complete', {
      ai_generated: result.isAiGenerated,
      confidence: Math.round(result.confidence * 100),
      analysis_details_count: result.analysis.breakdown.details.length
    });
  }

  trackError(serviceName: string, errorType: string, errorMessage: string): void {
    this.analytics('event', 'service_error', {
      service_name: serviceName,
      error_type: errorType,
      error_message: errorMessage.substring(0, 100) // Truncate for privacy
    });
  }

  trackUserAction(action: string, metadata?: Record<string, any>): void {
    this.analytics('event', 'user_action', {
      action: action,
      ...metadata
    });
  }
}

export const serviceAnalytics = new ServiceAnalytics();

// Enhanced services with analytics
export class AnalyticsAwareAIService {
  async analyzeImage(file: File): Promise<APIResponse<DetectionResult>> {
    const startTime = performance.now();

    try {
      serviceAnalytics.trackUserAction('analysis_started', {
        file_size: file.size,
        file_type: file.type
      });

      const result = await aiDetectionService.analyzeImage(file);
      const duration = performance.now() - startTime;

      serviceAnalytics.trackServiceCall('AIDetectionService', 'analyzeImage', duration, result.success);

      if (result.success && result.data) {
        serviceAnalytics.trackAnalysisResult(result.data);
      } else if (!result.success) {
        serviceAnalytics.trackError('AIDetectionService', result.error || 'unknown', result.error || '');
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      serviceAnalytics.trackServiceCall('AIDetectionService', 'analyzeImage', duration, false);
      serviceAnalytics.trackError('AIDetectionService', 'exception', (error as Error).message);
      throw error;
    }
  }
}
```

---

**Last Updated**: September 30, 2025
**Version**: 1.0.0
**Maintainer**: Victor Williams (@Vaporjawn)