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
declare class HealthMonitoringService {
    private startTime;
    private requestMetrics;
    private externalServiceStatus;
    private healthCheckInterval;
    constructor();
    private startPeriodicHealthChecks;
    stopPeriodicHealthChecks(): void;
    recordRequest(responseTime: number, isError?: boolean): void;
    getSystemHealth(): Promise<SystemHealth>;
    private runAllHealthChecks;
    private checkDatabase;
    private checkFileSystem;
    private checkExternalServices;
    private checkOCRService;
    private checkImageGenerationService;
    private simulateExternalServiceCheck;
    private getSystemMetrics;
    private determineOverallStatus;
    getQuickHealth(): Promise<{
        status: string;
        timestamp: string;
    }>;
    getPerformanceMetrics(): any;
}
declare const _default: HealthMonitoringService;
export default _default;
//# sourceMappingURL=HealthMonitoringService.d.ts.map