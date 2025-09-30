// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Mock HTML Canvas API
class MockCanvas {
  getContext() {
    return {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
      setTransform: jest.fn(),
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      translate: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      font: '10px sans-serif',
      textAlign: 'start' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
      globalAlpha: 1.0
    };
  }

  toDataURL() {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string) {
    const mockBlob = new Blob(['mock image data'], { type: type || 'image/png' });
    // Use setTimeout to simulate async behavior but make it fast
    setTimeout(() => callback(mockBlob), 0);
  }

  getBoundingClientRect() {
    return { top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600 };
  }

  width = 800;
  height = 600;
}

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => new MockCanvas().getContext()),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: jest.fn(() => new MockCanvas().toDataURL()),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: jest.fn((callback: (blob: Blob | null) => void, type?: string) => {
    new MockCanvas().toBlob(callback, type);
  }),
});

// Mock Image constructor
class MockImage {
  onload: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;
  width = 800;
  height = 600;
  complete = false;
  src = '';

  constructor() {
    // Simulate image loading completion after a short delay
    setTimeout(() => {
      this.complete = true;
      if (this.onload) {
        this.onload(new Event('load'));
      }
    }, 10);
  }
}

// Replace the global Image constructor
// @ts-expect-error - Overriding global for testing
globalThis.Image = MockImage;

// Mock FileReader
class MockFileReader {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
  result: string | ArrayBuffer | null = null;
  readyState = 0;
  error: DOMException | null = null;

  readAsDataURL() {
    // Simulate reading a file
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A8A8A8A8A8A8A8A8A8A8A8A8A8A8A8A=';
      this.readyState = 2;
      if (this.onload) {
        const event = new ProgressEvent('load');
        Object.defineProperty(event, 'target', { value: this, writable: false });
        this.onload(event as ProgressEvent<FileReader>);
      }
    }, 10);
  }

  abort() {
    // Mock abort method
  }

  addEventListener() {
    // Mock addEventListener
  }

  removeEventListener() {
    // Mock removeEventListener
  }

  dispatchEvent() {
    return true;
  }
}

// Replace the global FileReader constructor
// @ts-expect-error - Overriding global for testing
globalThis.FileReader = MockFileReader;

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'blob:mock-object-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn(),
});

// Mock fetch if not already mocked
if (!globalThis.fetch) {
  globalThis.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
      blob: () => Promise.resolve(new Blob()),
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
    } as Response)
  );
}

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

globalThis.ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}

// @ts-expect-error - Overriding global for testing
globalThis.IntersectionObserver = MockIntersectionObserver;