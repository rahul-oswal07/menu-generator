export interface ErrorReport {
    id: string;
    timestamp: Date;
    level: 'error' | 'warning' | 'critical';
    service: string;
    errorCode: string;
    message: string;
    context?: any;
    userId?: string;
    sessionId?: string;
    stack?: string;
}
export interface AlertConfig {
    enabled: boolean;
    webhookUrl?: string;
    emailRecipients?: string[];
    slackChannel?: string;
    thresholds: {
        errorRate: number;
        criticalErrors: number;
    };
}
declare class ErrorReportingService {
    private errorCounts;
    private alertConfig;
    private lastAlertTime;
    constructor();
    reportError(error: ErrorReport): Promise<void>;
    private checkAndSendAlert;
    private shouldSendAlert;
    private formatAlertMessage;
    private sendWebhookAlert;
    private sendEmailAlert;
    private sendSlackAlert;
    getErrorStats(): any;
}
declare const _default: ErrorReportingService;
export default _default;
//# sourceMappingURL=ErrorReportingService.d.ts.map