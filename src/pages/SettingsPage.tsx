import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Alert,
  Chip,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  TextField,
  IconButton
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Info,
  Shield,
  Palette,
  Key,
  Zap,
  Eye,
  EyeOff,
  Cpu
} from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

const SettingsPage: React.FC = () => {
  const { settings, updateSetting, resetSettings, exportSettings, importSettings } = useSettings();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importError, setImportError] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showHuggingFaceKey, setShowHuggingFaceKey] = useState(false);
  const [showHiveKey, setShowHiveKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResetSettings = () => {
    resetSettings();
    setShowSuccessMessage(true);
  };

  const handleExportSettings = async () => {
    try {
      const settingsData = exportSettings();
      await navigator.clipboard.writeText(settingsData);
      setExportDialogOpen(true);
    } catch {
      // Fallback: download as file
      const blob = new Blob([exportSettings()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fake-checker-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowSuccessMessage(true);
    }
  };

  const handleImportSettings = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          if (importSettings(content)) {
            setShowSuccessMessage(true);
            setImportError('');
          } else {
            setImportError('Invalid settings file format');
          }
        } catch {
          setImportError('Failed to parse settings file');
        }
        setImportDialogOpen(true);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SettingsIcon size={32} color="#1976d2" />
          <Typography variant="h3" component="h1" sx={{ ml: 2 }}>
            Settings
          </Typography>
        </Box>
        <Typography variant="h6" color="text.secondary">
          Customize your Fake Checker experience
        </Typography>
      </Paper>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>

        {/* Appearance Settings */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Palette size={24} color="#1976d2" />
            <Typography variant="h5" sx={{ ml: 1 }}>
              Appearance
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Theme</InputLabel>
            <Select
              value={settings.theme}
              onChange={(e) => updateSetting('theme', e.target.value as 'light' | 'dark' | 'system')}
              label="Theme"
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="system">System Default</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Font Size</InputLabel>
            <Select
              value={settings.fontSize}
              onChange={(e) => updateSetting('fontSize', e.target.value as 'small' | 'medium' | 'large')}
              label="Font Size"
            >
              <MenuItem value="small">Small</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="large">Large</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={settings.highContrast}
                onChange={(e) => updateSetting('highContrast', e.target.checked)}
                color="primary"
              />
            }
            label="High Contrast Mode"
            sx={{ mb: 1, display: 'block' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.reduceMotion}
                onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
                color="primary"
              />
            }
            label="Reduce Motion"
            sx={{ mb: 2, display: 'block' }}
          />
        </Paper>

        {/* Analysis Settings */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Shield size={24} color="#1976d2" />
            <Typography variant="h5" sx={{ ml: 1 }}>
              Analysis
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={settings.autoAnalysis}
                onChange={(e) => updateSetting('autoAnalysis', e.target.checked)}
                color="primary"
              />
            }
            label="Auto-analyze uploaded images"
            sx={{ mb: 2, display: 'block' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.showConfidenceScores}
                onChange={(e) => updateSetting('showConfidenceScores', e.target.checked)}
                color="primary"
              />
            }
            label="Show confidence scores"
            sx={{ mb: 2, display: 'block' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableBatchProcessing}
                onChange={(e) => updateSetting('enableBatchProcessing', e.target.checked)}
                color="primary"
              />
            }
            label="Enable batch processing"
            sx={{ mb: 2, display: 'block' }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Analysis Speed</InputLabel>
            <Select
              value={settings.analysisSpeed}
              onChange={(e) => updateSetting('analysisSpeed', e.target.value as 'fast' | 'balanced' | 'thorough')}
              label="Analysis Speed"
            >
              <MenuItem value="fast">Fast</MenuItem>
              <MenuItem value="balanced">Balanced</MenuItem>
              <MenuItem value="thorough">Thorough</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              Confidence Threshold: {(settings.confidenceThreshold * 100).toFixed(0)}%
            </Typography>
            <Slider
              value={settings.confidenceThreshold}
              onChange={(_, value) => updateSetting('confidenceThreshold', value as number)}
              min={0.1}
              max={0.9}
              step={0.05}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              Max Concurrent Analysis: {settings.maxConcurrentAnalysis}
            </Typography>
            <Slider
              value={settings.maxConcurrentAnalysis}
              onChange={(_, value) => updateSetting('maxConcurrentAnalysis', value as number)}
              min={1}
              max={8}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        </Paper>

        {/* Performance Settings */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Cpu size={24} color="#1976d2" />
            <Typography variant="h5" sx={{ ml: 1 }}>
              Performance
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableImageCompression}
                onChange={(e) => updateSetting('enableImageCompression', e.target.checked)}
                color="primary"
              />
            }
            label="Compress images before analysis"
            sx={{ mb: 2, display: 'block' }}
          />

          {settings.enableImageCompression && (
            <Box sx={{ mb: 2 }}>
              <Typography gutterBottom>
                Compression Quality: {settings.compressionQuality}%
              </Typography>
              <Slider
                value={settings.compressionQuality}
                onChange={(_, value) => updateSetting('compressionQuality', value as number)}
                min={10}
                max={100}
                step={5}
                marks={[
                  { value: 25, label: 'Low' },
                  { value: 50, label: 'Medium' },
                  { value: 75, label: 'High' },
                  { value: 95, label: 'Best' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
            </Box>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            Performance settings help optimize the app for your device capabilities.
          </Alert>
        </Paper>

        {/* API Configuration */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Key size={24} color="#1976d2" />
            <Typography variant="h5" sx={{ ml: 1 }}>
              API Configuration
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Hugging Face API Key"
            type={showHuggingFaceKey ? 'text' : 'password'}
            value={settings.apiKeys.huggingFace || ''}
            onChange={(e) => updateSetting('apiKeys', { ...settings.apiKeys, huggingFace: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowHuggingFaceKey(!showHuggingFaceKey)}
                  edge="end"
                >
                  {showHuggingFaceKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              ),
            }}
            helperText="Optional: Provide your Hugging Face API key for enhanced model access"
          />

          <TextField
            fullWidth
            label="Hive AI API Key"
            type={showHiveKey ? 'text' : 'password'}
            value={settings.apiKeys.hiveAI || ''}
            onChange={(e) => updateSetting('apiKeys', { ...settings.apiKeys, hiveAI: e.target.value })}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => setShowHiveKey(!showHiveKey)}
                  edge="end"
                >
                  {showHiveKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </IconButton>
              ),
            }}
            helperText="Optional: Provide your Hive AI API key for advanced detection capabilities"
          />

          <Alert severity="warning" sx={{ mt: 2 }}>
            API keys are stored locally in your browser and never sent to our servers.
          </Alert>
        </Paper>

        {/* Advanced Features */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Zap size={24} color="#1976d2" />
            <Typography variant="h5" sx={{ ml: 1 }}>
              Advanced Features
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableAdvancedMode}
                onChange={(e) => updateSetting('enableAdvancedMode', e.target.checked)}
                color="primary"
              />
            }
            label="Enable advanced mode"
            sx={{ mb: 2, display: 'block' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableCloudBackup}
                onChange={(e) => updateSetting('enableCloudBackup', e.target.checked)}
                color="primary"
              />
            }
            label="Enable cloud backup"
            sx={{ mb: 2, display: 'block' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableExperimentalFeatures}
                onChange={(e) => updateSetting('enableExperimentalFeatures', e.target.checked)}
                color="primary"
              />
            }
            label="Enable experimental features"
            sx={{ mb: 2, display: 'block' }}
          />

          <Alert severity="warning" sx={{ mt: 2 }}>
            Experimental features may be unstable and are subject to change.
          </Alert>
        </Paper>

        {/* Privacy Settings */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Info size={24} color="#1976d2" />
            <Typography variant="h5" sx={{ ml: 1 }}>
              Privacy & Data
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={settings.saveHistory}
                onChange={(e) => updateSetting('saveHistory', e.target.checked)}
                color="primary"
              />
            }
            label="Save analysis history locally"
            sx={{ mb: 2, display: 'block' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.enableNotifications}
                onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                color="primary"
              />
            }
            label="Enable notifications"
            sx={{ mb: 2, display: 'block' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.autoDeleteHistory}
                onChange={(e) => updateSetting('autoDeleteHistory', e.target.checked)}
                color="primary"
              />
            }
            label="Auto-delete old history"
            sx={{ mb: 2, display: 'block' }}
          />

          {settings.autoDeleteHistory && (
            <Box sx={{ mb: 2 }}>
              <Typography gutterBottom>
                Delete history after {settings.historyRetentionDays} days
              </Typography>
              <Slider
                value={settings.historyRetentionDays}
                onChange={(_, value) => updateSetting('historyRetentionDays', value as number)}
                min={1}
                max={365}
                step={1}
                marks={[
                  { value: 7, label: '1 Week' },
                  { value: 30, label: '1 Month' },
                  { value: 90, label: '3 Months' },
                  { value: 365, label: '1 Year' },
                ]}
                valueLabelDisplay="auto"
              />
            </Box>
          )}

          <Alert severity="success" sx={{ mt: 2 }}>
            All processing happens locally in your browser. No data is sent to external servers.
          </Alert>
        </Paper>

        {/* App Information */}
        <Paper elevation={1} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            App Information
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">Version</Typography>
            <Chip label="1.0.0" size="small" />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">AI Model</Typography>
            <Chip label="Hive AI Detection v2.1" size="small" color="primary" />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">Last Updated</Typography>
            <Typography variant="body2">September 27, 2025</Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            <Chip label="Privacy Focused" size="small" color="success" />
            <Chip label="Local Processing" size="small" color="info" />
            <Chip label="Mobile Responsive" size="small" color="secondary" />
            <Chip label="Batch Processing" size="small" />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={handleExportSettings}
              sx={{ minWidth: 120 }}
            >
              Export Settings
            </Button>
            <Button
              variant="outlined"
              onClick={handleImportSettings}
              sx={{ minWidth: 120 }}
            >
              Import Settings
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Reset Section */}
      <Paper elevation={2} sx={{ p: 4, mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Reset Settings
        </Typography>
        <Typography color="text.secondary" paragraph>
          This will restore all settings to their default values.
        </Typography>
        <Button
          variant="outlined"
          color="warning"
          onClick={handleResetSettings}
        >
          Reset to Defaults
        </Button>
      </Paper>

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your settings have been copied to the clipboard. You can paste them into a text file to save.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
        <DialogTitle>Import Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {importError ? (
              <Alert severity="error" sx={{ mt: 1 }}>
                {importError}
              </Alert>
            ) : (
              "Select a settings file to import your configuration."
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          Settings updated successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;