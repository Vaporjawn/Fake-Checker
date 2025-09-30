# Fake Checker - Deployment Guide

## Quick Deployment Options

### 1. Netlify (Recommended for Static Hosting)

#### Prerequisites
- GitHub account
- Netlify account

#### Steps
1. Fork this repository
2. Connect your GitHub to Netlify
3. Deploy from GitHub:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Environment variables: Set `VITE_HIVE_AI_API_KEY`

#### Environment Variables for Netlify
```
VITE_HIVE_AI_API_KEY=your_hive_ai_key_here
VITE_API_BASE_URL=https://api.thehive.ai/api/v2
VITE_APP_TITLE=Fake Checker
```

### 2. Vercel Deployment

#### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/fake-checker)

#### Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_HIVE_AI_API_KEY production
```

### 3. Docker Deployment

#### Local Docker Build
```bash
# Build the image
npm run docker:build

# Run the container
npm run docker:run

# Access at http://localhost:8080
```

#### Docker Compose
```yaml
version: '3.8'
services:
  fake-checker:
    build: .
    ports:
      - "8080:80"
    environment:
      - VITE_HIVE_AI_API_KEY=your_key_here
    restart: unless-stopped
```

### 4. GitHub Pages (Static Only)

```bash
# Install gh-pages
npm install --save-dev gh-pages

# Add to package.json scripts:
"deploy": "gh-pages -d dist"

# Build and deploy
npm run build
npm run deploy
```

## Production Configuration

### Environment Variables Required

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_HIVE_AI_API_KEY` | Your Hive AI API key | Yes |
| `VITE_API_BASE_URL` | API base URL (default: https://api.thehive.ai/api/v2) | No |
| `VITE_APP_TITLE` | Application title | No |
| `VITE_MAX_FILE_SIZE` | Max file size in bytes (default: 10MB) | No |

### Performance Optimizations

The build includes:
- **Code Splitting**: Automatic vendor and component splitting
- **Asset Optimization**: Compressed images and fonts
- **Bundle Analysis**: Use `npm run analyze` to check bundle size
- **Tree Shaking**: Unused code elimination
- **Minification**: ES6+ and CSS minification

### Security Headers

The nginx configuration includes:
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content Security Policy headers
- Referrer Policy controls

## CI/CD Pipeline

### GitHub Actions Workflow

The included workflow (`.github/workflows/deploy.yml`) provides:

1. **Testing Pipeline**:
   - Linting with ESLint
   - Type checking with TypeScript
   - Unit tests with Jest
   - Coverage reporting

2. **Build Pipeline**:
   - Production build
   - Deployment to Netlify
   - Docker image creation

3. **Quality Gates**:
   - Tests must pass
   - Linting must pass
   - Type checking must pass

### Required GitHub Secrets

Add these secrets to your GitHub repository:

```
HIVE_AI_API_KEY=your_hive_ai_api_key
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_netlify_site_id
DOCKERHUB_USERNAME=your_docker_username
DOCKERHUB_TOKEN=your_docker_access_token
```

## Monitoring and Analytics

### Error Tracking
- Built-in error boundary components
- Console error tracking in production
- Service worker error handling

### Performance Monitoring
```javascript
// Add to main.tsx for performance monitoring
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart);
  });
}
```

### Analytics Integration
```javascript
// Google Analytics (optional)
// Add to index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Ensure `VITE_HIVE_AI_API_KEY` is set
   - Check API key validity
   - Verify environment variable format

2. **Build Failures**
   - Run `npm run type-check` to identify TypeScript errors
   - Check `npm run lint` for code quality issues
   - Ensure all dependencies are installed

3. **Runtime Errors**
   - Check browser console for errors
   - Verify API endpoints are accessible
   - Check CORS configuration

### Development vs Production

| Environment | Build Command | Serve Command | URL |
|-------------|---------------|---------------|-----|
| Development | `npm run dev` | - | http://localhost:5173 |
| Preview | `npm run build` | `npm run preview` | http://localhost:4173 |
| Production | `npm run build` | Deploy `dist/` | Your domain |

### Health Checks

Add these endpoints for monitoring:

```javascript
// Health check endpoint (if using a server)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});
```

## Support

For deployment issues:
1. Check the [deployment troubleshooting guide](TROUBLESHOOTING.md)
2. Review GitHub Actions logs
3. Check platform-specific documentation (Netlify, Vercel, etc.)
4. Open an issue in the repository