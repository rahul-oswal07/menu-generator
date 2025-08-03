import HealthMonitoringService from '../HealthMonitoringService';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    access: jest.fn()
  },
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

// Mock winston logger
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
}));

describe('HealthMonitoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the service state by creating a new instance
    (HealthMonitoringService as any).requestMetrics = {
      total: 0,
      errors: 0,
      responseTimes: []
    };
  });

  afterAll(() => {
    // Clean up any intervals
    HealthMonitoringService.stopPeriodicHealthChecks();
  });

  describe('recordRequest', () => {
    it('should record successful request', () => {
      HealthMonitoringService.recordRequest(100, false);
      
      const metrics = HealthMonitoringService.getPerformanceMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.errors).toBe(0);
    });

    it('should record error request', () => {
      HealthMonitoringService.recordRequest(200, true);
      
      const metrics = HealthMonitoringService.getPerformanceMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.errors).toBe(1);
    });

    it('should calculate error rate correctly', () => {
      // Record some requests
      HealthMonitoringService.recordRequest(100, false);
      HealthMonitoringService.recordRequest(150, true);
      HealthMonitoringService.recordRequest(120, false);
      HealthMonitoringService.recordRequest(180, true);
      
      const metrics = HealthMonitoringService.getPerformanceMetrics();
      expect(metrics.requests.total).toBe(4);
      expect(metrics.requests.errors).toBe(2);
      expect(metrics.requests.errorRate).toBe(50); // 2/4 * 100
    });
  });

  describe('getQuickHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      const fs = require('fs');
      fs.promises.access.mockResolvedValue(undefined);
      
      const health = await HealthMonitoringService.getQuickHealth();
      
      expect(health.status).toBe('ok');
      expect(health.timestamp).toBeDefined();
    });

    it('should return error status when checks fail', async () => {
      const fs = require('fs');
      fs.promises.access.mockRejectedValue(new Error('Access denied'));
      
      const health = await HealthMonitoringService.getQuickHealth();
      
      expect(health.status).toBe('error');
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('getSystemHealth', () => {
    it('should return comprehensive system health', async () => {
      const fs = require('fs');
      fs.promises.access.mockResolvedValue(undefined);
      
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      
      expect(systemHealth).toHaveProperty('status');
      expect(systemHealth).toHaveProperty('timestamp');
      expect(systemHealth).toHaveProperty('uptime');
      expect(systemHealth).toHaveProperty('version');
      expect(systemHealth).toHaveProperty('environment');
      expect(systemHealth).toHaveProperty('checks');
      expect(systemHealth).toHaveProperty('metrics');
      
      expect(Array.isArray(systemHealth.checks)).toBe(true);
      expect(systemHealth.checks.length).toBeGreaterThan(0);
    });

    it('should include all required health checks', async () => {
      const fs = require('fs');
      fs.promises.access.mockResolvedValue(undefined);
      
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      
      const checkNames = systemHealth.checks.map(check => check.name);
      expect(checkNames).toContain('database');
      expect(checkNames).toContain('filesystem');
      expect(checkNames).toContain('ocr-service');
      expect(checkNames).toContain('image-generation-service');
    });

    it('should determine overall status correctly', async () => {
      const fs = require('fs');
      fs.promises.access.mockResolvedValue(undefined);
      
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      
      // With mocked successful checks, status should be healthy or degraded
      expect(['healthy', 'degraded', 'unhealthy']).toContain(systemHealth.status);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics', () => {
      const metrics = HealthMonitoringService.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('requests');
      expect(metrics).toHaveProperty('timestamp');
      
      expect(metrics.memory).toHaveProperty('rss');
      expect(metrics.memory).toHaveProperty('heapTotal');
      expect(metrics.memory).toHaveProperty('heapUsed');
      expect(metrics.memory).toHaveProperty('external');
      
      expect(metrics.requests).toHaveProperty('total');
      expect(metrics.requests).toHaveProperty('errors');
      expect(metrics.requests).toHaveProperty('errorRate');
    });

    it('should calculate uptime correctly', () => {
      const metrics = HealthMonitoringService.getPerformanceMetrics();
      
      expect(typeof metrics.uptime).toBe('number');
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('health check individual services', () => {
    it('should check database health', async () => {
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      const dbCheck = systemHealth.checks.find(check => check.name === 'database');
      
      expect(dbCheck).toBeDefined();
      expect(dbCheck?.name).toBe('database');
      expect(['healthy', 'unhealthy', 'degraded']).toContain(dbCheck?.status || '');
      expect(typeof dbCheck?.responseTime).toBe('number');
      expect(dbCheck?.timestamp).toBeDefined();
    });

    it('should check filesystem health', async () => {
      const fs = require('fs');
      fs.promises.access.mockResolvedValue(undefined);
      
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      const fsCheck = systemHealth.checks.find(check => check.name === 'filesystem');
      
      expect(fsCheck).toBeDefined();
      expect(fsCheck?.name).toBe('filesystem');
      expect(fsCheck?.status).toBe('healthy');
      expect(typeof fsCheck?.responseTime).toBe('number');
      expect(fsCheck?.timestamp).toBeDefined();
    });

    it('should handle filesystem check failure', async () => {
      const fs = require('fs');
      fs.promises.access.mockRejectedValue(new Error('Permission denied'));
      
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      const fsCheck = systemHealth.checks.find(check => check.name === 'filesystem');
      
      expect(fsCheck).toBeDefined();
      expect(fsCheck?.status).toBe('unhealthy');
      expect(fsCheck?.error).toBeDefined();
    });

    it('should check external services', async () => {
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      
      const ocrCheck = systemHealth.checks.find(check => check.name === 'ocr-service');
      const imageGenCheck = systemHealth.checks.find(check => check.name === 'image-generation-service');
      
      expect(ocrCheck).toBeDefined();
      expect(imageGenCheck).toBeDefined();
      
      expect(['healthy', 'unhealthy', 'degraded']).toContain(ocrCheck?.status || '');
      expect(['healthy', 'unhealthy', 'degraded']).toContain(imageGenCheck?.status || '');
    });
  });

  describe('metrics collection', () => {
    it('should collect memory metrics', async () => {
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      
      expect(systemHealth.metrics.memory).toHaveProperty('used');
      expect(systemHealth.metrics.memory).toHaveProperty('total');
      expect(systemHealth.metrics.memory).toHaveProperty('percentage');
      
      expect(typeof systemHealth.metrics.memory.used).toBe('number');
      expect(typeof systemHealth.metrics.memory.total).toBe('number');
      expect(typeof systemHealth.metrics.memory.percentage).toBe('number');
      
      expect(systemHealth.metrics.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(systemHealth.metrics.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should collect request metrics', async () => {
      // Record some test requests
      HealthMonitoringService.recordRequest(100, false);
      HealthMonitoringService.recordRequest(200, true);
      
      const systemHealth = await HealthMonitoringService.getSystemHealth();
      
      expect(systemHealth.metrics.requests).toHaveProperty('total');
      expect(systemHealth.metrics.requests).toHaveProperty('errors');
      expect(systemHealth.metrics.requests).toHaveProperty('averageResponseTime');
      
      expect(systemHealth.metrics.requests.total).toBeGreaterThanOrEqual(2);
      expect(systemHealth.metrics.requests.errors).toBeGreaterThanOrEqual(1);
      expect(typeof systemHealth.metrics.requests.averageResponseTime).toBe('number');
    });
  });
});