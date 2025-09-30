import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { compression } from 'vite-plugin-compression2'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'

  return {
  plugins: [
    // React plugin with optimizations
    react({
      // Babel config for production optimizations
      babel: isProduction ? {
        plugins: [
          // Remove PropTypes in production
          ['babel-plugin-transform-react-remove-prop-types', { removeImport: true }],
        ]
      } : undefined,
    }),

    // Progressive Web App functionality
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        globIgnores: ['**/bundle-analysis.html'],
        maximumFileSizeToCacheInBytes: 5000000, // 5MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.thehive\.ai\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },

            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Fake Checker',
        short_name: 'FakeCheck',
        description: 'AI-powered image authenticity detection',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),

    // Bundle analyzer (only in production)
    isProduction && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // 'sunburst', 'treemap', 'network'
    }),

    // Gzip and Brotli compression
    isProduction && compression({
      algorithms: ['gzip'],
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),

    isProduction && compression({
      algorithms: ['brotliCompress'],
      exclude: [/\.(br)$/, /\.(gz)$/],
    }),
  ].filter(Boolean),

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@services': resolve(__dirname, 'src/services'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@contexts': resolve(__dirname, 'src/contexts'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },

  // Build optimizations
  build: {
    // Output directory
    outDir: 'dist',

    // Generate sourcemaps for production debugging
    sourcemap: false,

    // Minification
    minify: 'esbuild',

    // Rollup options for advanced bundling
    rollupOptions: {
      output: {
        // Improved manual chunk splitting for better caching and loading
        manualChunks: (id: string) => {
          // React core chunk (highest priority)
          if (id.includes('react') && !id.includes('react-router') && !id.includes('react-dropzone')) {
            return 'vendor-react';
          }

          // Material-UI core components
          if (id.includes('@mui/material') || id.includes('@emotion')) {
            return 'vendor-mui';
          }

          // Material-UI icons (separate chunk - lazy loaded)
          if (id.includes('@mui/icons-material')) {
            return 'vendor-mui-icons';
          }

          // Router and navigation
          if (id.includes('react-router')) {
            return 'vendor-router';
          }

          // File handling libraries
          if (id.includes('react-dropzone') || id.includes('file-')) {
            return 'vendor-file-handling';
          }

          // Core services (always needed)
          if (id.includes('/services/aiDetectionService') || id.includes('/services/errorHandler')) {
            return 'services-core';
          }

          // Advanced features (lazy loaded)
          if (id.includes('/services/advancedFeatures') || id.includes('/components/AdvancedFeatures')) {
            return 'features-advanced';
          }

          // Other services
          if (id.includes('/services/')) {
            return 'services';
          }

          // Core components (always loaded)
          if (id.includes('/components/Header') || id.includes('/components/UploadArea') || id.includes('/components/ErrorBoundary')) {
            return 'components-core';
          }

          // Image grid and related components
          if (id.includes('/components/ImageGrid') || id.includes('/components/ThemeDemo')) {
            return 'components-image';
          }

          // Other components
          if (id.includes('/components/')) {
            return 'components';
          }

          // Context providers
          if (id.includes('/contexts/')) {
            return 'contexts';
          }

          // Utilities and hooks
          if (id.includes('/utils/') || id.includes('/hooks/')) {
            return 'utils';
          }

          // Other vendor libraries
          if (id.includes('node_modules')) {
            return 'vendor-misc';
          }
        },

        // Asset file naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') ?? [];
          let extType = info[info.length - 1];

          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType ?? '')) {
            extType = 'img';
          } else if (/woff|woff2/.test(extType ?? '')) {
            extType = 'css';
          }

          return `assets/${extType}/[name]-[hash][extname]`;
        },

        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },

    // Asset optimization
    assetsDir: 'assets',

    // Chunk size warning limit (increase for large apps)
    chunkSizeWarningLimit: 1000,
  },

  // Development server configuration
  server: {
    port: 5173,
    host: true, // Listen on all addresses
    open: true, // Open browser on start
    cors: true,

    // Security headers for development
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    },

    // Proxy configuration for API calls if needed
    proxy: {
      '/api': {
        target: 'https://api.thehive.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // Preview server configuration (for production preview)
  preview: {
    port: 4173,
    host: true,
    open: true,
  },

  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  // Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material',
      'react-router-dom',
    ],
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
  }
})
