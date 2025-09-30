# 🔍 Fake Checker

An AI-powered image authenticity detection tool that helps identify potentially manipulated or AI-generated images using advanced machine learning algorithms.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.0.1-646CFF?logo=vite)
![Material-UI](https://img.shields.io/badge/MUI-6.1.7-007FFF?logo=mui)

## ✨ Features

### 🤖 AI-Powered Detection
- **Advanced Analysis**: Leverages Hive AI's state-of-the-art machine learning models
- **Multi-Format Support**: Analyzes JPEG, PNG, WebP, and GIF images
- **Confidence Scoring**: Provides detailed confidence percentages for detection results
- **Real-time Processing**: Fast analysis with optimized image processing pipeline

### 🎨 Modern User Interface
- **Material Design**: Clean, intuitive interface built with Material-UI
- **Responsive Layout**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Themes**: Customizable theme system with automatic detection
- **Accessibility**: WCAG 2.1 AA compliant for inclusive user experience

### ♿ Accessibility Features
- **Keyboard Navigation**: Full functionality accessible via keyboard shortcuts
- **Screen Reader Support**: Comprehensive ARIA labels and semantic HTML
- **Skip Navigation**: Quick access to main content areas
- **Focus Management**: Enhanced focus indicators and logical tab order
- **Reduced Motion**: Respects user preferences for reduced animations
- **High Contrast**: Support for high contrast mode and customizable themes
- **Touch Targets**: Minimum 44px touch targets for mobile accessibility

### 📊 Comprehensive Analytics
- **Batch Processing**: Analyze multiple images simultaneously
- **Detailed Reports**: Export analysis results with confidence metrics
- **Image Management**: Organize, download, and share results
- **Processing History**: Track and review previous analyses

### 🛡️ Security & Privacy
- **Client-Side Processing**: Images processed locally when possible
- **Secure API Integration**: Encrypted communication with detection services
- **No Data Storage**: Images are not permanently stored on servers
- **Rate Limiting**: Protection against abuse with intelligent request throttling

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher (or **yarn** 1.22 or higher)
- **Hive AI API Key** (get yours at [thehive.ai](https://thehive.ai/api))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/fake-checker.git
   cd fake-checker
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Set up your API key**

   Edit `.env.local` and add your Hive AI API key:
   ```bash
   VITE_HIVE_API_KEY=your_actual_api_key_here
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:5173](http://localhost:5173)

## 📖 Usage Guide

### Basic Image Analysis

1. **Upload Images**
   - Drag and drop images onto the upload area
   - Or click to browse and select files
   - Supports multiple file selection

2. **View Results**
   - Analysis results appear with confidence percentages
   - Green indicators suggest authentic images
   - Red indicators suggest potential manipulation
   - Detailed breakdowns available for each image

3. **Manage Results**
   - Download original or processed images
   - Share results via social media or direct links
   - Export detailed analysis reports
   - Delete unwanted results

### Advanced Features

#### Batch Processing
```bash
# Upload multiple images at once
- Select up to 10 images (configurable)
- View progress for each analysis
- Compare results across images
```

#### Theme Customization
```bash
# Access theme settings via the settings page
- Choose between light and dark modes
- Automatic system theme detection
- Customize accent colors
```

#### API Integration
```javascript
// Example API usage (for developers)
import { aiDetectionService } from './services/aiDetectionService';

const result = await aiDetectionService.analyzeImage(file, {
  includeDetails: true,
  timeout: 30000
});
```

## 🛠️ Development

### Project Structure

```
fake-checker/
├── src/
│   ├── components/          # Reusable React components
│   │   ├── ErrorBoundary/   # Error handling component
│   │   ├── Header/          # Navigation header
│   │   ├── ImageGrid/       # Results display grid
│   │   ├── ThemeDemo/       # Theme preview component
│   │   └── UploadArea/      # File upload interface
│   ├── contexts/           # React context providers
│   │   ├── SearchContext.tsx
│   │   ├── SettingsContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/             # Custom React hooks
│   │   ├── useSearch.ts
│   │   ├── useSettings.ts
│   │   └── useTheme.ts
│   ├── pages/             # Main application pages
│   │   ├── AboutPage.tsx
│   │   ├── HelpPage.tsx
│   │   ├── HomePage.tsx
│   │   └── SettingsPage.tsx
│   ├── services/          # API and utility services
│   │   ├── aiDetectionService.ts
│   │   ├── errorHandler.ts
│   │   ├── imageProcessingService.ts
│   │   └── storageService.ts
│   ├── theme/             # Theme configuration
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── public/                # Static assets
├── tests/                 # Test files
└── docs/                  # Documentation
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:ui          # Open Vitest UI

# Quality Assurance
npm run type-check       # TypeScript type checking
npm run format           # Format code with Prettier
npm run analyze          # Bundle size analysis
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_HIVE_API_KEY` | Hive AI API key | - | ✅ |
| `VITE_API_BASE_URL` | API base URL | `https://api.thehive.ai/api/v2` | ❌ |
| `VITE_APP_TITLE` | Application title | `Fake Checker` | ❌ |
| `VITE_MAX_FILE_SIZE` | Max file size in bytes | `10485760` (10MB) | ❌ |
| `VITE_MAX_FILES` | Max files per batch | `10` | ❌ |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` | ❌ |

See [`.env.example`](./.env.example) for a complete list.

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test src/components/Header/Header.test.tsx
```

### Testing Philosophy

- **Unit Tests**: Individual components and utilities
- **Integration Tests**: Component interactions and workflows
- **E2E Tests**: Complete user journeys
- **Accessibility Tests**: WCAG compliance validation

### Coverage Goals

- **Statements**: ≥ 90%
- **Branches**: ≥ 85%
- **Functions**: ≥ 90%
- **Lines**: ≥ 90%

## 🚀 Deployment

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview the production build locally
npm run preview
```

### Deployment Platforms

#### Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables in Netlify dashboard

#### Vercel
1. Import project from GitHub
2. Vercel auto-detects Vite configuration
3. Add environment variables in project settings

#### GitHub Pages
```bash
# Deploy to GitHub Pages
npm run build
npm run deploy
```

### Environment-Specific Configurations

#### Production Checklist
- [ ] Set `VITE_NODE_ENV=production`
- [ ] Configure real API keys
- [ ] Enable error reporting
- [ ] Set up monitoring
- [ ] Configure CDN
- [ ] Enable compression

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests for new functionality**
5. **Run the test suite**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```
6. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
7. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Code Style

- **ESLint**: Enforced code quality rules
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking
- **Conventional Commits**: Structured commit messages

## 📋 API Documentation

### Hive AI Integration

The application integrates with Hive AI's detection services:

```typescript
interface DetectionResult {
  confidence: number;        // 0.0 to 1.0
  isAuthentic: boolean;     // true if likely authentic
  modelVersion: string;     // AI model version used
  processingTime: number;   // Analysis duration (ms)
  metadata: {
    imageSize: number;      // File size in bytes
    dimensions: {
      width: number;
      height: number;
    };
    format: string;         // Image format
  };
}
```

### Error Handling

```typescript
interface APIError {
  code: string;             // Error code
  message: string;          // Human-readable message
  details?: any;            // Additional error details
  timestamp: string;        // ISO timestamp
}
```

## 🐛 Troubleshooting

### Common Issues

#### API Key Issues
```bash
Error: Invalid API key
Solution: Verify your VITE_HIVE_API_KEY in .env.local
```

#### Large File Upload Issues
```bash
Error: File too large
Solution: Check VITE_MAX_FILE_SIZE setting
```

#### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/your-username/fake-checker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/fake-checker/discussions)
- **Email**: support@fake-checker.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hive AI** for providing advanced detection algorithms
- **Material-UI** for the beautiful component library
- **React Team** for the amazing framework
- **Vite** for the lightning-fast build tool
- **Open Source Community** for inspiration and contributions

## 🔗 Links

- **Live Demo**: [https://fake-checker.netlify.app](https://fake-checker.netlify.app)
- **Documentation**: [https://docs.fake-checker.com](https://docs.fake-checker.com)
- **API Documentation**: [https://api.fake-checker.com/docs](https://api.fake-checker.com/docs)
- **Support**: [https://support.fake-checker.com](https://support.fake-checker.com)

---

**Made with ❤️ by [Victor Williams](https://github.com/Vaporjawn)**
