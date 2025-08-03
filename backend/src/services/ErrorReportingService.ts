import logger from '../utils/logger';

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
    errorRate: number; // errors per minute
    criticalErrors: number; // critical errors per hour
  };
}

class ErrorReportingService {
  private errorCounts: Map<string, number> = new Map();
  private alertConfig: AlertConfig;
  private lastAlertTime: Map<string, Date> = new Map();

  constructor() {
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

    // Reset error counts every minute
    setInterval(() => {
      this.errorCounts.clear();
    }, 60000);
  }

  async reportError(error: ErrorReport): Promise<void> {
    try {
      // Log the error
      logger.error('Error reported', {
        errorId: error.id,
        errorCode: error.errorCode,
        service: error.service,
        message: error.message,
        context: error.context,
        userId: error.userId,
        sessionId: error.sessionId
      });

      // Track error counts for alerting
      const errorKey = `${error.service}:${error.errorCode}`;
      const currentCount = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, currentCount + 1);

      // Check if we should send an alert
      await this.checkAndSendAlert(error, currentCount + 1);

      // Store error in database (if implemented)
      // await this.storeError(error);

    } catch (reportingError) {
      logger.error('Failed to report error', {
        originalError: error,
        reportingError: reportingError instanceof Error ? reportingError.message : String(reportingError)
      });
    }
  }

  private async checkAndSendAlert(error: ErrorReport, count: number): Promise<void> {
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

    // Send alerts through configured channels
    await Promise.allSettled([
      this.sendWebhookAlert(alertMessage),
      this.sendEmailAlert(alertMessage),
      this.sendSlackAlert(alertMessage)
    ]);
  }

  private shouldSendAlert(error: ErrorReport, count: number): boolean {
    const alertKey = `${error.service}:${error.errorCode}`;
    const lastAlert = this.lastAlertTime.get(alertKey);
    
    // Don't spam alerts - wait at least 5 minutes between alerts for the same error
    if (lastAlert && Date.now() - lastAlert.getTime() < 300000) {
      return false;
    }

    // Alert on critical errors immediately
    if (error.level === 'critical') {
      return true;
    }

    // Alert if error rate threshold is exceeded
    if (count >= this.alertConfig.thresholds.errorRate) {
      return true;
    }

    return false;
  }

  private formatAlertMessage(error: ErrorReport, count: number): string {
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

  private async sendWebhookAlert(message: string): Promise<void> {
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
    } catch (error) {
      logger.error('Failed to send webhook alert', { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private async sendEmailAlert(message: string): Promise<void> {
    if (!this.alertConfig.emailRecipients?.length) {
      return;
    }

    // Email implementation would go here
    // For now, just log that we would send an email
    logger.info('Email alert would be sent', {
      recipients: this.alertConfig.emailRecipients,
      message: message.substring(0, 100) + '...'
    });
  }

  private async sendSlackAlert(message: string): Promise<void> {
    if (!this.alertConfig.slackChannel) {
      return;
    }

    // Slack implementation would go here
    // For now, just log that we would send a Slack message
    logger.info('Slack alert would be sent', {
      channel: this.alertConfig.slackChannel,
      message: message.substring(0, 100) + '...'
    });
  }

  // Get error statistics for monitoring dashboard
  getErrorStats(): any {
    const stats = {
      totalErrors: 0,
      errorsByService: {} as Record<string, number>,
      errorsByCode: {} as Record<string, number>,
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

export default new ErrorReportingService();