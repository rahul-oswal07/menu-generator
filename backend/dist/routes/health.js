"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../middleware/errorHandler");
const HealthMonitoringService_1 = __importDefault(require("../services/HealthMonitoringService"));
const ErrorReportingService_1 = __importDefault(require("../services/ErrorReportingService"));
const router = express_1.default.Router();
router.get('/', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const health = await HealthMonitoringService_1.default.getQuickHealth();
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
}));
router.get('/detailed', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const systemHealth = await HealthMonitoringService_1.default.getSystemHealth();
    const statusCode = systemHealth.status === 'healthy' ? 200 :
        systemHealth.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json({
        success: true,
        data: systemHealth
    });
}));
router.get('/metrics', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const metrics = HealthMonitoringService_1.default.getPerformanceMetrics();
    res.json({
        success: true,
        data: metrics
    });
}));
router.get('/errors', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const errorStats = ErrorReportingService_1.default.getErrorStats();
    res.json({
        success: true,
        data: errorStats
    });
}));
router.get('/ready', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const systemHealth = await HealthMonitoringService_1.default.getSystemHealth();
    const isReady = systemHealth.status !== 'unhealthy';
    if (isReady) {
        res.json({
            status: 'ready',
            timestamp: new Date().toISOString()
        });
    }
    else {
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            reason: 'System is unhealthy'
        });
    }
}));
router.get('/live', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
}));
router.get('/service/:serviceName', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { serviceName } = req.params;
    const systemHealth = await HealthMonitoringService_1.default.getSystemHealth();
    const serviceCheck = systemHealth.checks.find(check => check.name === serviceName);
    if (!serviceCheck) {
        return res.status(404).json({
            success: false,
            error: 'SERVICE_NOT_FOUND',
            message: `Health check for service '${serviceName}' not found`
        });
    }
    const statusCode = serviceCheck.status === 'healthy' ? 200 :
        serviceCheck.status === 'degraded' ? 200 : 503;
    return res.status(statusCode).json({
        success: true,
        data: serviceCheck
    });
}));
router.get('/dashboard', (0, errorHandler_1.asyncHandler)(async (_req, res) => {
    const [systemHealth, errorStats] = await Promise.all([
        HealthMonitoringService_1.default.getSystemHealth(),
        Promise.resolve(ErrorReportingService_1.default.getErrorStats())
    ]);
    const dashboardData = {
        overview: {
            status: systemHealth.status,
            uptime: systemHealth.uptime,
            version: systemHealth.version,
            environment: systemHealth.environment,
            timestamp: systemHealth.timestamp
        },
        services: systemHealth.checks.map(check => ({
            name: check.name,
            status: check.status,
            responseTime: check.responseTime,
            lastCheck: check.timestamp,
            error: check.error
        })),
        metrics: {
            memory: systemHealth.metrics.memory,
            requests: systemHealth.metrics.requests,
            errors: errorStats
        },
        alerts: {
            critical: systemHealth.checks.filter(check => check.status === 'unhealthy').length,
            warnings: systemHealth.checks.filter(check => check.status === 'degraded').length
        }
    };
    res.json({
        success: true,
        data: dashboardData
    });
}));
exports.default = router;
//# sourceMappingURL=health.js.map