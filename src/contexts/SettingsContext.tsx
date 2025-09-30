import React, { createContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { storageService } from '../services/storageService';

export interface AppSettings {
  // Appearance
  darkMode: boolean;
  theme: 'light' | 'dark' | 'system';

  // Analysis
  autoAnalysis: boolean;
  showConfidenceScores: boolean;
  confidenceThreshold: number;
  analysisSpeed: 'fast' | 'balanced' | 'thorough';

  // Privacy & Data
  saveHistory: boolean;
  enableNotifications: boolean;
  autoDeleteHistory: boolean;
  historyRetentionDays: number;

  // Performance
  maxConcurrentAnalysis: number;
  enableImageCompression: boolean;
  compressionQuality: number;

  // Accessibility
  reduceMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';

  // API Configuration
  apiKeys: {
    huggingFace: string;
    hiveAI: string;
  };

  // Advanced Features
  enableAdvancedMode: boolean;
  enableBatchProcessing: boolean;
  enableCloudBackup: boolean;
  enableExperimentalFeatures: boolean;
}

const defaultSettings: AppSettings = {
  // Appearance
  darkMode: false,
  theme: 'system',

  // Analysis
  autoAnalysis: true,
  showConfidenceScores: true,
  confidenceThreshold: 0.5,
  analysisSpeed: 'balanced',

  // Privacy & Data
  saveHistory: false,
  enableNotifications: false,
  autoDeleteHistory: true,
  historyRetentionDays: 30,

  // Performance
  maxConcurrentAnalysis: 3,
  enableImageCompression: true,
  compressionQuality: 0.8,

  // Accessibility
  reduceMotion: false,
  highContrast: false,
  fontSize: 'medium',

  // API Configuration
  apiKeys: {
    huggingFace: '',
    hiveAI: '',
  },

  // Advanced Features
  enableAdvancedMode: false,
  enableBatchProcessing: true,
  enableCloudBackup: false,
  enableExperimentalFeatures: false,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = 'fake-checker-settings';

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  // Load settings from storage service on initialization
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = storageService.getPreferences();
        if (stored) {
          // Map storage preferences to our settings structure
          const mappedSettings: AppSettings = {
            ...defaultSettings,
            theme: stored.theme === 'auto' ? 'system' : stored.theme,
            autoAnalysis: stored.autoAnalyze,
            saveHistory: stored.saveHistory,
            enableImageCompression: stored.compressionQuality > 0,
            compressionQuality: stored.compressionQuality,
            apiKeys: {
              huggingFace: '',
              hiveAI: stored.apiSettings.hiveApiKey || '',
            },
            enableAdvancedMode: stored.showAdvancedOptions,
          };
          setSettings(mappedSettings);
        }
      } catch (error) {
        console.warn('Failed to load settings from storage:', error);
        // Fallback to localStorage
        try {
          const fallback = localStorage.getItem(STORAGE_KEY);
          if (fallback) {
            const parsedSettings = JSON.parse(fallback);
            setSettings({ ...defaultSettings, ...parsedSettings });
          }
        } catch (fallbackError) {
          console.warn('Failed to load settings from localStorage fallback:', fallbackError);
        }
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage service whenever they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        // Map our settings to storage preferences format
        const preferences = {
          theme: settings.theme === 'system' ? 'auto' as const : settings.theme,
          autoAnalyze: settings.autoAnalysis,
          saveHistory: settings.saveHistory,
          compressionQuality: settings.compressionQuality,
          showAdvancedOptions: settings.enableAdvancedMode,
          apiSettings: {
            hiveApiKey: settings.apiKeys.hiveAI,
            rateLimitDelay: 1000,
          },
        };

        await storageService.savePreferences(preferences);
      } catch (error) {
        console.warn('Failed to save settings to storage:', error);
        // Fallback to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (fallbackError) {
          console.warn('Failed to save settings to localStorage fallback:', fallbackError);
        }
      }
    };

    // Only save if settings are different from defaults (avoid saving on initial load)
    if (JSON.stringify(settings) !== JSON.stringify(defaultSettings)) {
      saveSettings();
    }
  }, [settings]);

  // Apply theme changes to the document
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme
    if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark-theme');
    } else {
      root.classList.remove('dark-theme');
    }

    // Apply accessibility settings
    if (settings.reduceMotion) {
      // Disable all animations and transitions
      root.style.setProperty('--motion-duration', '0s');
      root.style.setProperty('--motion-easing', 'linear');
      root.style.setProperty('--motion-transform', 'none');
      // Add reduce-motion class for additional CSS targeting
      root.classList.add('reduce-motion');
    } else {
      // Restore default motion values
      root.style.removeProperty('--motion-duration');
      root.style.removeProperty('--motion-easing');
      root.style.removeProperty('--motion-transform');
      root.classList.remove('reduce-motion');
    }

    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply font size
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${settings.fontSize}`);

  }, [settings.theme, settings.reduceMotion, settings.highContrast, settings.fontSize]);

  const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback((settingsJson: string): boolean => {
    try {
      const importedSettings = JSON.parse(settingsJson);
      // Validate that imported settings match our interface
      const validSettings = { ...defaultSettings, ...importedSettings };
      setSettings(validSettings);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, []);

  const contextValue: SettingsContextType = useMemo(() => ({
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
  }), [settings, updateSetting, updateSettings, resetSettings, exportSettings, importSettings]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export type { SettingsContextType };
export default SettingsContext;