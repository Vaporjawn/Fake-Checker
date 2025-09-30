/**
 * Simple Integration Test
 */

import { aiDetectionService } from '../services/aiDetectionService';
import { imageProcessingService } from '../services/imageProcessingService';
import { storageService } from '../services/storageService';

export const testServices = async (): Promise<void> => {
  console.log('🧪 Testing core services...');

  // Test Storage Service
  try {
    const testPrefs = {
      theme: 'dark' as const,
      autoAnalyze: true,
      saveHistory: true,
    };

    await storageService.savePreferences(testPrefs);
    const retrieved = storageService.getPreferences();

    console.log('✅ Storage Service - Preferences:', retrieved.theme === testPrefs.theme);
  } catch (error) {
    console.error('❌ Storage Service failed:', error);
  }

  // Test Image Processing Service
  try {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const validation = await imageProcessingService.validateImage(mockFile);

    console.log('✅ Image Processing Service - Validation:', validation.success);
  } catch (error) {
    console.error('❌ Image Processing Service failed:', error);
  }

  // Test AI Detection Service
  try {
    aiDetectionService.setApiKey('test-key');
    console.log('✅ AI Detection Service - API Key setting works');
  } catch (error) {
    console.error('❌ AI Detection Service failed:', error);
  }

  console.log('🧪 Service tests completed!');
};

// Make available globally for browser testing
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).testServices = testServices;
  console.log('🧪 Run: window.testServices()');
}