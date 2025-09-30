# Security Configuration for Production Deployment

This document provides security configurations for deploying Fake Checker in production environments.

## Content Security Policy (CSP)

Add these CSP headers to your web server configuration:

### Netlify (_headers file)
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.thehive.ai https://*.thehive.ai; worker-src 'self'; manifest-src 'self'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Vercel (vercel.json)
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.thehive.ai https://*.thehive.ai; worker-src 'self'; manifest-src 'self'"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

### Apache (.htaccess)
```apache
<IfModule mod_headers.c>
  Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.thehive.ai https://*.thehive.ai; worker-src 'self'; manifest-src 'self'"
  Header always set X-Content-Type-Options nosniff
  Header always set X-Frame-Options DENY
  Header always set X-XSS-Protection "1; mode=block"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
</IfModule>
```

### Nginx
```nginx
location / {
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://api.thehive.ai https://*.thehive.ai; worker-src 'self'; manifest-src 'self'" always;
  add_header X-Content-Type-Options nosniff always;
  add_header X-Frame-Options DENY always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

## File Upload Security

### Current Security Measures

1. **File Type Validation**: Only image files (JPEG, PNG, WebP, GIF, BMP, TIFF) are accepted
2. **File Size Limits**: Maximum 10MB per file, configurable via environment variables
3. **MIME Type Checking**: Server validates actual file content, not just extensions
4. **Content Sanitization**: Files are processed through Canvas API for additional validation

### Additional Recommendations

1. **Virus Scanning**: Implement virus scanning for uploaded files in production
2. **File Storage**: Store uploaded files outside the web root directory
3. **Temporary Files**: Clean up temporary files after processing
4. **Rate Limiting**: Implement upload rate limiting per IP address

## API Security

### Rate Limiting Configuration

The application implements client-side rate limiting for API calls:

- **Hive AI API**: 10 requests per minute per user
- **Backoff Strategy**: Exponential backoff with jitter
- **Circuit Breaker**: Automatic failure handling

### API Key Security

- Environment variables are used for API keys
- Keys are not exposed in client-side code
- Consider using server-side proxy for additional security

## Input Validation and Sanitization

### Current Implementation

1. **File Input Validation**:
   - File type checking via MIME types
   - File size validation
   - Canvas-based content validation

2. **User Input Sanitization**:
   - All user inputs are validated before processing
   - No direct DOM manipulation with user content
   - React's built-in XSS protection

### Security Testing Checklist

- [ ] File upload with malicious content (test with EICAR test file)
- [ ] Large file upload attempts (>10MB)
- [ ] Invalid MIME type uploads
- [ ] XSS attempts through filename inputs
- [ ] CSRF token validation (if applicable)
- [ ] Rate limiting functionality
- [ ] CSP header effectiveness
- [ ] HTTPS enforcement
- [ ] Secure cookie settings (if using authentication)

## Monitoring and Logging

### Security Event Logging

The application logs security-relevant events:

1. **File Upload Attempts**: Success/failure, file types, sizes
2. **API Rate Limiting**: Exceeded limits, blocked requests
3. **Error Conditions**: Validation failures, processing errors

### Recommended Monitoring

1. **Failed Upload Attempts**: Monitor for patterns indicating attacks
2. **API Abuse**: Track excessive API usage patterns
3. **Error Rates**: Monitor for unusual error patterns
4. **Performance Metrics**: Track response times for security impacts

## Security Updates and Maintenance

### Dependency Management

- Regularly update npm dependencies
- Use `npm audit` to check for vulnerabilities
- Implement automated security scanning in CI/CD

### Security Headers Testing

Use tools like:
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [OWASP ZAP](https://www.zaproxy.org/)

### Regular Security Reviews

1. **Quarterly**: Review and update CSP policies
2. **Monthly**: Check for dependency vulnerabilities
3. **Weekly**: Review security logs for anomalies
4. **Daily**: Monitor error rates and failed requests

## Incident Response

### Security Incident Handling

1. **Detection**: Automated monitoring alerts
2. **Analysis**: Log analysis and impact assessment
3. **Containment**: Immediate threat mitigation
4. **Recovery**: System restoration and monitoring
5. **Lessons Learned**: Post-incident review and improvements

### Contact Information

Maintain security contact information for:
- Security team/administrator
- Hosting provider security contacts
- External security consultants (if applicable)