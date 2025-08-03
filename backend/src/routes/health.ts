import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import HealthMonitoringService from '../services/HealthMonitoringService';
import ErrorReportingService from '../services/ErrorReportingService';

const router = express.Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Quick health check
 *     description: Simple health check endpoint for load balancers and monitoring systems
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ok]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *             example:
 *               status: "ok"
 *               timestamp: "2023-12-01T12:00:00.000Z"
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */
// Quick health check for load balancers
router.get('/', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const health = await HealthMonitoringService.getQuickHealth();
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
}));

/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     tags: [Health]
 *     summary: Detailed health check
 *     description: Comprehensive health check including all system components and metrics
 *     responses:
 *       200:
 *         description: Detailed system health information
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/SystemHealth'
 *             example:
 *               success: true
 *               data:
 *                 status: "healthy"
 *                 timestamp: "2023-12-01T12:00:00.000Z"
 *                 uptime: 3600000
 *                 version: "1.0.0"
 *                 environment: "production"
 *                 checks:
 *                   - name: "database"
 *                     status: "healthy"
 *                     responseTime: 25
 *                     timestamp: "2023-12-01T12:00:00.000Z"
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */
// Detailed health check
router.get('/detailed', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const systemHealth = await HealthMonitoringService.getSystemHealth();
  
  const statusCode = systemHealth.status === 'healthy' ? 200 : 
                    systemHealth.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    success: true,
    data: systemHealth
  });
}));

// Performance metrics endpoint
router.get('/metrics', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const metrics = HealthMonitoringService.getPerformanceMetrics();
  
  res.json({
    success: true,
    data: metrics
  });
}));

// Error statistics endpoint
router.get('/errors', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const errorStats = ErrorReportingService.getErrorStats();
  
  res.json({
    success: true,
    data: errorStats
  });
}));

// Readiness probe (for Kubernetes)
router.get('/ready', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const systemHealth = await HealthMonitoringService.getSystemHealth();
  
  // Service is ready if it's healthy or degraded (but not unhealthy)
  const isReady = systemHealth.status !== 'unhealthy';
  
  if (isReady) {
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      reason: 'System is unhealthy'
    });
  }
}));

// Liveness probe (for Kubernetes)
router.get('/live', asyncHandler(async (_req: express.Request, res: express.Response) => {
  // Simple liveness check - if we can respond, we're alive
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}));

// Health check for specific service
router.get('/service/:serviceName', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { serviceName } = req.params;
  const systemHealth = await HealthMonitoringService.getSystemHealth();
  
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

/**
 * @swagger
 * /api/health/dashboard:
 *   get:
 *     tags: [Health]
 *     summary: Health dashboard data
 *     description: Aggregated health and metrics data for monitoring dashboards
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         overview:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                               enum: [healthy, unhealthy, degraded]
 *                             uptime:
 *                               type: number
 *                             version:
 *                               type: string
 *                             environment:
 *                               type: string
 *                         services:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               responseTime:
 *                                 type: number
 *                         metrics:
 *                           type: object
 *                           properties:
 *                             memory:
 *                               type: object
 *                             requests:
 *                               type: object
 *                         alerts:
 *                           type: object
 *                           properties:
 *                             critical:
 *                               type: number
 *                             warnings:
 *                               type: number
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Dashboard data endpoint (aggregated health and metrics)
router.get('/dashboard', asyncHandler(async (_req: express.Request, res: express.Response) => {
  const [systemHealth, errorStats] = await Promise.all([
    HealthMonitoringService.getSystemHealth(),
    Promise.resolve(ErrorReportingService.getErrorStats())
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

export default router;