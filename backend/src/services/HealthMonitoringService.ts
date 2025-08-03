import logger from '../utils/logger';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  timestamp: string;
  details?: any;
  error?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheck[];
  metrics: SystemMetrics;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  requests: {
    total: number;
    errors: number;
    averageResponseTime: number;
  };
  externalServices: {
    [serviceName: string]: {
      status: 'up' | 'down' | 'degraded';
      responseTime: number;
      lastCheck: string;
    };
  };
}

class HealthMonitoringService {
  private startTime: Date;
  private requestMetrics: {
    total: number;
    errors: number;
    responseTimes: number[];
  };
  private externalServiceStatus: Map<string, any>;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startTime = new Date();
    this.requestMetrics = {
      total: 0,
      errors: 0,
      responseTimes: []
    };
    this.externalServiceStatus = new Map();
    
    // Start periodic health checks
    this.startPeriodicHealthChecks();
  }

  private startPeriodicHealthChecks(): void {
    // Check external services every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.checkExternalServices();
    }, 30000);
  }

  public stopPeriodicHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Record request metrics
  public recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestMetrics.total++;
    this.requestMetrics.responseTimes.push(responseTime);
    
    if (isError) {
      this.requestMetrics.errors++;
    }

    // Keep only last 1000 response times for memory efficiency
    if (this.requestMetrics.responseTimes.length > 1000) {
      this.requestMetrics.responseTimes = this.requestMetrics.responseTimes.slice(-1000);
    }
  }

  // Get comprehensive system health
  public async getSystemHealth(): Promise<SystemHealth> {
    const checks = await this.runAllHealthChecks();
    const metrics = await this.getSystemMetrics();
    
    // Determine overall system status
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

  // Run all health checks
  private async runAllHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Database health check
    checks.push(await this.checkDatabase());
    
    // File system health check
    checks.push(await this.checkFileSystem());
    
    // External services health checks
    const externalChecks = await this.checkExternalServices();
    checks.push(...externalChecks);

    return checks;
  }

  // Check database connectivity
  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Simulate database check - replace with actual database ping
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
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Check file system access
  private async checkFileSystem(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Check if uploads directory is accessible
      const uploadsDir = path.join(process.cwd(), 'uploads');
      await fs.access(uploadsDir);
      
      // Check if logs directory is accessible
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
    } catch (error) {
      return {
        name: 'filesystem',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Check external services
  private async checkExternalServices(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // OCR Service check
    checks.push(await this.checkOCRService());
    
    // Image Generation Service check
    checks.push(await this.checkImageGenerationService());

    return checks;
  }

  // Check OCR service availability
  private async checkOCRService(): Promise<HealthCheck> {
    const startTime = Date.now();
    const serviceName = 'ocr-service';
    
    try {
      // Simulate OCR service health check
      // In real implementation, this would ping the actual OCR service
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
    } catch (error) {
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

  // Check Image Generation service availability
  private async checkImageGenerationService(): Promise<HealthCheck> {
    const startTime = Date.now();
    const serviceName = 'image-generation-service';
    
    try {
      // Simulate Image Generation service health check
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
    } catch (error) {
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

  // Simulate external service check (replace with actual service calls)
  private async simulateExternalServiceCheck(_serviceName: string): Promise<{ ok: boolean }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    // Simulate occasional service issues
    const isHealthy = Math.random() > 0.1; // 90% uptime simulation
    
    return { ok: isHealthy };
  }

  // Get system metrics
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Calculate average response time
    const avgResponseTime = this.requestMetrics.responseTimes.length > 0
      ? this.requestMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.requestMetrics.responseTimes.length
      : 0;

    // Build external services status
    const externalServices: any = {};
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
        usage: (cpuUsage.user + cpuUsage.system) / 1000000 // Convert to milliseconds
      },
      requests: {
        total: this.requestMetrics.total,
        errors: this.requestMetrics.errors,
        averageResponseTime: avgResponseTime
      },
      externalServices
    };
  }

  // Determine overall system status based on individual checks
  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
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

  // Get quick health status (for load balancer checks)
  public async getQuickHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      // Quick checks only
      const dbCheck = await this.checkDatabase();
      const fsCheck = await this.checkFileSystem();
      
      const isHealthy = dbCheck.status === 'healthy' && fsCheck.status === 'healthy';
      
      return {
        status: isHealthy ? 'ok' : 'error',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Quick health check failed', { error: error instanceof Error ? error.message : String(error) });
      return {
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get performance metrics for monitoring dashboard
  public getPerformanceMetrics(): any {
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

export default new HealthMonitoringService();