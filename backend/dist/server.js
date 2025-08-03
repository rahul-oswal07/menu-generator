"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const upload_1 = __importDefault(require("./routes/upload"));
const imageGeneration_1 = __importDefault(require("./routes/imageGeneration"));
const results_1 = __importDefault(require("./routes/results"));
const share_1 = __importDefault(require("./routes/share"));
const errors_1 = __importDefault(require("./routes/errors"));
const health_1 = __importDefault(require("./routes/health"));
const process_1 = __importDefault(require("./routes/process"));
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = __importDefault(require("./utils/logger"));
const HealthMonitoringService_1 = __importDefault(require("./services/HealthMonitoringService"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
dotenv_1.default.config();
(0, errorHandler_1.handleUnhandledRejection)();
(0, errorHandler_1.handleUncaughtException)();
const logsDir = path_1.default.join(process.cwd(), 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((_req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const isError = res.statusCode >= 400;
        HealthMonitoringService_1.default.recordRequest(responseTime, isError);
    });
    next();
});
const imageOptimization_1 = __importDefault(require("./middleware/imageOptimization"));
app.use('/uploads', imageOptimization_1.default);
app.use('/uploads', express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
app.use('/api', upload_1.default);
app.use('/api/image-generation', imageGeneration_1.default);
app.use('/api/results', results_1.default);
app.use('/api/share', share_1.default);
app.use('/api/errors', errors_1.default);
app.use('/api/health', health_1.default);
app.use('/api', process_1.default);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'AI Menu Generator API Documentation'
}));
app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swagger_1.default);
});
app.get('/health', (_req, res) => {
    res.redirect('/api/health');
});
app.get('/', (_req, res) => {
    res.json({
        message: 'AI Menu Generator API',
        version: '1.0.0',
        endpoints: {
            health: '/api/health',
            healthDetailed: '/api/health/detailed',
            metrics: '/api/health/metrics',
            dashboard: '/api/health/dashboard',
            process: '/api/process',
            status: '/api/status/:sessionId',
            regenerate: '/api/regenerate',
            docs: '/api-docs',
            docsJson: '/api-docs.json',
            upload: '/api/upload',
            imageGeneration: '/api/image-generation',
            results: '/api/results',
            share: '/api/share'
        }
    });
});
app.use('*', (_req, res) => {
    res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Endpoint not found.'
    });
});
app.use(errorHandler_1.globalErrorHandler);
app.listen(PORT, () => {
    logger_1.default.info(`Server started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        corsOrigin: process.env.FRONTEND_URL || 'http://localhost:3000'
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map