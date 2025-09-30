/**
 * Advanced Features Components
 * UI components for image comparison, batch processing, and report generation
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,

  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import {
  CompareArrows,
  BatchPrediction,
  Assessment,
  CloudDownload,
  ExpandMore,
  Pause,
  Refresh,
  Info,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  GetApp
} from '@mui/icons-material';

import {
  imageComparisonService,
  batchProcessingService,
  reportGenerator
} from '../../services/advancedFeatures';
import type {
  ImageComparisonResult,
  BatchProcessingStatus,
  DetailedAnalysisReport,
  ExportFormat
} from '../../services/advancedFeatures';
import type { UploadedImage } from '../../types';

/**
 * Image Comparison Component
 */
export const ImageComparison: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [comparisonResult, setComparisonResult] = useState<ImageComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 2) {
      setSelectedImages(files);
    } else {
      setError('Please select exactly 2 images to compare');
    }
  }, []);

  const handleCompareImages = useCallback(async () => {
    if (selectedImages.length !== 2) {
      setError('Please select exactly 2 images');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await imageComparisonService.compareImages(selectedImages[0], selectedImages[1]);
      setComparisonResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare images');
    } finally {
      setLoading(false);
    }
  }, [selectedImages]);

  const getSimilarityColor = (similarity: number) => {
    if (similarity > 0.8) return '#4caf50';
    if (similarity > 0.5) return '#ff9800';
    return '#f44336';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity > 0.95) return 'Nearly Identical';
    if (similarity > 0.8) return 'Very Similar';
    if (similarity > 0.6) return 'Similar';
    if (similarity > 0.4) return 'Somewhat Similar';
    return 'Different';
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        <CompareArrows sx={{ mr: 1, verticalAlign: 'bottom' }} />
        Image Comparison
      </Typography>

      <Box sx={{ mb: 3 }}>
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="comparison-upload"
          multiple
          type="file"
          onChange={handleFileSelect}
        />
        <label htmlFor="comparison-upload">
          <Button variant="outlined" component="span" fullWidth sx={{ mb: 2 }}>
            Select 2 Images to Compare
          </Button>
        </label>

        {selectedImages.length === 2 && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            {selectedImages.map((file, index) => (
              <Box key={index} sx={{ flex: '1 1 300px', minWidth: '200px' }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" noWrap>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        )}

        <Button
          variant="contained"
          onClick={handleCompareImages}
          disabled={selectedImages.length !== 2 || loading}
          fullWidth
        >
          {loading ? 'Comparing...' : 'Compare Images'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {comparisonResult && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Comparison Results
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Overall Similarity
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={comparisonResult.similarity * 100}
                    sx={{
                      height: 10,
                      borderRadius: 5,
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getSimilarityColor(comparisonResult.similarity)
                      }
                    }}
                  />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">
                    {(comparisonResult.similarity * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={getSimilarityLabel(comparisonResult.similarity)}
                color={comparisonResult.similarity > 0.8 ? 'success' : comparisonResult.similarity > 0.5 ? 'warning' : 'error'}
                size="small"
              />
            </Box>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography>Detailed Analysis</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: '1 1 150px', textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Structural Difference
                    </Typography>
                    <Typography variant="h6">
                      {(comparisonResult.differences.structural * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Color Difference
                    </Typography>
                    <Typography variant="h6">
                      {(comparisonResult.differences.color * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 150px', textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Texture Difference
                    </Typography>
                    <Typography variant="h6">
                      {(comparisonResult.differences.texture * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Technical Metrics
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Pixel Difference"
                      secondary={comparisonResult.analysis.pixelDifference.toFixed(2)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Histogram Difference"
                      secondary={comparisonResult.analysis.histogramDifference.toFixed(2)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Edge Detection Difference"
                      secondary={comparisonResult.analysis.edgeDetectionDifference.toFixed(2)}
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </Paper>
  );
};

/**
 * Batch Processing Component
 */
export const BatchProcessing: React.FC = () => {
  const [status, setStatus] = useState<BatchProcessingStatus>({ total: 0, completed: 0, failed: 0, inProgress: 0, results: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const refreshStatus = useCallback(async () => {
    const currentStatus = batchProcessingService.getStatus();
    setStatus(currentStatus);
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshStatus, 1000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    setError('');

    try {
      await batchProcessingService.addToBatch(files);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start batch processing');
    } finally {
      setLoading(false);
    }
  }, [refreshStatus]);

  const handleClearCompleted = useCallback(() => {
    batchProcessingService.clearCompleted();
    refreshStatus();
  }, [refreshStatus]);

  const handleCancelAll = useCallback(() => {
    batchProcessingService.cancelAll();
    refreshStatus();
  }, [refreshStatus]);

  const getStatusIcon = (itemStatus: string) => {
    switch (itemStatus) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'processing':
        return <CircularProgress size={20} />;
      default:
        return <Pause color="action" />;
    }
  };

  const getStatusColor = (itemStatus: string) => {
    switch (itemStatus) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        <BatchPrediction sx={{ mr: 1, verticalAlign: 'bottom' }} />
        Batch Processing
      </Typography>

      <Box sx={{ mb: 3 }}>
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id="batch-upload"
          multiple
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="batch-upload">
          <Button variant="outlined" component="span" fullWidth sx={{ mb: 2 }}>
            Select Images for Batch Processing
          </Button>
        </label>

        {status.total > 0 && (
          <>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Processing Status
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'space-around', flexWrap: 'wrap' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total
                    </Typography>
                    <Typography variant="h6">{status.total}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {status.completed}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      {status.inProgress}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                    <Typography variant="h6" color="error.main">
                      {status.failed}
                    </Typography>
                  </Box>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={(status.completed / status.total) * 100}
                  sx={{ mb: 1 }}
                />

                <Typography variant="body2" color="text.secondary" align="center">
                  {status.completed} of {status.total} completed ({((status.completed / status.total) * 100).toFixed(1)}%)
                </Typography>
              </CardContent>

              <CardActions>
                <Button size="small" onClick={handleClearCompleted} disabled={status.completed === 0}>
                  Clear Completed
                </Button>
                <Button size="small" onClick={handleCancelAll} disabled={status.inProgress === 0}>
                  Cancel All
                </Button>
                <Button size="small" onClick={refreshStatus}>
                  <Refresh />
                </Button>
              </CardActions>
            </Card>

            <Typography variant="subtitle2" gutterBottom>
              Processing Details
            </Typography>
            <List>
              {status.results.map((result) => (
                <ListItem key={result.id}>
                  <ListItemIcon>
                    {getStatusIcon(result.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={result.filename}
                    secondary={
                      <>
                        <Chip
                          label={result.status}
                          color={getStatusColor(result.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        {result.processingTime && (
                          <Typography component="span" variant="caption">
                            {result.processingTime}ms
                          </Typography>
                        )}
                        {result.error && (
                          <Typography component="span" variant="caption" color="error">
                            {result.error}
                          </Typography>
                        )}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress />}
    </Paper>
  );
};

/**
 * Analysis Report Component
 */
interface AnalysisReportProps {
  images: UploadedImage[];
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ images }) => {
  const [report, setReport] = useState<DetailedAnalysisReport | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (images.length > 0) {
      // Filter images that have analysis results
      const analyzedImages = images.filter(img => img.analysis);
      if (analyzedImages.length > 0) {
        const generatedReport = reportGenerator.generateReport(analyzedImages);
        setReport(generatedReport);
      }
    }
  }, [images]);

  const handleExport = useCallback(async () => {
    if (!report) return;

    setExporting(true);
    try {
      const blob = await reportGenerator.exportReport(report, exportFormat);

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fake-checker-report-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportDialogOpen(false);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [report, exportFormat]);

  if (!report) {
    return (
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          <Assessment sx={{ mr: 1, verticalAlign: 'bottom' }} />
          Analysis Report
        </Typography>
        <Alert severity="info">
          No analyzed images available. Upload and analyze images to generate a report.
        </Alert>
      </Paper>
    );
  }

  return (
    <>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            <Assessment sx={{ mr: 1, verticalAlign: 'bottom' }} />
            Analysis Report
          </Typography>
          <Button
            variant="outlined"
            startIcon={<GetApp />}
            onClick={() => setExportDialogOpen(true)}
          >
            Export Report
          </Button>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {report.summary.totalImages}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Images
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="error">
                  {report.summary.aiGeneratedCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  AI Generated
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success">
                  {report.summary.authenticCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Authentic
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 200px', minWidth: '200px' }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4">
                  {(report.summary.averageConfidence * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Confidence
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Breakdown Sections */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Confidence Level Distribution</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {Object.entries(report.breakdown.confidenceLevels).map(([level, count]) => (
                <ListItem key={level}>
                  <ListItemText
                    primary={level}
                    secondary={`${count} images`}
                  />
                  <Chip label={count} size="small" />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>File Type Distribution</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {Object.entries(report.breakdown.fileTypes).map(([type, count]) => (
                <ListItem key={type}>
                  <ListItemText
                    primary={type}
                    secondary={`${count} files`}
                  />
                  <Chip label={count} size="small" />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        {Object.keys(report.breakdown.generators).length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Detected AI Generators</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {Object.entries(report.breakdown.generators).map(([generator, count]) => (
                  <ListItem key={generator}>
                    <ListItemText
                      primary={generator}
                      secondary={`${count} detections`}
                    />
                    <Chip label={count} size="small" color="error" />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Warning color="warning" sx={{ mr: 1, verticalAlign: 'bottom' }} />
                Recommendations
              </Typography>
              <List>
                {report.recommendations.map((recommendation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Info color="info" />
                    </ListItemIcon>
                    <ListItemText primary={recommendation} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Paper>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Analysis Report</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportFormat}
              label="Export Format"
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            >
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="html">HTML</MenuItem>
              <MenuItem value="pdf">PDF (Text)</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            The report will include summary statistics, detailed results for each image, and recommendations.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleExport}
            variant="contained"
            disabled={exporting}
            startIcon={exporting ? <CircularProgress size={16} /> : <CloudDownload />}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

/**
 * Advanced Features Container
 */
interface AdvancedFeaturesProps {
  images: UploadedImage[];
}

export const AdvancedFeatures: React.FC<AdvancedFeaturesProps> = ({ images }) => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Advanced Features
      </Typography>

      <ImageComparison />
      <BatchProcessing />
      <AnalysisReport images={images} />
    </Box>
  );
};