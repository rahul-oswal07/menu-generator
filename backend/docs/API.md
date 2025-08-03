# AI Menu Generator API Documentation

## Overview

The AI Menu Generator API provides endpoints for uploading menu images, processing them through OCR, and generating AI-powered dish images. The API is built with Express.js and TypeScript, featuring comprehensive error handling, health monitoring, and interactive documentation.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://api.aimenugen.com`

## Interactive Documentation

The API includes interactive Swagger documentation that allows you to test endpoints directly from your browser:

- **Swagger UI**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **OpenAPI JSON**: [http://localhost:3001/api-docs.json](http://localhost:3001/api-docs.json)

## Quick Start

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Open Swagger UI**:
   Navigate to [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

3. **Test the API**:
   Use the interactive interface to upload a menu image and process it.

## API Endpoints Overview

### Upload
- `POST /api/upload` - Upload a menu image for processing
- `GET /api/upload/{sessionId}/status` - Check upload status

### Processing
- `POST /api/process` - Start menu processing with OCR and AI image generation
- `GET /api/status/{sessionId}` - Get processing status and progress
- `POST /api/regenerate` - Regenerate AI images for specific menu items

### Results
- `GET /api/results/{sessionId}` - Get complete processing results
- `GET /api/results/{sessionId}/status` - Alternative status endpoint

### Health & Monitoring
- `GET /api/health` - Quick health check for load balancers
- `GET /api/health/detailed` - Comprehensive system health information
- `GET /api/health/dashboard` - Aggregated health and metrics data
- `GET /api/health/metrics` - Performance metrics
- `GET /api/health/ready` - Kubernetes readiness probe
- `GET /api/health/live` - Kubernetes liveness probe

### Error Reporting
- `POST /api/errors/client` - Report client-side errors for monitoring
- `GET /api/errors/stats` - Get error statistics

## Authentication

Currently, the API does not require authentication. All endpoints are publicly accessible.

## Rate Limiting

The API implements intelligent rate limiting to prevent abuse while allowing legitimate usage patterns.

## Error Handling

The API uses standardized error responses with the following structure:

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    // Additional error context (optional)
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid request parameters
- `FILE_TOO_LARGE` - Uploaded file exceeds size limit
- `INVALID_FILE_TYPE` - Unsupported file format
- `SESSION_NOT_FOUND` - Invalid or expired session ID
- `PROCESSING_ERROR` - Error during menu processing
- `RATE_LIMIT_ERROR` - Too many requests
- `INTERNAL_ERROR` - Unexpected server error

## File Upload Requirements

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WEBP (.webp)

### File Size Limits
- Maximum file size: 10MB
- Recommended size: 1-5MB for optimal processing speed

### Image Quality Guidelines
- High resolution (minimum 800x600 pixels)
- Clear, well-lit images
- Minimal shadows or glare
- Text should be clearly readable

## Processing Pipeline

1. **Upload**: Menu image is uploaded and stored securely
2. **Preprocessing**: Image is optimized for OCR processing
3. **OCR Extraction**: Text is extracted from the menu image
4. **Menu Parsing**: Extracted text is parsed into structured menu items
5. **AI Image Generation**: Dish images are generated using AI
6. **Results**: Complete results are made available via API

## Response Times

- **Upload**: < 2 seconds
- **OCR Processing**: 5-15 seconds
- **AI Image Generation**: 10-30 seconds per dish
- **Total Processing**: 30-120 seconds (depending on menu complexity)

## Monitoring and Health Checks

The API includes comprehensive health monitoring:

- **System Health**: Database, filesystem, and external service checks
- **Performance Metrics**: Memory usage, request statistics, error rates
- **Real-time Monitoring**: Live dashboard with auto-refresh
- **Alerting**: Configurable alerts for critical issues

## Development

### Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# API Keys (optional)
OPENAI_API_KEY=your_openai_api_key

# Monitoring (optional)
ERROR_ALERTS_ENABLED=true
ERROR_WEBHOOK_URL=your_webhook_url
LOG_LEVEL=info
```

## Support

For API support and questions:
- **Documentation**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **Health Status**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **Email**: support@aimenugen.com

## Version History

- **v1.0.0** - Initial release with core functionality
  - Menu image upload and processing
  - OCR text extraction
  - AI image generation
  - Comprehensive error handling
  - Health monitoring and metrics
  - Interactive API documentation