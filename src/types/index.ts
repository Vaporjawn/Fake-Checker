export interface UploadedImage {
  id: string;
  file: File;
  url: string;
  preview: string; // Base64 or blob URL for display
  uploadedAt: Date;
  status: 'uploading' | 'analyzing' | 'completed' | 'error';
  name: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  analysis?: DetectionResult;
  progress?: number; // 0-100 for progress tracking
  queuePosition?: number; // Position in analysis queue
  processingTime?: number; // Time taken for analysis in ms
}

export interface DetectionResult {
  imageId: string;
  confidence: number;
  isAiGenerated: boolean;
  analysis: {
    model: string;
    timestamp: Date;
    breakdown: AnalysisBreakdown;
    metadata?: ImageMetadata;
    generator?: AIGenerator;
  };
}

export interface AIGenerator {
  name: string;
  confidence: number;
  version?: string;
  characteristics?: string[];
}

export interface ImageMetadata {
  c2pa?: {
    claimGenerator?: string;
    digitalSourceType?: string;
    actionsAction?: string;
    softwareAgent?: string;
  };
  exif?: {
    make?: string;
    model?: string;
    software?: string;
    dateTime?: string;
  };
  xmp?: {
    digitalSourceFileType?: string;
    credit?: string;
    digitalSourceType?: string;
  };
}

export interface AnalysisBreakdown {
  humanLikelihood: number;
  aiArtifacts: number;
  processingQuality: number;
  technicalScore: number;
  artifactScore: number;
  consistencyScore: number;
  details: string[];
  artifacts?: ArtifactAnalysis[];
  processingMetrics?: ProcessingMetrics;
}

export interface ArtifactAnalysis {
  type: 'blur_inconsistency' | 'lighting_anomaly' | 'compression_artifact' | 'upscaling_artifact' | 'generation_pattern';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  description: string;
  location?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ProcessingMetrics {
  resolutionScore: number;
  compressionScore: number;
  noiseLevel: number;
  sharpness: number;
  colorConsistency: number;
}

export interface AppState {
  images: UploadedImage[];
  detectionResults: DetectionResult[];
  loading: boolean;
  error: string | null;
  selectedImage: string | null;
}

export interface APIResponse<T = DetectionResult> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  retryable?: boolean;
  rateLimitReset?: number;
}

// Analysis Queue Types
export interface AnalysisTask {
  id: string;
  image: UploadedImage;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retries: number;
  maxRetries: number;
}

export interface QueueStatus {
  total: number;
  processing: number;
  completed: number;
  failed: number;
  pending: number;
  estimatedTimeRemaining?: number;
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  detectionResult: 'all' | 'ai-generated' | 'human-created' | 'uncertain';
  confidenceRange: { min: number; max: number };
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  sizeRange: {
    minSize: number | null;
    maxSize: number | null;
  };
  dimensions: {
    minWidth: number | null;
    maxWidth: number | null;
    minHeight: number | null;
    maxHeight: number | null;
  };
  status: 'all' | 'uploading' | 'analyzing' | 'completed' | 'error';
  tags: string[];
  fileType: 'all' | 'jpeg' | 'png' | 'webp' | 'gif';
}

export interface SortOptions {
  field: 'name' | 'uploadedAt' | 'size' | 'confidence' | 'detectionResult';
  direction: 'asc' | 'desc';
}

export interface SearchResult {
  images: UploadedImage[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// History and Storage Types
export interface AnalysisHistory {
  id: string;
  sessionId: string;
  images: UploadedImage[];
  createdAt: Date;
  completedAt?: Date;
  settings?: {
    model: string;
    apiVersion: string;
  };
  summary: {
    totalImages: number;
    aiDetected: number;
    humanDetected: number;
    averageConfidence: number;
  };
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeImages: boolean;
  includeMetadata: boolean;
  includeBreakdown: boolean;
  dateRange?: [Date, Date];
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  recoverable: boolean;
  userMessage: string;
}

// Progress Tracking Types
export interface ProgressEvent {
  taskId: string;
  progress: number; // 0-100
  stage: 'upload' | 'preprocessing' | 'analysis' | 'postprocessing' | 'complete';
  message?: string;
  estimatedTimeRemaining?: number;
}