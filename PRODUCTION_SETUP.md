# Production Deployment Configuration

## Required GitHub Secrets

For automated deployment, configure these secrets in your GitHub repository settings:

### API Configuration
- `HIVE_AI_API_KEY`: Your Hive AI API key from https://thehive.ai/api
- `VITE_API_BASE_URL`: API base URL (default: https://api.thehive.ai/api/v2)

### Netlify Deployment (if using Netlify)
- `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
- `NETLIFY_SITE_ID`: Your Netlify site ID

### Docker Hub (if using Docker deployment)
- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Your Docker Hub access token

### Optional Services
- `VITE_ERROR_REPORTING_KEY`: For error monitoring (Sentry)
- `VITE_ANALYTICS_ID`: For analytics (Google Analytics)
- `VITE_APP_INSIGHTS_CONNECTION_STRING`: For Azure Application Insights

## Environment Variable Setup

### For Netlify
Add these build environment variables in your Netlify dashboard:

```bash
VITE_HIVE_API_KEY=your_actual_api_key
VITE_API_BASE_URL=https://api.thehive.ai/api/v2
VITE_APP_TITLE=Fake Checker
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_DEBUG_MODE=false
VITE_MAX_FILE_SIZE=10485760
VITE_RATE_LIMIT_REQUESTS=100
```

### For Vercel
Create `vercel.json` with environment variables:

```json
{
  "env": {
    "VITE_HIVE_API_KEY": "@hive-ai-api-key",
    "VITE_API_BASE_URL": "https://api.thehive.ai/api/v2",
    "VITE_APP_TITLE": "Fake Checker",
    "VITE_NODE_ENV": "production"
  }
}
```

### For Docker Deployment
Use environment file or docker-compose with secrets:

```yaml
version: '3.8'
services:
  fake-checker:
    image: fake-checker:latest
    environment:
      - VITE_HIVE_API_KEY=${HIVE_AI_API_KEY}
      - VITE_API_BASE_URL=https://api.thehive.ai/api/v2
      - VITE_NODE_ENV=production
    ports:
      - "80:80"
```

## API Key Setup Instructions

### 1. Get Hive AI API Key
1. Visit https://thehive.ai/api
2. Create an account or sign in
3. Navigate to the API section
4. Generate a new API key
5. Note the rate limits and pricing

### 2. Configure Rate Limiting
- Free tier: ~1000 requests per month
- Paid plans: Higher limits available
- Monitor usage to avoid overage charges

### 3. Security Best Practices
- Use different API keys for development/staging/production
- Rotate API keys regularly (monthly recommended)
- Monitor API usage and set alerts
- Never expose API keys in client-side code (Vite handles this securely)

## Production Build Verification

### Test Production Build Locally
```bash
# Install dependencies
npm install

# Create local environment file
cp .env.example .env.local
# Edit .env.local with your API key

# Build for production
npm run build

# Serve production build locally
npm run preview
# Test at http://localhost:4173
```

### Verify Environment Variables
```bash
# Check if build includes correct environment variables
grep -r "VITE_" dist/assets/index-*.js
# Should show processed environment variables
```

### Test API Integration
1. Upload a test image
2. Verify API calls in browser DevTools
3. Check for proper error handling
4. Test offline functionality
5. Verify PWA installation

## Deployment Checklist

### Pre-Deployment
- [ ] API key configured and tested
- [ ] Environment variables set
- [ ] Production build tested locally
- [ ] All tests passing
- [ ] Security headers configured
- [ ] Performance optimized

### Post-Deployment
- [ ] API integration working
- [ ] PWA installation available
- [ ] Offline mode functional
- [ ] Error reporting configured
- [ ] Analytics tracking active
- [ ] Performance monitoring setup

### Monitoring
- [ ] API usage monitoring
- [ ] Error rate monitoring
- [ ] Performance metrics
- [ ] User engagement analytics
- [ ] Security incident monitoring

## Troubleshooting

### Common Issues
1. **API Key Not Working**: Check key validity and rate limits
2. **Build Errors**: Verify all environment variables are set
3. **Runtime Errors**: Check browser console and error reporting
4. **Performance Issues**: Monitor bundle size and lazy loading

### Debug Commands
```bash
# Check environment variables in build
npm run build && grep -r "VITE_" dist/

# Test API connectivity
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.thehive.ai/api/v2/task/sync

# Check service worker
# Open DevTools > Application > Service Workers
```

### Support Resources
- Hive AI Documentation: https://docs.thehive.ai/
- Netlify Docs: https://docs.netlify.com/
- Vite Production Guide: https://vitejs.dev/guide/build.html