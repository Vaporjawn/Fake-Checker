// Mock Vite's import.meta for Jest environment
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_HIVE_API_KEY: 'test-api-key',
        VITE_APP_NAME: 'Fake Checker',
        NODE_ENV: 'test',
        DEV: false,
        PROD: false,
        MODE: 'test'
      }
    }
  }
});

// Mock URL constructor for Jest environment
global.URL = URL;

// Mock URL.createObjectURL and URL.revokeObjectURL for file handling
// URL constructor and object URL mocks
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Fetch API mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob(['mock-file-data'], { type: 'image/jpeg' })),
    json: () => Promise.resolve({}),
  } as Response)
);

// Mock matchMedia for Material-UI components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});