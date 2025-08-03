"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'AI Menu Generator API',
        version: '1.0.0',
        description: 'API for transforming menu images into visual dish representations using OCR and AI image generation',
        contact: {
            name: 'AI Menu Generator Team',
            email: 'support@aimenugen.com'
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
        }
    },
    servers: [
        {
            url: process.env.API_BASE_URL || 'http://localhost:3001',
            description: 'Development server'
        },
        {
            url: 'https://api.aimenugen.com',
            description: 'Production server'
        }
    ],
    components: {
        schemas: {
            ApiResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        description: 'Indicates if the request was successful'
                    },
                    data: {
                        type: 'object',
                        description: 'Response data (varies by endpoint)'
                    },
                    error: {
                        type: 'string',
                        description: 'Error code if request failed'
                    },
                    message: {
                        type: 'string',
                        description: 'Human-readable message'
                    }
                },
                required: ['success']
            },
            MenuItem: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Unique identifier for the menu item'
                    },
                    name: {
                        type: 'string',
                        description: 'Name of the dish'
                    },
                    description: {
                        type: 'string',
                        description: 'Description of the dish'
                    },
                    price: {
                        type: 'string',
                        description: 'Price of the dish'
                    },
                    category: {
                        type: 'string',
                        description: 'Category of the dish (e.g., appetizer, main course)'
                    },
                    isManuallyEdited: {
                        type: 'boolean',
                        description: 'Whether the item was manually edited by the user'
                    }
                },
                required: ['id', 'name']
            },
            GeneratedImage: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        format: 'uri',
                        description: 'URL of the generated image'
                    },
                    menuItemId: {
                        type: 'string',
                        description: 'ID of the associated menu item'
                    },
                    status: {
                        type: 'string',
                        enum: ['success', 'failed'],
                        description: 'Status of image generation'
                    },
                    errorMessage: {
                        type: 'string',
                        description: 'Error message if generation failed'
                    }
                },
                required: ['url', 'menuItemId', 'status']
            },
            ProcessingResult: {
                type: 'object',
                properties: {
                    originalImage: {
                        type: 'string',
                        format: 'uri',
                        description: 'URL of the original uploaded image'
                    },
                    extractedItems: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/MenuItem'
                        },
                        description: 'Menu items extracted from the image'
                    },
                    generatedImages: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/GeneratedImage'
                        },
                        description: 'Generated images for the menu items'
                    },
                    processingStatus: {
                        type: 'string',
                        enum: ['uploading', 'processing', 'completed', 'failed'],
                        description: 'Current processing status'
                    }
                },
                required: ['originalImage', 'extractedItems', 'generatedImages', 'processingStatus']
            },
            ProcessingStatusResponse: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Session identifier'
                    },
                    status: {
                        type: 'string',
                        enum: ['uploading', 'processing', 'completed', 'failed'],
                        description: 'Current processing status'
                    },
                    progress: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        description: 'Processing progress percentage'
                    },
                    estimatedTimeRemaining: {
                        type: 'number',
                        description: 'Estimated time remaining in seconds'
                    },
                    currentStage: {
                        type: 'string',
                        description: 'Description of current processing stage'
                    }
                },
                required: ['sessionId', 'status', 'progress']
            },
            UploadResponse: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Unique session identifier for tracking the upload'
                    },
                    imageUrl: {
                        type: 'string',
                        format: 'uri',
                        description: 'URL of the uploaded image'
                    }
                },
                required: ['sessionId', 'imageUrl']
            },
            HealthCheck: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'Name of the health check'
                    },
                    status: {
                        type: 'string',
                        enum: ['healthy', 'unhealthy', 'degraded'],
                        description: 'Health status'
                    },
                    responseTime: {
                        type: 'number',
                        description: 'Response time in milliseconds'
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Timestamp of the health check'
                    },
                    details: {
                        type: 'object',
                        description: 'Additional health check details'
                    },
                    error: {
                        type: 'string',
                        description: 'Error message if health check failed'
                    }
                },
                required: ['name', 'status', 'responseTime', 'timestamp']
            },
            SystemHealth: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        enum: ['healthy', 'unhealthy', 'degraded'],
                        description: 'Overall system health status'
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Timestamp of the health check'
                    },
                    uptime: {
                        type: 'number',
                        description: 'System uptime in milliseconds'
                    },
                    version: {
                        type: 'string',
                        description: 'Application version'
                    },
                    environment: {
                        type: 'string',
                        description: 'Environment (development, production, etc.)'
                    },
                    checks: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/HealthCheck'
                        },
                        description: 'Individual health checks'
                    }
                },
                required: ['status', 'timestamp', 'uptime', 'version', 'environment', 'checks']
            },
            Error: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: false
                    },
                    error: {
                        type: 'string',
                        description: 'Error code'
                    },
                    message: {
                        type: 'string',
                        description: 'Human-readable error message'
                    },
                    details: {
                        type: 'object',
                        description: 'Additional error details'
                    }
                },
                required: ['success', 'error', 'message']
            }
        },
        responses: {
            BadRequest: {
                description: 'Bad Request',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        },
                        example: {
                            success: false,
                            error: 'VALIDATION_ERROR',
                            message: 'Invalid request parameters'
                        }
                    }
                }
            },
            NotFound: {
                description: 'Resource Not Found',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        },
                        example: {
                            success: false,
                            error: 'NOT_FOUND',
                            message: 'Resource not found'
                        }
                    }
                }
            },
            InternalServerError: {
                description: 'Internal Server Error',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        },
                        example: {
                            success: false,
                            error: 'INTERNAL_ERROR',
                            message: 'An unexpected error occurred'
                        }
                    }
                }
            },
            ServiceUnavailable: {
                description: 'Service Unavailable',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        },
                        example: {
                            success: false,
                            error: 'SERVICE_UNAVAILABLE',
                            message: 'Service is temporarily unavailable'
                        }
                    }
                }
            }
        }
    },
    tags: [
        {
            name: 'Upload',
            description: 'File upload operations'
        },
        {
            name: 'Processing',
            description: 'Menu processing and OCR operations'
        },
        {
            name: 'Results',
            description: 'Processing results and generated images'
        },
        {
            name: 'Health',
            description: 'System health and monitoring'
        },
        {
            name: 'Errors',
            description: 'Error reporting and monitoring'
        },
        {
            name: 'Sharing',
            description: 'Image sharing and download operations'
        }
    ]
};
const options = {
    definition: swaggerDefinition,
    apis: [
        './src/routes/*.ts',
        './src/server.ts'
    ]
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = exports.swaggerSpec;
//# sourceMappingURL=swagger.js.map