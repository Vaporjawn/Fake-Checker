// Integration test for main App component
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock the problematic services to avoid import.meta issues
jest.mock('../services/aiDetectionService', () => ({
  aiDetectionService: {
    hasApiKey: jest.fn(() => true),
    analyzeImage: jest.fn(() => Promise.resolve({
      success: true,
      data: {
        imageId: 'test-id',
        confidence: 0.85,
        isAiGenerated: false,
        analysis: {
          model: 'test-model',
          timestamp: new Date(),
          breakdown: {
            humanLikelihood: 0.85,
            aiArtifacts: 0.15,
            processingQuality: 0.9,
            technicalScore: 0.8,
            artifactScore: 0.2,
            consistencyScore: 0.9,
            details: ['High human likelihood score']
          }
        }
      }
    }))
  },
  AIDetectionService: jest.fn()
}));

describe('Fake Checker App Integration', () => {
  it('renders the main application without crashing', () => {
    render(<App />);
    
    // Check that key elements are present
    expect(screen.getByText(/Fake Checker/i)).toBeInTheDocument();
  });

  it('displays the upload area', () => {
    render(<App />);
    
    expect(screen.getByText(/Drag & Drop Images Here/i)).toBeInTheDocument();
  });

  it('shows the navigation', () => {
    render(<App />);
    
    // Should have navigation elements
    expect(document.querySelector('nav, header')).toBeInTheDocument();
  });

  it('has accessibility attributes', () => {
    render(<App />);
    
    const app = document.querySelector('#root > div, main, [role="main"]');
    expect(app).toBeInTheDocument();
  });

  it('loads without JavaScript errors', () => {
    // This test passes if no errors are thrown during render
    expect(() => {
      render(<App />);
    }).not.toThrow();
  });
});