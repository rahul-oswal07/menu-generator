// Global error handling utilities for the frontend

export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  userId?: string;
  sessionId?: string;
  context?: any;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  additionalData?: any;
}

class GlobalErrorHandler {
  private errorQueue: ErrorReport[] = [];
  private isReporting = false;
  private maxQueueSize = 50;

  constructor() {
    this.setupGlobalHandlers();
  }

  private setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(event.reason?.message || 'Unhandled promise rejection'),
        {
          component: 'Global',
          action: 'unhandledrejection',
          additionalData: { reason: event.reason }
        }
      );
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(
        new Error(event.message),
        {
          component: 'Global',
          action: 'javascript_error',
          additionalData: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        }
      );
    });

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError(
          new Error(`Resource failed to load: ${(event.target as any)?.src || 'unknown'}`),
          {
            component: 'Global',
            action: 'resource_error',
            additionalData: {
              tagName: (event.target as any)?.tagName,
              src: (event.target as any)?.src
            }
          }
        );
      }
    }, true);
  }

  public handleError(error: Error, context?: ErrorContext): void {
    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      context: {
        ...context,
        pathname: window.location.pathname,
        search: window.location.search
      }
    };

    // Add to queue
    this.errorQueue.push(errorReport);

    // Limit queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled by GlobalErrorHandler:', error);
      console.error('Context:', context);
    }

    // Report errors asynchronously
    this.reportErrors();
  }

  private async reportErrors(): Promise<void> {
    if (this.isReporting || this.errorQueue.length === 0) {
      return;
    }

    this.isReporting = true;

    try {
      const errorsToReport = [...this.errorQueue];
      this.errorQueue = [];

      await fetch('/api/errors/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors: errorsToReport })
      });
    } catch (reportingError) {
      console.error('Failed to report errors:', reportingError);
      // Put errors back in queue for retry
      this.errorQueue.unshift(...this.errorQueue);
    } finally {
      this.isReporting = false;
    }
  }

  private getUserId(): string | undefined {
    return localStorage.getItem('userId') || undefined;
  }

  private getSessionId(): string | undefined {
    return sessionStorage.getItem('sessionId') ||
      localStorage.getItem('sessionId') ||
      undefined;
  }

  // Method to manually report errors with context
  public reportError(error: Error | string, context?: ErrorContext): void {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    this.handleError(errorObj, context);
  }

  // Method to get error statistics
  public getErrorStats(): any {
    return {
      queueSize: this.errorQueue.length,
      isReporting: this.isReporting,
      recentErrors: this.errorQueue.slice(-5).map(error => ({
        message: error.message,
        timestamp: error.timestamp,
        context: error.context
      }))
    };
  }
}

// Create global instance
const globalErrorHandler = new GlobalErrorHandler();

// Export convenience functions
export const reportError = (error: Error | string, context?: ErrorContext) => {
  globalErrorHandler.reportError(error, context);
};

export const getErrorStats = () => {
  return globalErrorHandler.getErrorStats();
};

export default globalErrorHandler;