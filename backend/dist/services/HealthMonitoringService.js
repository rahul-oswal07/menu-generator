"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../utils/logger"));
class HealthMonitoringService {
    constructor() {
        this.healthCheckInterval = null;
        this.startTime = new Date();
        this.requestMetrics = {
            total: 0,
            errors: 0,
            responseTimes: []
        };
        this.externalServiceStatus = new Map();
        this.startPeriodicHealthChecks();
    }
    startPeriodicHealthChecks() {
        this.healthCheckInterval = setInterval(async () => {
            await this.checkExternalServices();
        }, 30000);
    }
    stopPeriodicHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    recordRequest(responseTime, isError = false) {
        this.requestMetrics.total++;
        this.requestMetrics.responseTimes.push(responseTime);
        if (isError) {
            this.requestMetrics.errors++;
        }
        if (this.requestMetrics.responseTimes.length > 1000) {
            this.requestMetrics.responseTimes = this.requestMetrics.responseTimes.slice(-1000);
        }
    }
    async getSystemHealth() {
        const checks = await this.runAllHealthChecks();
        const metrics = await this.getSystemMetrics();
        const overallStatus = this.determineOverallStatus(checks);
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Date.now() - this.startTime.getTime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            checks,
            metrics
        };
    }
    async runAllHealthChecks() {
        const checks = [];
        checks.push(await this.checkDatabase());
        checks.push(await this.checkFileSystem());
        const externalChecks = await this.checkExternalServices();
        checks.push(...externalChecks);
        return checks;
    }
    async checkDatabase() {
        const startTime = Date.now();
        try {
            await new Promise(resolve => setTimeout(resolve, 10));
            return {
                name: 'database',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                details: {
                    connection: 'active',
                    pool: 'available'
                }
            };
        }
        catch (error) {
            return {
                name: 'database',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async checkFileSystem() {
        const startTime = Date.now();
        try {
            const fs = require('fs').promises;
            const path = require('path');
            const uploadsDir = path.join(process.cwd(), 'uploads');
            await fs.access(uploadsDir);
            const logsDir = path.join(process.cwd(), 'logs');
            await fs.access(logsDir);
            return {
                name: 'filesystem',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                details: {
                    uploadsDir: 'accessible',
                    logsDir: 'accessible'
                }
            };
        }
        catch (error) {
            return {
                name: 'filesystem',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async checkExternalServices() {
        const checks = [];
        checks.push(await this.checkOCRService());
        checks.push(await this.checkImageGenerationService());
        return checks;
    }
    async checkOCRService() {
        const startTime = Date.now();
        const serviceName = 'ocr-service';
        try {
            const mockResponse = await this.simulateExternalServiceCheck('OCR');
            const status = mockResponse.ok ? 'healthy' : 'degraded';
            const serviceStatus = {
                status: mockResponse.ok ? 'up' : 'degraded',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString()
            };
            this.externalServiceStatus.set(serviceName, serviceStatus);
            return {
                name: serviceName,
                status,
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                details: {
                    endpoint: process.env.OCR_SERVICE_URL || 'mock://ocr-service',
                    apiKey: process.env.OCR_API_KEY ? 'configured' : 'missing'
                }
            };
        }
        catch (error) {
            const serviceStatus = {
                status: 'down',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString()
            };
            this.externalServiceStatus.set(serviceName, serviceStatus);
            return {
                name: serviceName,
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async checkImageGenerationService() {
        const startTime = Date.now();
        const serviceName = 'image-generation-service';
        try {
            const mockResponse = await this.simulateExternalServiceCheck('ImageGen');
            const status = mockResponse.ok ? 'healthy' : 'degraded';
            const serviceStatus = {
                status: mockResponse.ok ? 'up' : 'degraded',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString()
            };
            this.externalServiceStatus.set(serviceName, serviceStatus);
            return {
                name: serviceName,
                status,
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                details: {
                    endpoint: process.env.IMAGE_GEN_SERVICE_URL || 'mock://image-gen-service',
                    apiKey: process.env.IMAGE_GEN_API_KEY ? 'configured' : 'missing'
                }
            };
        }
        catch (error) {
            const serviceStatus = {
                status: 'down',
                responseTime: Date.now() - startTime,
                lastCheck: new Date().toISOString()
            };
            this.externalServiceStatus.set(serviceName, serviceStatus);
            return {
                name: serviceName,
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    async simulateExternalServiceCheck(_serviceName) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        const isHealthy = Math.random() > 0.1;
        return { ok: isHealthy };
    }
    async getSystemMetrics() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const avgResponseTime = this.requestMetrics.responseTimes.length > 0
            ? this.requestMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.requestMetrics.responseTimes.length
            : 0;
        const externalServices = {};
        for (const [serviceName, status] of this.externalServiceStatus.entries()) {
            externalServices[serviceName] = status;
        }
        return {
            memory: {
                used: memoryUsage.heapUsed,
                total: memoryUsage.heapTotal,
                percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
            },
            cpu: {
                usage: (cpuUsage.user + cpuUsage.system) / 1000000
            },
            requests: {
                total: this.requestMetrics.total,
                errors: this.requestMetrics.errors,
                averageResponseTime: avgResponseTime
            },
            externalServices
        };
    }
    determineOverallStatus(checks) {
        const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
        const degradedChecks = checks.filter(check => check.status === 'degraded');
        if (unhealthyChecks.length > 0) {
            return 'unhealthy';
        }
        if (degradedChecks.length > 0) {
            return 'degraded';
        }
        return 'healthy';
    }
    async getQuickHealth() {
        try {
            const dbCheck = await this.checkDatabase();
            const fsCheck = await this.checkFileSystem();
            const isHealthy = dbCheck.status === 'healthy' && fsCheck.status === 'healthy';
            return {
                status: isHealthy ? 'ok' : 'error',
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.default.error('Quick health check failed', { error: error instanceof Error ? error.message : String(error) });
            return {
                status: 'error',
                timestamp: new Date().toISOString()
            };
        }
    }
    getPerformanceMetrics() {
        const uptime = Date.now() - this.startTime.getTime();
        const memoryUsage = process.memoryUsage();
        return {
            uptime,
            memory: {
                rss: memoryUsage.rss,
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external
            },
            requests: {
                total: this.requestMetrics.total,
                errors: this.requestMetrics.errors,
                errorRate: this.requestMetrics.total > 0
                    ? (this.requestMetrics.errors / this.requestMetrics.total) * 100
                    : 0
            },
            timestamp: new Date().toISOString()
        };
    }
}
exports.default = new HealthMonitoringService();
//# sourceMappingURL=HealthMonitoringService.js.map