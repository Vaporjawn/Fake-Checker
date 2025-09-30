/**
 * Advanced image comparison and analysis utilities
 * Provides functionality for comparing images, batch processing, and generating detailed reports
 */

import type { DetectionResult, UploadedImage } from '../types';

/**
 * Image comparison result interface
 */
export interface ImageComparisonResult {
  similarity: number; // 0-1 scale
  differences: {
    structural: number;
    color: number;
    texture: number;
  };
  analysis: {
    pixelDifference: number;
    histogramDifference: number;
    edgeDetectionDifference: number;
  };
  recommendation: 'identical' | 'similar' | 'different' | 'very_different';
}

/**
 * Batch processing status
 */
export interface BatchProcessingStatus {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  results: BatchProcessingResult[];
}

/**
 * Individual batch result
 */
export interface BatchProcessingResult {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: DetectionResult;
  error?: string;
  processingTime?: number;
}

/**
 * Detailed analysis report data
 */
export interface DetailedAnalysisReport {
  summary: {
    totalImages: number;
    aiGeneratedCount: number;
    authenticCount: number;
    averageConfidence: number;
    processingTime: number;
  };
  breakdown: {
    generators: { [key: string]: number };
    confidenceLevels: { [key: string]: number };
    fileTypes: { [key: string]: number };
    fileSizes: { [key: string]: number };
  };
  recommendations: string[];
  metadata: {
    generatedAt: Date;
    analysisModel: string;
    version: string;
  };
  images: Array<{
    filename: string;
    result: DetectionResult;
    thumbnail?: string;
  }>;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'csv' | 'pdf' | 'html';

/**
 * Image comparison service for detecting similar or duplicate images
 */
export class ImageComparisonService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = context;
  }

  /**
   * Compare two images for similarity
   */
  async compareImages(image1: File | HTMLImageElement, image2: File | HTMLImageElement): Promise<ImageComparisonResult> {
    const img1 = await this.loadImage(image1);
    const img2 = await this.loadImage(image2);

    // Normalize image sizes for comparison
    const size = 256; // Standard comparison size
    const data1 = this.getImageData(img1, size);
    const data2 = this.getImageData(img2, size);

    // Calculate various similarity metrics
    const pixelDifference = this.calculatePixelDifference(data1, data2);
    const histogramDifference = this.calculateHistogramDifference(data1, data2);
    const edgeDetectionDifference = this.calculateEdgeDetectionDifference(data1, data2);

    // Structural similarity (simplified SSIM)
    const structural = 1 - (pixelDifference / 255);

    // Color similarity
    const color = 1 - (histogramDifference / 100);

    // Texture similarity
    const texture = 1 - (edgeDetectionDifference / 100);

    // Overall similarity (weighted average)
    const similarity = (structural * 0.4 + color * 0.3 + texture * 0.3);

    // Generate recommendation
    let recommendation: ImageComparisonResult['recommendation'];
    if (similarity > 0.95) recommendation = 'identical';
    else if (similarity > 0.8) recommendation = 'similar';
    else if (similarity > 0.5) recommendation = 'different';
    else recommendation = 'very_different';

    return {
      similarity,
      differences: {
        structural: 1 - structural,
        color: 1 - color,
        texture: 1 - texture
      },
      analysis: {
        pixelDifference,
        histogramDifference,
        edgeDetectionDifference
      },
      recommendation
    };
  }

  /**
   * Load image from File or HTMLImageElement
   */
  private async loadImage(source: File | HTMLImageElement): Promise<HTMLImageElement> {
    if (source instanceof HTMLImageElement) {
      return source;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(source);
    });
  }

  /**
   * Get normalized image data
   */
  private getImageData(img: HTMLImageElement, size: number): ImageData {
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx.drawImage(img, 0, 0, size, size);
    return this.ctx.getImageData(0, 0, size, size);
  }

  /**
   * Calculate pixel-by-pixel difference
   */
  private calculatePixelDifference(data1: ImageData, data2: ImageData): number {
    let totalDifference = 0;
    const pixels = data1.data.length / 4;

    for (let i = 0; i < data1.data.length; i += 4) {
      const r1 = data1.data[i];
      const g1 = data1.data[i + 1];
      const b1 = data1.data[i + 2];

      const r2 = data2.data[i];
      const g2 = data2.data[i + 1];
      const b2 = data2.data[i + 2];

      const diff = Math.sqrt(
        Math.pow(r1 - r2, 2) +
        Math.pow(g1 - g2, 2) +
        Math.pow(b1 - b2, 2)
      );

      totalDifference += diff;
    }

    return totalDifference / pixels;
  }

  /**
   * Calculate histogram difference
   */
  private calculateHistogramDifference(data1: ImageData, data2: ImageData): number {
    const hist1 = this.calculateHistogram(data1);
    const hist2 = this.calculateHistogram(data2);

    let difference = 0;
    for (let i = 0; i < 256; i++) {
      difference += Math.abs(hist1[i] - hist2[i]);
    }

    return difference / (data1.data.length / 4);
  }

  /**
   * Calculate color histogram
   */
  private calculateHistogram(data: ImageData): number[] {
    const histogram = new Array(256).fill(0);

    for (let i = 0; i < data.data.length; i += 4) {
      const gray = Math.round(
        0.299 * data.data[i] +
        0.587 * data.data[i + 1] +
        0.114 * data.data[i + 2]
      );
      histogram[gray]++;
    }

    return histogram;
  }

  /**
   * Calculate edge detection difference
   */
  private calculateEdgeDetectionDifference(data1: ImageData, data2: ImageData): number {
    const edges1 = this.detectEdges(data1);
    const edges2 = this.detectEdges(data2);

    let difference = 0;
    for (let i = 0; i < edges1.length; i++) {
      difference += Math.abs(edges1[i] - edges2[i]);
    }

    return difference / edges1.length;
  }

  /**
   * Simple edge detection using Sobel operator
   */
  private detectEdges(data: ImageData): number[] {
    const width = data.width;
    const height = data.height;
    const edges: number[] = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {

        // Get surrounding pixels
        const tl = this.getGrayValue(data, x - 1, y - 1);
        const tm = this.getGrayValue(data, x, y - 1);
        const tr = this.getGrayValue(data, x + 1, y - 1);
        const ml = this.getGrayValue(data, x - 1, y);
        const mr = this.getGrayValue(data, x + 1, y);
        const bl = this.getGrayValue(data, x - 1, y + 1);
        const bm = this.getGrayValue(data, x, y + 1);
        const br = this.getGrayValue(data, x + 1, y + 1);

        // Sobel operator
        const gx = (-1 * tl) + (1 * tr) + (-2 * ml) + (2 * mr) + (-1 * bl) + (1 * br);
        const gy = (-1 * tl) + (-2 * tm) + (-1 * tr) + (1 * bl) + (2 * bm) + (1 * br);

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges.push(magnitude);
      }
    }

    return edges;
  }

  /**
   * Get grayscale value at coordinates
   */
  private getGrayValue(data: ImageData, x: number, y: number): number {
    const idx = (y * data.width + x) * 4;
    return 0.299 * data.data[idx] + 0.587 * data.data[idx + 1] + 0.114 * data.data[idx + 2];
  }
}

/**
 * Batch processing service for handling multiple images
 */
export class BatchProcessingService {
  private processingQueue: BatchProcessingResult[] = [];
  private maxConcurrency = 3;
  private currentProcessing = 0;

  /**
   * Add images to batch processing queue
   */
  async addToBatch(files: File[]): Promise<BatchProcessingStatus> {
    const batchItems: BatchProcessingResult[] = files.map(file => ({
      id: this.generateId(),
      filename: file.name,
      status: 'pending'
    }));

    this.processingQueue.push(...batchItems);

    // Start processing
    this.processQueue();

    return this.getStatus();
  }

  /**
   * Get current processing status
   */
  getStatus(): BatchProcessingStatus {
    const total = this.processingQueue.length;
    const completed = this.processingQueue.filter(item => item.status === 'completed').length;
    const failed = this.processingQueue.filter(item => item.status === 'failed').length;
    const inProgress = this.processingQueue.filter(item => item.status === 'processing').length;

    return {
      total,
      completed,
      failed,
      inProgress,
      results: [...this.processingQueue]
    };
  }

  /**
   * Process queue with concurrency limit
   */
  private async processQueue(): Promise<void> {
    while (this.currentProcessing < this.maxConcurrency) {
      const nextItem = this.processingQueue.find(item => item.status === 'pending');
      if (!nextItem) break;

      nextItem.status = 'processing';
      this.currentProcessing++;

      // Process item (would call actual AI detection service)
      this.processItem(nextItem).finally(() => {
        this.currentProcessing--;
        this.processQueue(); // Continue processing
      });
    }
  }

  /**
   * Process individual item
   */
  private async processItem(item: BatchProcessingResult): Promise<void> {
    try {
      const startTime = Date.now();

      // Simulate processing (replace with actual AI detection service call)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));

      // Mock result (replace with actual detection result)
      item.result = {
        imageId: item.id,
        confidence: Math.random(),
        isAiGenerated: Math.random() > 0.5,
        analysis: {
          model: 'Batch Processing Model',
          timestamp: new Date(),
          breakdown: {
            humanLikelihood: Math.random(),
            aiArtifacts: Math.random(),
            processingQuality: Math.random(),
            technicalScore: Math.random(),
            artifactScore: Math.random(),
            consistencyScore: Math.random(),
            details: [`Processed in batch mode`]
          }
        }
      };

      item.processingTime = Date.now() - startTime;
      item.status = 'completed';
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear completed items from queue
   */
  clearCompleted(): void {
    this.processingQueue = this.processingQueue.filter(
      item => item.status !== 'completed' && item.status !== 'failed'
    );
  }

  /**
   * Cancel all pending items
   */
  cancelAll(): void {
    this.processingQueue.forEach(item => {
      if (item.status === 'pending') {
        item.status = 'failed';
        item.error = 'Cancelled by user';
      }
    });
  }
}

/**
 * Analysis report generator
 */
export class AnalysisReportGenerator {
  /**
   * Generate detailed analysis report
   */
  generateReport(images: UploadedImage[]): DetailedAnalysisReport {
    const totalImages = images.length;
    const aiGeneratedImages = images.filter(img => img.analysis?.isAiGenerated);
    const aiGeneratedCount = aiGeneratedImages.length;
    const authenticCount = totalImages - aiGeneratedCount;

    // Calculate average confidence
    const totalConfidence = images.reduce((sum, img) =>
      sum + (img.analysis?.confidence || 0), 0);
    const averageConfidence = totalImages > 0 ? totalConfidence / totalImages : 0;

    // Analyze generators
    const generators: { [key: string]: number } = {};
    images.forEach(img => {
      if (img.analysis?.analysis?.breakdown?.details) {
        const generatorLine = img.analysis.analysis.breakdown.details.find(
          (detail: string) => detail.includes('Generator:')
        );
        if (generatorLine) {
          const generator = generatorLine.split('Generator: ')[1]?.split(' (')[0] || 'Unknown';
          generators[generator] = (generators[generator] || 0) + 1;
        }
      }
    });

    // Confidence level distribution
    const confidenceLevels = {
      'Very High (90-100%)': 0,
      'High (70-90%)': 0,
      'Medium (50-70%)': 0,
      'Low (30-50%)': 0,
      'Very Low (0-30%)': 0
    };

    images.forEach(img => {
      const confidence = (img.analysis?.confidence || 0) * 100;
      if (confidence >= 90) confidenceLevels['Very High (90-100%)']++;
      else if (confidence >= 70) confidenceLevels['High (70-90%)']++;
      else if (confidence >= 50) confidenceLevels['Medium (50-70%)']++;
      else if (confidence >= 30) confidenceLevels['Low (30-50%)']++;
      else confidenceLevels['Very Low (0-30%)']++;
    });

    // File type distribution
    const fileTypes: { [key: string]: number } = {};
    images.forEach(img => {
      const type = img.file.type;
      fileTypes[type] = (fileTypes[type] || 0) + 1;
    });

    // File size distribution
    const fileSizes = {
      'Small (<1MB)': 0,
      'Medium (1-5MB)': 0,
      'Large (5-10MB)': 0,
      'Very Large (>10MB)': 0
    };

    images.forEach(img => {
      const sizeMB = (img.size || img.file.size) / (1024 * 1024);
      if (sizeMB < 1) fileSizes['Small (<1MB)']++;
      else if (sizeMB < 5) fileSizes['Medium (1-5MB)']++;
      else if (sizeMB < 10) fileSizes['Large (5-10MB)']++;
      else fileSizes['Very Large (>10MB)']++;
    });

    // Generate recommendations
    const recommendations: string[] = [];

    if (aiGeneratedCount > totalImages * 0.7) {
      recommendations.push('High proportion of AI-generated content detected. Consider source verification.');
    }

    if (averageConfidence < 0.5) {
      recommendations.push('Low average confidence scores. Results may need manual review.');
    }

    if (Object.keys(generators).length > 3) {
      recommendations.push('Multiple AI generators detected. Suggests diverse sources.');
    }

    return {
      summary: {
        totalImages,
        aiGeneratedCount,
        authenticCount,
        averageConfidence,
        processingTime: Date.now() // Would be actual processing time
      },
      breakdown: {
        generators,
        confidenceLevels,
        fileTypes,
        fileSizes
      },
      recommendations,
      metadata: {
        generatedAt: new Date(),
        analysisModel: 'Fake Checker v1.0.0',
        version: '1.0.0'
      },
      images: images.map(img => ({
        filename: img.file.name,
        result: img.analysis!,
        thumbnail: img.preview
      }))
    };
  }

  /**
   * Export report in specified format
   */
  async exportReport(report: DetailedAnalysisReport, format: ExportFormat): Promise<Blob> {
    switch (format) {
      case 'json':
        return this.exportAsJSON(report);
      case 'csv':
        return this.exportAsCSV(report);
      case 'html':
        return this.exportAsHTML(report);
      case 'pdf':
        return this.exportAsPDF(report);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as JSON
   */
  private exportAsJSON(report: DetailedAnalysisReport): Blob {
    const json = JSON.stringify(report, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Export as CSV
   */
  private exportAsCSV(report: DetailedAnalysisReport): Blob {
    const headers = [
      'Filename',
      'AI Generated',
      'Confidence',
      'Model',
      'Timestamp'
    ].join(',');

    const rows = report.images.map(img => [
      `"${img.filename}"`,
      img.result.isAiGenerated ? 'Yes' : 'No',
      (img.result.confidence * 100).toFixed(2) + '%',
      `"${img.result.analysis.model}"`,
      img.result.analysis.timestamp.toISOString()
    ].join(',')).join('\n');

    const csv = headers + '\n' + rows;
    return new Blob([csv], { type: 'text/csv' });
  }

  /**
   * Export as HTML
   */
  private exportAsHTML(report: DetailedAnalysisReport): Blob {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Fake Checker Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #1976d2; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat { text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #1976d2; }
        .stat-label { color: #666; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1976d2; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .image-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .image-card h3 { margin-top: 0; word-break: break-all; }
        .confidence { padding: 5px 10px; border-radius: 4px; color: white; }
        .confidence.high { background-color: #4caf50; }
        .confidence.medium { background-color: #ff9800; }
        .confidence.low { background-color: #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Fake Checker Analysis Report</h1>
        <p>Generated on ${report.metadata.generatedAt.toLocaleString()}</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
            <div class="stat">
                <div class="stat-value">${report.summary.totalImages}</div>
                <div class="stat-label">Total Images</div>
            </div>
            <div class="stat">
                <div class="stat-value">${report.summary.aiGeneratedCount}</div>
                <div class="stat-label">AI Generated</div>
            </div>
            <div class="stat">
                <div class="stat-value">${report.summary.authenticCount}</div>
                <div class="stat-label">Authentic</div>
            </div>
            <div class="stat">
                <div class="stat-value">${(report.summary.averageConfidence * 100).toFixed(1)}%</div>
                <div class="stat-label">Avg Confidence</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Detailed Results</h2>
        <div class="image-grid">
            ${report.images.map(img => `
                <div class="image-card">
                    <h3>${img.filename}</h3>
                    <p><strong>Result:</strong> ${img.result.isAiGenerated ? 'AI Generated' : 'Authentic'}</p>
                    <p><strong>Confidence:</strong>
                        <span class="confidence ${img.result.confidence > 0.7 ? 'high' : img.result.confidence > 0.4 ? 'medium' : 'low'}">
                            ${(img.result.confidence * 100).toFixed(1)}%
                        </span>
                    </p>
                    <p><strong>Model:</strong> ${img.result.analysis.model}</p>
                    <p><strong>Analyzed:</strong> ${img.result.analysis.timestamp.toLocaleString()}</p>
                </div>
            `).join('')}
        </div>
    </div>

    ${report.recommendations.length > 0 ? `
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

</body>
</html>`;

    return new Blob([html], { type: 'text/html' });
  }

  /**
   * Export as PDF (simplified - would need a PDF library for full implementation)
   */
  private exportAsPDF(report: DetailedAnalysisReport): Blob {
    // This is a placeholder - in a real implementation, you'd use a library like jsPDF
    const content = `
Fake Checker Analysis Report
Generated: ${report.metadata.generatedAt.toLocaleString()}

SUMMARY
=======
Total Images: ${report.summary.totalImages}
AI Generated: ${report.summary.aiGeneratedCount}
Authentic: ${report.summary.authenticCount}
Average Confidence: ${(report.summary.averageConfidence * 100).toFixed(1)}%

DETAILED RESULTS
===============
${report.images.map(img => `
${img.filename}
- Result: ${img.result.isAiGenerated ? 'AI Generated' : 'Authentic'}
- Confidence: ${(img.result.confidence * 100).toFixed(1)}%
- Model: ${img.result.analysis.model}
- Analyzed: ${img.result.analysis.timestamp.toLocaleString()}
`).join('')}

${report.recommendations.length > 0 ? `
RECOMMENDATIONS
===============
${report.recommendations.map(rec => `• ${rec}`).join('\n')}
` : ''}
`;

    return new Blob([content], { type: 'text/plain' });
  }
}

// Export service instances
export const imageComparisonService = new ImageComparisonService();
export const batchProcessingService = new BatchProcessingService();
export const reportGenerator = new AnalysisReportGenerator();