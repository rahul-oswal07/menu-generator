"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importDefault(require("../utils/logger"));
class ErrorReportingService {
    constructor() {
        this.errorCounts = new Map();
        this.lastAlertTime = new Map();
        this.alertConfig = {
            enabled: process.env.ERROR_ALERTS_ENABLED === 'true',
            webhookUrl: process.env.ERROR_WEBHOOK_URL,
            emailRecipients: process.env.ERROR_EMAIL_RECIPIENTS?.split(','),
            slackChannel: process.env.ERROR_SLACK_CHANNEL,
            thresholds: {
                errorRate: parseInt(process.env.ERROR_RATE_THRESHOLD || '10'),
                criticalErrors: parseInt(process.env.CRITICAL_ERROR_THRESHOLD || '5')
            }
        };
        setInterval(() => {
            this.errorCounts.clear();
        }, 60000);
    }
    async reportError(error) {
        try {
            logger_1.default.error('Error reported', {
                errorId: error.id,
                errorCode: error.errorCode,
                service: error.service,
                message: error.message,
                context: error.context,
                userId: error.userId,
                sessionId: error.sessionId
            });
            const errorKey = `${error.service}:${error.errorCode}`;
            const currentCount = this.errorCounts.get(errorKey) || 0;
            this.errorCounts.set(errorKey, currentCount + 1);
            await this.checkAndSendAlert(error, currentCount + 1);
        }
        catch (reportingError) {
            logger_1.default.error('Failed to report error', {
                originalError: error,
                reportingError: reportingError instanceof Error ? reportingError.message : String(reportingError)
            });
        }
    }
    async checkAndSendAlert(error, count) {
        if (!this.alertConfig.enabled) {
            return;
        }
        const shouldAlert = this.shouldSendAlert(error, count);
        if (!shouldAlert) {
            return;
        }
        const alertKey = `${error.service}:${error.errorCode}`;
        this.lastAlertTime.set(alertKey, new Date());
        const alertMessage = this.formatAlertMessage(error, count);
        await Promise.allSettled([
            this.sendWebhookAlert(alertMessage),
            this.sendEmailAlert(alertMessage),
            this.sendSlackAlert(alertMessage)
        ]);
    }
    shouldSendAlert(error, count) {
        const alertKey = `${error.service}:${error.errorCode}`;
        const lastAlert = this.lastAlertTime.get(alertKey);
        if (lastAlert && Date.now() - lastAlert.getTime() < 300000) {
            return false;
        }
        if (error.level === 'critical') {
            return true;
        }
        if (count >= this.alertConfig.thresholds.errorRate) {
            return true;
        }
        return false;
    }
    formatAlertMessage(error, count) {
        return `
🚨 Error Alert - AI Menu Generator

**Service:** ${error.service}
**Error Code:** ${error.errorCode}
**Level:** ${error.level.toUpperCase()}
**Count:** ${count} occurrences in the last minute
**Message:** ${error.message}
**Time:** ${error.timestamp.toISOString()}
${error.sessionId ? `**Session ID:** ${error.sessionId}` : ''}

**Context:**
\`\`\`json
${JSON.stringify(error.context, null, 2)}
\`\`\`
    `.trim();
    }
    async sendWebhookAlert(message) {
        if (!this.alertConfig.webhookUrl) {
            return;
        }
        try {
            const response = await fetch(this.alertConfig.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: message,
                    username: 'AI Menu Generator',
                    icon_emoji: ':warning:'
                })
            });
            if (!response.ok) {
                throw new Error(`Webhook alert failed: ${response.statusText}`);
            }
        }
        catch (error) {
            logger_1.default.error('Failed to send webhook alert', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    async sendEmailAlert(message) {
        if (!this.alertConfig.emailRecipients?.length) {
            return;
        }
        logger_1.default.info('Email alert would be sent', {
            recipients: this.alertConfig.emailRecipients,
            message: message.substring(0, 100) + '...'
        });
    }
    async sendSlackAlert(message) {
        if (!this.alertConfig.slackChannel) {
            return;
        }
        logger_1.default.info('Slack alert would be sent', {
            channel: this.alertConfig.slackChannel,
            message: message.substring(0, 100) + '...'
        });
    }
    getErrorStats() {
        const stats = {
            totalErrors: 0,
            errorsByService: {},
            errorsByCode: {},
            timestamp: new Date().toISOString()
        };
        for (const [key, count] of this.errorCounts.entries()) {
            const [service, errorCode] = key.split(':');
            stats.totalErrors += count;
            stats.errorsByService[service] = (stats.errorsByService[service] || 0) + count;
            stats.errorsByCode[errorCode] = (stats.errorsByCode[errorCode] || 0) + count;
        }
        return stats;
    }
}
exports.default = new ErrorReportingService();
//# sourceMappingURL=ErrorReportingService.js.map