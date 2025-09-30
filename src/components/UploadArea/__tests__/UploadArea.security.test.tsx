import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UploadArea from '../UploadArea';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const mockTheme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={mockTheme}>
    {children}
  </ThemeProvider>
);

describe('UploadArea Security Tests', () => {
  const mockOnFilesUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('File Type Validation', () => {
    it('should reject executable files', async () => {
      const maliciousFile = new File(['fake content'], 'malware.exe', {
        type: 'application/octet-stream'
      });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate file drop with malicious file
      Object.defineProperty(input, 'files', {
        value: [maliciousFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/please upload only image files/i)).toBeInTheDocument();
      });
      expect(mockOnFilesUpload).not.toHaveBeenCalled();
    });

    it('should reject script files with image extensions', async () => {
      const scriptFile = new File(['<script>alert("xss")</script>'], 'fake-image.jpg', {
        type: 'text/html'
      });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [scriptFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/please upload only image files/i)).toBeInTheDocument();
      });
      expect(mockOnFilesUpload).not.toHaveBeenCalled();
    });

    it('should accept valid image files', async () => {
      // Create valid image file data
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx!.fillStyle = 'red';
      ctx!.fillRect(0, 0, 100, 100);

      // Convert to blob and create file
      canvas.toBlob((blob) => {
        const validImageFile = new File([blob!], 'test-image.jpg', {
          type: 'image/jpeg'
        });

        render(
          <TestWrapper>
            <UploadArea onFilesUpload={mockOnFilesUpload} />
          </TestWrapper>
        );

        const dropzone = screen.getByRole('button');
        const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(input, 'files', {
          value: [validImageFile],
          writable: false,
        });

        fireEvent.change(input);

        expect(mockOnFilesUpload).toHaveBeenCalledWith([validImageFile]);
      }, 'image/jpeg');
    });
  });

  describe('File Size Validation', () => {
    it('should reject files larger than 10MB', async () => {
      // Create a file larger than 10MB
      const largeContent = new ArrayBuffer(11 * 1024 * 1024); // 11MB
      const largeFile = new File([largeContent], 'large-image.jpg', {
        type: 'image/jpeg'
      });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/file size must be less than 10mb/i)).toBeInTheDocument();
      });
      expect(mockOnFilesUpload).not.toHaveBeenCalled();
    });

    it('should accept files within size limit', async () => {
      // Create a file within size limit (1MB)
      const validContent = new ArrayBuffer(1024 * 1024); // 1MB
      const validFile = new File([validContent], 'valid-image.jpg', {
        type: 'image/jpeg'
      });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [validFile],
        writable: false,
      });

      fireEvent.change(input);

      expect(mockOnFilesUpload).toHaveBeenCalledWith([validFile]);
    });
  });

  describe('Multiple File Security', () => {
    it('should validate all files in multiple upload', async () => {
      const validFile = new File(['valid'], 'image.jpg', { type: 'image/jpeg' });
      const invalidFile = new File(['invalid'], 'script.js', { type: 'text/javascript' });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [validFile, invalidFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/please upload only image files/i)).toBeInTheDocument();
      });
      expect(mockOnFilesUpload).not.toHaveBeenCalled();
    });

    it('should accept multiple valid image files', async () => {
      const file1 = new File(['content1'], 'image1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'image2.png', { type: 'image/png' });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [file1, file2],
        writable: false,
      });

      fireEvent.change(input);

      expect(mockOnFilesUpload).toHaveBeenCalledWith([file1, file2]);
    });
  });

  describe('File Name Security', () => {
    it('should handle files with suspicious names', async () => {
      const suspiciousFiles = [
        new File(['content'], '../../../etc/passwd.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'test<script>alert(1)</script>.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'test"onload="alert(1)".jpg', { type: 'image/jpeg' }),
        new File(['content'], 'CON.jpg', { type: 'image/jpeg' }), // Windows reserved name
        new File(['content'], 'test\x00.jpg', { type: 'image/jpeg' }), // Null byte
      ];

      for (const suspiciousFile of suspiciousFiles) {
        render(
          <TestWrapper>
            <UploadArea onFilesUpload={mockOnFilesUpload} />
          </TestWrapper>
        );

        const dropzone = screen.getByRole('button');
        const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(input, 'files', {
          value: [suspiciousFile],
          writable: false,
        });

        fireEvent.change(input);

        // Should still accept the file if MIME type is valid
        expect(mockOnFilesUpload).toHaveBeenCalledWith([suspiciousFile]);

        jest.clearAllMocks();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty file', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [emptyFile],
        writable: false,
      });

      fireEvent.change(input);

      expect(mockOnFilesUpload).toHaveBeenCalledWith([emptyFile]);
    });

    it('should handle file with no extension', async () => {
      const noExtFile = new File(['content'], 'imagefile', { type: 'image/jpeg' });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [noExtFile],
        writable: false,
      });

      fireEvent.change(input);

      expect(mockOnFilesUpload).toHaveBeenCalledWith([noExtFile]);
    });
  });

  describe('Content Type Spoofing', () => {
    it('should rely on MIME type validation', async () => {
      // Test file with wrong extension but correct MIME type
      const validMimeFile = new File(['image content'], 'image.txt', { type: 'image/jpeg' });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [validMimeFile],
        writable: false,
      });

      fireEvent.change(input);

      expect(mockOnFilesUpload).toHaveBeenCalledWith([validMimeFile]);
    });

    it('should reject file with image extension but invalid MIME type', async () => {
      const spoofedFile = new File(['malicious content'], 'image.jpg', { type: 'text/plain' });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      Object.defineProperty(input, 'files', {
        value: [spoofedFile],
        writable: false,
      });

      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByText(/please upload only image files/i)).toBeInTheDocument();
      });
      expect(mockOnFilesUpload).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Simulation', () => {
    it('should handle rapid successive uploads gracefully', async () => {
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      render(
        <TestWrapper>
          <UploadArea onFilesUpload={mockOnFilesUpload} />
        </TestWrapper>
      );

      const dropzone = screen.getByRole('button');
      const input = dropzone.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate rapid uploads
      for (let i = 0; i < 10; i++) {
        Object.defineProperty(input, 'files', {
          value: [validFile],
          writable: false,
        });

        fireEvent.change(input);
      }

      // Should handle all uploads (client-side rate limiting is handled elsewhere)
      expect(mockOnFilesUpload).toHaveBeenCalledTimes(10);
    });
  });
});