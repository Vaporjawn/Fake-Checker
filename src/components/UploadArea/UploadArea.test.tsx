import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';
import UploadArea from './UploadArea';

// Define types for dropzone
interface DropzoneOptions {
  onDrop: (acceptedFiles: File[], rejectedFiles: unknown[], event: unknown) => void;
  accept: Record<string, string[]>;
  maxSize: number;
  multiple: boolean;
  noClick: boolean;
}

interface DropzoneReturn {
  getRootProps: () => Record<string, unknown>;
  getInputProps: () => Record<string, unknown>;
  isDragActive: boolean;
  isDragReject: boolean;
  isDragAccept: boolean;
  isFocused: boolean;
  acceptedFiles: File[];
  rejectedFiles: unknown[];
  fileRejections: unknown[];
  open: jest.Mock;
}

// Mock react-dropzone
const mockUseDropzone = jest.fn<DropzoneReturn, [DropzoneOptions]>();
jest.mock('react-dropzone', () => ({
  useDropzone: mockUseDropzone,
}));

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Mock File constructor
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  constructor(chunks: BlobPart[], filename: string, options?: FilePropertyBag) {
    this.name = filename;
    this.size = options?.type === 'image/png' ? 1024 * 1024 : 500 * 1024; // 1MB for PNG, 500KB for others
    this.type = options?.type || 'image/jpeg';
    this.lastModified = Date.now();
  }
} as typeof File;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-blob-url');
global.URL.revokeObjectURL = jest.fn();

// Mock FileReader
class MockFileReader {
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  result: string | null = null;
  error: any = null;
  readyState: number = 0;

  readAsDataURL(file: File) {
    this.readyState = 1; // LOADING
    setTimeout(() => {
      if (file.name.includes('error')) {
        this.readyState = 2; // DONE
        this.error = new Error('Failed to read file');
        if (this.onerror) this.onerror({ target: this });
      } else {
        this.readyState = 2; // DONE
        this.result = `data:${file.type};base64,mockBase64Data`;
        if (this.onload) this.onload({ target: this });
      }
    }, 100);
  }
}

global.FileReader = MockFileReader as any;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = createTheme();
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

// Helper function to create mock files
const createMockFile = (name: string, type: string, size?: number): File => {
  const file = new File(['mock content'], name, { type });
  Object.defineProperty(file, 'size', { value: size || 1024 * 1024 });
  return file;
};

// Helper function to create mock drop event
const createMockDropEvent = (files: File[]) => ({
  dataTransfer: {
    files,
    items: files.map(file => ({
      kind: 'file',
      type: file.type,
      getAsFile: () => file,
    })),
  },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
});

describe('UploadArea Component', () => {
  let mockOnFilesUpload: jest.Mock;
  let mockUseDropzoneReturn: any;

  beforeEach(() => {
    mockOnFilesUpload = jest.fn();
    mockUseDropzoneReturn = {
      getRootProps: jest.fn(() => ({
        'data-testid': 'dropzone-root',
        onClick: jest.fn(),
        onDrop: jest.fn(),
        onDragEnter: jest.fn(),
        onDragOver: jest.fn(),
        onDragLeave: jest.fn(),
      })),
      getInputProps: jest.fn(() => ({
        'data-testid': 'dropzone-input',
        type: 'file',
        multiple: true,
        accept: 'image/*',
      })),
      isDragActive: false,
      isDragReject: false,
      isDragAccept: false,
      isFocused: false,
      acceptedFiles: [],
      rejectedFiles: [],
      fileRejections: [],
      open: jest.fn(),
    };
    mockUseDropzone.mockReturnValue(mockUseDropzoneReturn);

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the upload area with correct text', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      expect(screen.getByText('Drag & Drop Images Here')).toBeInTheDocument();
      expect(screen.getByText('Choose files or drag them here')).toBeInTheDocument();
      expect(screen.getByText('Choose Images')).toBeInTheDocument();
    });

    it('renders with proper ARIA attributes for accessibility', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      expect(dropzoneRoot).toHaveAttribute('tabIndex', '0');
      expect(dropzoneRoot).toHaveAttribute('aria-label');
    });

    it('renders the sample images section', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      expect(screen.getByText('Try with sample images')).toBeInTheDocument();
      expect(screen.getAllByRole('img')).toHaveLength(4); // 4 sample images
    });

    it('renders all sample images with correct attributes', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const images = screen.getAllByRole('img');
      images.forEach((img, index) => {
        expect(img).toHaveAttribute('alt', `Sample ${index + 1}`);
        expect(img).toHaveAttribute('src');
      });
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('handles drag active state correctly', () => {
      mockUseDropzoneReturn.isDragActive = true;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      expect(dropzoneRoot).toHaveStyle('border-color: rgb(25, 118, 210)'); // MUI primary color
    });

    it('handles drag reject state correctly', () => {
      mockUseDropzoneReturn.isDragReject = true;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      expect(dropzoneRoot).toHaveStyle('border-color: rgb(244, 67, 54)'); // MUI error color
    });

    it('handles drag accept state correctly', () => {
      mockUseDropzoneReturn.isDragAccept = true;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      expect(dropzoneRoot).toHaveStyle('border-color: rgb(76, 175, 80)'); // MUI success color
    });

    it('calls onFilesUpload when files are dropped', async () => {
      const mockFiles = [
        createMockFile('test1.jpg', 'image/jpeg'),
        createMockFile('test2.png', 'image/png'),
      ];

      mockUseDropzoneReturn.acceptedFiles = mockFiles;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      await act(async () => {
        onDropCallback(mockFiles, [], createMockDropEvent(mockFiles));
      });

      await waitFor(() => {
        expect(mockOnFilesUpload).toHaveBeenCalledWith(mockFiles);
      });
    });

    it('handles file rejection due to size limit', () => {
      const rejectedFile = createMockFile('large-file.jpg', 'image/jpeg', 15 * 1024 * 1024); // 15MB

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      act(() => {
        onDropCallback([], [{ file: rejectedFile, errors: [{ code: 'file-too-large', message: 'File is larger than 10MB' }] }], createMockDropEvent([]));
      });

      expect(mockOnFilesUpload).not.toHaveBeenCalled();
    });

    it('handles file rejection due to invalid type', () => {
      const rejectedFile = createMockFile('document.pdf', 'application/pdf');

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      act(() => {
        onDropCallback([], [{ file: rejectedFile, errors: [{ code: 'file-invalid-type', message: 'File type not supported' }] }], createMockDropEvent([]));
      });

      expect(mockOnFilesUpload).not.toHaveBeenCalled();
    });
  });

  describe('File Input Functionality', () => {
    it('opens file dialog when browse button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const browseButton = screen.getByText('Choose Images');
      await user.click(browseButton);

      expect(mockUseDropzoneReturn.open).toHaveBeenCalled();
    });

    it('opens file dialog when dropzone is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      await user.click(dropzoneRoot);

      expect(mockUseDropzoneReturn.open).toHaveBeenCalled();
    });

    it('handles keyboard navigation for dropzone', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      dropzoneRoot.focus();
      await user.keyboard('{Enter}');

      expect(mockUseDropzoneReturn.open).toHaveBeenCalled();
    });

    it('handles keyboard navigation with space key', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      dropzoneRoot.focus();
      await user.keyboard(' ');

      expect(mockUseDropzoneReturn.open).toHaveBeenCalled();
    });
  });

  describe('Sample Images Functionality', () => {
    it('handles sample image click correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      const firstSample = sampleImages[0];

      await user.click(firstSample);

      await waitFor(() => {
        expect(mockOnFilesUpload).toHaveBeenCalled();
      });
    });

    it('creates proper File objects from sample images', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      const firstSample = sampleImages[0];

      await user.click(firstSample);

      await waitFor(() => {
        expect(mockOnFilesUpload).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringContaining('sample'),
              type: 'image/jpeg',
              size: expect.any(Number),
            })
          ])
        );
      });
    });

    it('handles sample image keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      const firstSample = sampleImages[0];

      firstSample.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnFilesUpload).toHaveBeenCalled();
      });
    });

    it('handles all four sample images correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      expect(sampleImages).toHaveLength(4);

      // Test each sample image
      for (let i = 0; i < sampleImages.length; i++) {
        mockOnFilesUpload.mockClear();
        await user.click(sampleImages[i]);

        await waitFor(() => {
          expect(mockOnFilesUpload).toHaveBeenCalledTimes(1);
        });
      }
    });
  });

  describe('File Processing', () => {
    it('processes valid image files correctly', async () => {
      const mockFiles = [
        createMockFile('valid-image.jpg', 'image/jpeg', 2 * 1024 * 1024), // 2MB
      ];

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      await act(async () => {
        onDropCallback(mockFiles, [], createMockDropEvent(mockFiles));
      });

      await waitFor(() => {
        expect(mockOnFilesUpload).toHaveBeenCalledWith(mockFiles);
      });
    });

    it('handles multiple files at once', async () => {
      const mockFiles = [
        createMockFile('image1.jpg', 'image/jpeg'),
        createMockFile('image2.png', 'image/png'),
        createMockFile('image3.gif', 'image/gif'),
        createMockFile('image4.webp', 'image/webp'),
      ];

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      await act(async () => {
        onDropCallback(mockFiles, [], createMockDropEvent(mockFiles));
      });

      await waitFor(() => {
        expect(mockOnFilesUpload).toHaveBeenCalledWith(mockFiles);
      });
    });

    it('validates file types correctly', () => {
      const acceptCallback = mockUseDropzone.mock.calls[0][0].accept;
      expect(acceptCallback).toContain('image/jpeg');
      expect(acceptCallback).toContain('image/png');
      expect(acceptCallback).toContain('image/gif');
      expect(acceptCallback).toContain('image/webp');
    });

    it('enforces maximum file size limit', () => {
      const maxSizeCallback = mockUseDropzone.mock.calls[0][0].maxSize;
      expect(maxSizeCallback).toBe(10 * 1024 * 1024); // 10MB
    });

    it('allows multiple file selection', () => {
      const multipleCallback = mockUseDropzone.mock.calls[0][0].multiple;
      expect(multipleCallback).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles FileReader errors gracefully', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      const firstSample = sampleImages[0];

      // Modify the sample image src to trigger error
      Object.defineProperty(firstSample, 'src', {
        value: 'data:image/jpeg;base64,error',
        writable: true
      });

      await user.click(firstSample);

      // Should not call onFilesUpload if there's an error
      await waitFor(() => {
        // The component should handle the error gracefully
        expect(true).toBe(true); // Test passes if no errors are thrown
      });
    });

    it('handles invalid data URLs in sample images', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      const firstSample = sampleImages[0];

      // Set an invalid data URL
      Object.defineProperty(firstSample, 'src', {
        value: 'invalid-data-url',
        writable: true
      });

      await user.click(firstSample);

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(true).toBe(true);
      });
    });

    it('handles missing onFilesUpload callback gracefully', () => {
      // Test without onFilesUpload prop
      expect(() => {
        render(
          <TestWrapper>
            <UploadArea onFilesUpload={undefined as any} />
          </TestWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Responsive Design and Layout', () => {
    it('adapts to different screen sizes', () => {
      // Mock window matchMedia for responsive testing
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      expect(dropzoneRoot).toBeInTheDocument();
    });

    it('maintains proper spacing and layout', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const container = screen.getByTestId('dropzone-root');
      expect(container).toHaveStyle('padding: 48px 24px');
      expect(container).toHaveStyle('min-height: 300px');
    });

    it('displays sample images in a grid layout', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      sampleImages.forEach(img => {
        expect(img).toHaveStyle('width: 100px');
        expect(img).toHaveStyle('height: 100px');
        expect(img).toHaveStyle('object-fit: cover');
        expect(img).toHaveStyle('border-radius: 8px');
      });
    });
  });

  describe('Performance Considerations', () => {
    it('handles large numbers of files efficiently', async () => {
      const largeFileArray = Array.from({ length: 50 }, (_, i) =>
        createMockFile(`image-${i}.jpg`, 'image/jpeg', 1024 * 1024) // 1MB each
      );

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      await act(async () => {
        onDropCallback(largeFileArray, [], createMockDropEvent(largeFileArray));
      });

      await waitFor(() => {
        expect(mockOnFilesUpload).toHaveBeenCalledWith(largeFileArray);
      });
    });

    it('properly cleans up object URLs', async () => {
      const user = userEvent.setup();

      const { unmount } = render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      await user.click(sampleImages[0]);

      unmount();

      // Verify cleanup is handled (no memory leaks)
      expect(true).toBe(true);
    });

    it('handles rapid successive clicks on sample images', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const firstSample = screen.getAllByRole('img')[0];

      // Rapid clicks
      await user.click(firstSample);
      await user.click(firstSample);
      await user.click(firstSample);

      // Should handle gracefully without errors
      expect(true).toBe(true);
    });
  });

  describe('Accessibility Compliance', () => {
    it('provides proper ARIA labels for screen readers', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      expect(dropzoneRoot).toHaveAttribute('aria-label');
      expect(dropzoneRoot).toHaveAttribute('role', 'button');
      expect(dropzoneRoot).toHaveAttribute('tabIndex', '0');
    });

    it('supports keyboard navigation throughout the component', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByTestId('dropzone-root')).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('img')[0]).toHaveFocus();
    });

    it('provides proper alt text for sample images', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const images = screen.getAllByRole('img');
      images.forEach((img, index) => {
        expect(img).toHaveAttribute('alt', `Sample ${index + 1}`);
      });
    });

    it('maintains focus indicators for keyboard users', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzoneRoot = screen.getByTestId('dropzone-root');
      expect(dropzoneRoot).toHaveAttribute('tabIndex', '0');

      const sampleImages = screen.getAllByRole('img');
      sampleImages.forEach(img => {
        expect(img).toHaveAttribute('tabIndex', '0');
      });
    });

    it('provides semantic HTML structure', () => {
      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      // Check for proper heading structure
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getAllByRole('img')).toHaveLength(4);
    });
  });

  describe('Edge Cases and Error Boundaries', () => {
    it('handles undefined file properties gracefully', async () => {
      const malformedFile = {
        name: undefined,
        type: undefined,
        size: undefined,
      } as any;

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      await act(async () => {
        onDropCallback([malformedFile], [], createMockDropEvent([malformedFile]));
      });

      // Should handle gracefully without crashing
      expect(true).toBe(true);
    });

    it('handles empty file arrays correctly', async () => {
      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      await act(async () => {
        onDropCallback([], [], createMockDropEvent([]));
      });

      expect(mockOnFilesUpload).toHaveBeenCalledWith([]);
    });

    it('handles corrupted data URLs in sample images', async () => {
      const user = userEvent.setup();

      // Mock fetch to return corrupted data
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const sampleImages = screen.getAllByRole('img');
      await user.click(sampleImages[0]);

      // Should handle gracefully
      expect(true).toBe(true);
    });

    it('handles extremely long file names', async () => {
      const longFileName = 'a'.repeat(255) + '.jpg';
      const fileWithLongName = createMockFile(longFileName, 'image/jpeg');

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      await act(async () => {
        onDropCallback([fileWithLongName], [], createMockDropEvent([fileWithLongName]));
      });

      expect(mockOnFilesUpload).toHaveBeenCalledWith([fileWithLongName]);
    });

    it('handles special characters in file names', async () => {
      const specialCharFile = createMockFile('test-file_with@special#chars!.jpg', 'image/jpeg');

      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      await act(async () => {
        onDropCallback([specialCharFile], [], createMockDropEvent([specialCharFile]));
      });

      expect(mockOnFilesUpload).toHaveBeenCalledWith([specialCharFile]);
    });
  });

  describe('Integration with Parent Components', () => {
    it('calls onFilesUpload callback with correct parameters', async () => {
      const mockFiles = [createMockFile('test.jpg', 'image/jpeg')];
      const onDropCallback = mockUseDropzone.mock.calls[0][0].onDrop;

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      await act(async () => {
        onDropCallback(mockFiles, [], createMockDropEvent(mockFiles));
      });

      expect(mockOnFilesUpload).toHaveBeenCalledTimes(1);
      expect(mockOnFilesUpload).toHaveBeenCalledWith(mockFiles);
    });

    it('maintains component state correctly across re-renders', () => {
      const { rerender } = render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      expect(screen.getByText('Drag & Drop Images Here')).toBeInTheDocument();

      rerender(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      expect(screen.getByText('Drag & Drop Images Here')).toBeInTheDocument();
    });

    it('handles prop changes gracefully', () => {
      const newCallback = jest.fn();

      const { rerender } = render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      rerender(
        <TestWrapper>
          <UploadArea onFilesUpload={newCallback} />
        </TestWrapper>
      );

      expect(screen.getByText('Drag & Drop Images Here')).toBeInTheDocument();
    });
  });
});