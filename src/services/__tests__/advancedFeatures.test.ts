/**
 * Comprehensive tests for Advanced Features services
 * Tests image comparison, batch processing, and analysis report generation
 */

import {
  ImageComparisonService,
  BatchProcessingService,
  AnalysisReportGenerator,
  imageComparisonService,
  batchProcessingService,
  reportGenerator
} from '../advancedFeatures';
import type { UploadedImage, DetectionResult } from '../../types';

// Mock Canvas API for testing
class MockCanvas {
  width: number = 0;
  height: number = 0;
  private context: MockCanvasRenderingContext2D | null = null;

  getContext(type: string): MockCanvasRenderingContext2D | null {
    if (type === '2d') {
      if (!this.context) {
        this.context = new MockCanvasRenderingContext2D(this);
      }
      return this.context;
    }
    return null;
  }
}

class MockCanvasRenderingContext2D {
  canvas: MockCanvas;

  constructor(canvas: MockCanvas) {
    this.canvas = canvas;
  }

  drawImage(): void {
    // Mock implementation
  }

  getImageData(_x: number, _y: number, width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    // Fill with test pattern
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;     // R
      data[i + 1] = 128; // G
      data[i + 2] = 128; // B
      data[i + 3] = 255; // A
    }
    return new ImageData(data, width, height);
  }
}

// Mock HTMLImageElement
class MockImage {
  private _src: string = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width: number = 256;
  height: number = 256;

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    // Simulate async loading
    setTimeout(() => {
      // Check if it's a valid image blob URL or if it's from a non-image file
      if (value.includes('text/plain') || value.includes('test.txt')) {
        if (this.onerror) {
          this.onerror();
        }
      } else {
        if (this.onload) {
          this.onload();
        }
      }
    }, 10);
  }
}

// Set up global mocks
(globalThis as any).HTMLCanvasElement = MockCanvas;
(globalThis as any).CanvasRenderingContext2D = MockCanvasRenderingContext2D;
(globalThis as any).Image = MockImage;

// Mock document.createElement for canvas
const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName: string) => {
  if (tagName === 'canvas') {
    return new MockCanvas() as any;
  }
  return originalCreateElement.call(document, tagName);
});

// Mock URL.createObjectURL
(globalThis as any).URL = {
  createObjectURL: jest.fn((file: File) => {
    // Include file type information in the mock URL
    return `blob:mock-url-${file.type}-${file.name}`;
  }),
  revokeObjectURL: jest.fn()
};

// Mock Blob with text() method
class MockBlob {
  type: string;
  size: number = 0;
  private content: string;

  constructor(content: string[], options?: { type?: string }) {
    this.content = content.join('');
    this.type = options?.type || '';
    this.size = this.content.length;
  }

  async text(): Promise<string> {
    return this.content;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    return encoder.encode(this.content).buffer;
  }
}

(globalThis as any).Blob = MockBlob;

// Mock ImageData
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(data: Uint8ClampedArray, width: number, height?: number) {
    this.data = data;
    this.width = width;
    this.height = height || data.length / (width * 4);
  }
}

(globalThis as any).ImageData = MockImageData;

describe('ImageComparisonService', () => {
  let service: ImageComparisonService;
  let mockFile1: File;
  let mockFile2: File;

  beforeEach(() => {
    service = new ImageComparisonService();

    // Create mock image files
    const imageData = new Uint8Array([137, 80, 78, 71]); // PNG header
    mockFile1 = new File([imageData], 'test1.png', { type: 'image/png' });
    mockFile2 = new File([imageData], 'test2.png', { type: 'image/png' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('compareImages', () => {
    it('should successfully compare two image files', async () => {
      const result = await service.compareImages(mockFile1, mockFile2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
      expect(result.differences).toBeDefined();
      expect(result.differences.structural).toBeGreaterThanOrEqual(0);
      expect(result.differences.color).toBeGreaterThanOrEqual(0);
      expect(result.differences.texture).toBeGreaterThanOrEqual(0);
      expect(result.analysis).toBeDefined();
      expect(result.recommendation).toMatch(/identical|similar|different|very_different/);
    });

    it('should compare HTMLImageElement objects', async () => {
      const img1 = new MockImage() as any;
      const img2 = new MockImage() as any;

      const result = await service.compareImages(img1, img2);

      expect(result).toBeDefined();
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    });

    it('should handle identical images with high similarity', async () => {
      const result = await service.compareImages(mockFile1, mockFile1);

      expect(result.similarity).toBeGreaterThan(0.9);
      expect(result.recommendation).toBe('identical');
    });

    it('should provide detailed analysis metrics', async () => {
      const result = await service.compareImages(mockFile1, mockFile2);

      expect(result.analysis.pixelDifference).toBeDefined();
      expect(result.analysis.histogramDifference).toBeDefined();
      expect(result.analysis.edgeDetectionDifference).toBeDefined();

      expect(typeof result.analysis.pixelDifference).toBe('number');
      expect(typeof result.analysis.histogramDifference).toBe('number');
      expect(typeof result.analysis.edgeDetectionDifference).toBe('number');
    });

    it('should handle errors gracefully', async () => {
      const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });

      await expect(service.compareImages(invalidFile, mockFile2))
        .rejects.toThrow();
    });
  });

  describe('similarity calculations', () => {
    it('should calculate recommendations correctly', async () => {
      const result = await service.compareImages(mockFile1, mockFile2);

      if (result.similarity > 0.95) {
        expect(result.recommendation).toBe('identical');
      } else if (result.similarity > 0.8) {
        expect(result.recommendation).toBe('similar');
      } else if (result.similarity > 0.5) {
        expect(result.recommendation).toBe('different');
      } else {
        expect(result.recommendation).toBe('very_different');
      }
    });

    it('should have consistent difference calculations', async () => {
      const result = await service.compareImages(mockFile1, mockFile2);

      // Differences should be between 0 and 1
      expect(result.differences.structural).toBeGreaterThanOrEqual(0);
      expect(result.differences.structural).toBeLessThanOrEqual(1);
      expect(result.differences.color).toBeGreaterThanOrEqual(0);
      expect(result.differences.color).toBeLessThanOrEqual(1);
      expect(result.differences.texture).toBeGreaterThanOrEqual(0);
      expect(result.differences.texture).toBeLessThanOrEqual(1);
    });
  });
});

describe('BatchProcessingService', () => {
  let service: BatchProcessingService;
  let mockFiles: File[];

  beforeEach(() => {
    service = new BatchProcessingService();

    // Create multiple mock files
    const imageData = new Uint8Array([137, 80, 78, 71]);
    mockFiles = [
      new File([imageData], 'test1.png', { type: 'image/png' }),
      new File([imageData], 'test2.jpg', { type: 'image/jpeg' }),
      new File([imageData], 'test3.webp', { type: 'image/webp' })
    ];

    // Speed up processing for tests
    (service as any).maxConcurrency = 1;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addToBatch', () => {
    it('should add files to processing queue', async () => {
      const status = await service.addToBatch(mockFiles);

      expect(status.total).toBe(3);
      expect(status.results).toHaveLength(3);

      status.results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.filename).toBeDefined();
        // Status could be 'pending' or 'processing' due to immediate queue processing
        expect(['pending', 'processing']).toContain(result.status);
      });
    });

    it('should start processing automatically', async () => {
      await service.addToBatch(mockFiles);

      // Wait a bit for processing to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const status = service.getStatus();
      expect(status.inProgress).toBeGreaterThan(0);
    });

    it('should handle empty file array', async () => {
      const status = await service.addToBatch([]);

      expect(status.total).toBe(0);
      expect(status.results).toHaveLength(0);
    });
  });

  describe('getStatus', () => {
    it('should return current processing status', async () => {
      await service.addToBatch(mockFiles);

      const status = service.getStatus();

      expect(status.total).toBeDefined();
      expect(status.completed).toBeDefined();
      expect(status.failed).toBeDefined();
      expect(status.inProgress).toBeDefined();
      expect(status.results).toBeDefined();

      expect(typeof status.total).toBe('number');
      expect(typeof status.completed).toBe('number');
      expect(typeof status.failed).toBe('number');
      expect(typeof status.inProgress).toBe('number');
      expect(Array.isArray(status.results)).toBe(true);
    });

    it('should track status changes over time', async () => {
      await service.addToBatch(mockFiles);

      const initialStatus = service.getStatus();
      expect(initialStatus.completed).toBe(0);

      // Wait for some processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const laterStatus = service.getStatus();
      expect(laterStatus.inProgress + laterStatus.completed + laterStatus.failed)
        .toBeLessThanOrEqual(initialStatus.total);
    });
  });

  describe('queue management', () => {
    it('should clear completed items', async () => {
      await service.addToBatch(mockFiles);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 5000));

      const beforeClear = service.getStatus();
      service.clearCompleted();
      const afterClear = service.getStatus();

      expect(afterClear.total).toBeLessThanOrEqual(beforeClear.total);
    });

    it('should cancel all pending items', async () => {
      await service.addToBatch(mockFiles);

      service.cancelAll();

      const status = service.getStatus();
      const pendingItems = status.results.filter(item => item.status === 'pending');
      expect(pendingItems).toHaveLength(0);
    });
  });

  describe('concurrency limits', () => {
    it('should respect maxConcurrency setting', async () => {
      const largeFileArray = Array(10).fill(mockFiles[0]);
      await service.addToBatch(largeFileArray);

      await new Promise(resolve => setTimeout(resolve, 50));

      const status = service.getStatus();
      expect(status.inProgress).toBeLessThanOrEqual((service as any).maxConcurrency);
    });
  });
});

describe('AnalysisReportGenerator', () => {
  let generator: AnalysisReportGenerator;
  let mockImages: UploadedImage[];

  beforeEach(() => {
    generator = new AnalysisReportGenerator();

    // Create mock uploaded images with analysis results
    const mockAnalysis: DetectionResult = {
      imageId: 'test-id',
      confidence: 0.85,
      isAiGenerated: true,
      analysis: {
        model: 'Test Model v1.0',
        timestamp: new Date(),
        breakdown: {
          humanLikelihood: 0.15,
          aiArtifacts: 0.85,
          processingQuality: 0.9,
          technicalScore: 85,
          artifactScore: 90,
          consistencyScore: 80,
          details: ['Test detail 1', 'Generator: TestGAN v2.0 (confidence: 85%)']
        }
      }
    };

    mockImages = [
      {
        id: 'img1',
        file: new File(['test'], 'test1.jpg', { type: 'image/jpeg' }),
        url: 'blob:test-url-1',
        preview: 'data:image/jpeg;base64,test-data-1',
        uploadedAt: new Date(),
        status: 'completed',
        name: 'test1.jpg',
        size: 1048576, // Exactly 1MB
        analysis: { ...mockAnalysis, imageId: 'img1', isAiGenerated: true }
      },
      {
        id: 'img2',
        file: new File(['test'], 'test2.png', { type: 'image/png' }),
        url: 'blob:test-url-2',
        preview: 'data:image/png;base64,test-data-2',
        uploadedAt: new Date(),
        status: 'completed',
        name: 'test2.png',
        size: 2097152, // Exactly 2MB
        analysis: {
          ...mockAnalysis,
          imageId: 'img2',
          isAiGenerated: false,
          confidence: 0.65,
          analysis: {
            ...mockAnalysis.analysis,
            breakdown: {
              ...mockAnalysis.analysis.breakdown,
              details: ['Test detail 2', 'Human-created content detected']
            }
          }
        }
      }
    ];
  });

  describe('generateReport', () => {
    it('should generate comprehensive analysis report', () => {
      const report = generator.generateReport(mockImages);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.breakdown).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.images).toBeDefined();
    });

    it('should calculate summary statistics correctly', () => {
      const report = generator.generateReport(mockImages);

      expect(report.summary.totalImages).toBe(2);
      expect(report.summary.aiGeneratedCount).toBe(1);
      expect(report.summary.authenticCount).toBe(1);
      expect(report.summary.averageConfidence).toBe(0.75); // (0.85 + 0.65) / 2
    });

    it('should generate breakdown statistics', () => {
      const report = generator.generateReport(mockImages);

      expect(report.breakdown.fileTypes).toBeDefined();
      expect(report.breakdown.fileTypes['image/jpeg']).toBe(1);
      expect(report.breakdown.fileTypes['image/png']).toBe(1);

      expect(report.breakdown.confidenceLevels).toBeDefined();
      expect(report.breakdown.fileSizes).toBeDefined();
    });

    it('should extract generator information', () => {
      const report = generator.generateReport(mockImages);

      expect(report.breakdown.generators).toBeDefined();
      expect(report.breakdown.generators['TestGAN v2.0']).toBe(1);
    });

    it('should categorize file sizes correctly', () => {
      const report = generator.generateReport(mockImages);

      expect(report.breakdown.fileSizes['Small (<1MB)']).toBe(0);
      expect(report.breakdown.fileSizes['Medium (1-5MB)']).toBe(2);
      expect(report.breakdown.fileSizes['Large (5-10MB)']).toBe(0);
      expect(report.breakdown.fileSizes['Very Large (>10MB)']).toBe(0);
    });

    it('should generate appropriate recommendations', () => {
      // Test with high AI proportion
      const aiImages = mockImages.map(img => ({
        ...img,
        analysis: { ...img.analysis!, isAiGenerated: true }
      }));

      const report = generator.generateReport(aiImages);

      expect(report.recommendations).toContain(
        'High proportion of AI-generated content detected. Consider source verification.'
      );
    });

    it('should handle empty image array', () => {
      const report = generator.generateReport([]);

      expect(report.summary.totalImages).toBe(0);
      expect(report.summary.aiGeneratedCount).toBe(0);
      expect(report.summary.authenticCount).toBe(0);
      expect(report.summary.averageConfidence).toBe(0);
      expect(report.images).toHaveLength(0);
    });
  });

  describe('exportReport', () => {
    let report: any;

    beforeEach(() => {
      report = generator.generateReport(mockImages);
    });

    it('should export report as JSON', async () => {
      const blob = await generator.exportReport(report, 'json');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');

      const text = await blob.text();
      const parsed = JSON.parse(text);
      expect(parsed.summary).toBeDefined();
    });

    it('should export report as CSV', async () => {
      const blob = await generator.exportReport(report, 'csv');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/csv');

      const text = await blob.text();
      expect(text).toContain('Filename,AI Generated,Confidence,Model,Timestamp');
      expect(text).toContain('test1.jpg');
      expect(text).toContain('test2.png');
    });

    it('should export report as HTML', async () => {
      const blob = await generator.exportReport(report, 'html');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/html');

      const text = await blob.text();
      expect(text).toContain('<!DOCTYPE html>');
      expect(text).toContain('Fake Checker Analysis Report');
      expect(text).toContain('test1.jpg');
      expect(text).toContain('test2.png');
    });

    it('should export report as PDF (text format)', async () => {
      const blob = await generator.exportReport(report, 'pdf');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain');

      const text = await blob.text();
      expect(text).toContain('Fake Checker Analysis Report');
      expect(text).toContain('SUMMARY');
      expect(text).toContain('DETAILED RESULTS');
    });

    it('should throw error for unsupported format', async () => {
      await expect(generator.exportReport(report, 'xml' as any))
        .rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('confidence level categorization', () => {
    it('should categorize confidence levels correctly', () => {
      const testImages = [
        { ...mockImages[0], analysis: { ...mockImages[0].analysis!, confidence: 0.95 } },
        { ...mockImages[1], analysis: { ...mockImages[1].analysis!, confidence: 0.75 } },
        { ...mockImages[0], analysis: { ...mockImages[0].analysis!, confidence: 0.55 } },
        { ...mockImages[1], analysis: { ...mockImages[1].analysis!, confidence: 0.35 } },
        { ...mockImages[0], analysis: { ...mockImages[0].analysis!, confidence: 0.15 } }
      ];

      const report = generator.generateReport(testImages);

      expect(report.breakdown.confidenceLevels['Very High (90-100%)']).toBe(1);
      expect(report.breakdown.confidenceLevels['High (70-90%)']).toBe(1);
      expect(report.breakdown.confidenceLevels['Medium (50-70%)']).toBe(1);
      expect(report.breakdown.confidenceLevels['Low (30-50%)']).toBe(1);
      expect(report.breakdown.confidenceLevels['Very Low (0-30%)']).toBe(1);
    });
  });
});

describe('Service Instances', () => {
  it('should provide singleton instances', () => {
    expect(imageComparisonService).toBeInstanceOf(ImageComparisonService);
    expect(batchProcessingService).toBeInstanceOf(BatchProcessingService);
    expect(reportGenerator).toBeInstanceOf(AnalysisReportGenerator);
  });

  it('should maintain instance integrity', () => {
    const service1 = imageComparisonService;
    const service2 = imageComparisonService;

    expect(service1).toBe(service2);
  });
});