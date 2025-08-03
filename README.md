# AI Menu Generator

Transform menu images into visual dish representations using AI-powered OCR and image generation.

## Project Structure

```
ai-menu-generator/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── types/     # TypeScript type definitions
│   │   ├── App.tsx    # Main application component
│   │   └── index.tsx  # Application entry point
│   ├── public/        # Static assets
│   └── package.json   # Frontend dependencies
├── backend/           # Node.js/Express backend API
│   ├── src/
│   │   ├── types/     # Shared type definitions
│   │   ├── interfaces/ # Service interfaces
│   │   └── server.ts  # API server entry point
│   └── package.json   # Backend dependencies
└── .kiro/specs/       # Feature specifications
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

### Development

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The frontend will be available at `http://localhost:3000` and the backend API at `http://localhost:3001`.

## Features

- **Image Upload**: Drag-and-drop interface for menu image uploads
- **OCR Processing**: Extract text from menu images using AI
- **Menu Parsing**: Identify individual dishes, descriptions, and prices
- **Image Generation**: Generate realistic dish images using AI
- **Results Display**: Grid layout with zoom and sharing capabilities
- **Error Handling**: Graceful error recovery and user feedback

## API Documentation

The backend includes comprehensive API documentation with Swagger/OpenAPI:

- **Interactive Documentation**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **OpenAPI JSON**: [http://localhost:3001/api-docs.json](http://localhost:3001/api-docs.json)

### Key Endpoints

- `POST /api/upload` - Upload menu image
- `POST /api/process` - Start menu processing
- `GET /api/status/:sessionId` - Get processing status
- `GET /api/results/:sessionId` - Retrieve results
- `POST /api/regenerate` - Regenerate specific dish images
- `GET /api/health` - System health check
- `GET /api/health/dashboard` - Monitoring dashboard data

### API Features

- **Interactive Testing**: Test all endpoints directly from the browser
- **Comprehensive Documentation**: Detailed request/response schemas
- **Error Handling**: Standardized error responses with troubleshooting
- **Health Monitoring**: Real-time system health and performance metrics
- **Type Safety**: Full TypeScript support with generated types

## Development Status

This project is currently in development. The basic project structure and core interfaces have been established. See `.kiro/specs/ai-menu-generator/tasks.md` for the implementation roadmap.