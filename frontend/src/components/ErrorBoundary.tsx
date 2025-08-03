import React, { Component, ErrorInfo, ReactNode } from 'react';
import ErrorMessage from './ErrorMessage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Report error to error reporting service
    this.reportError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.getUserId(),
        sessionId: this.getSessionId()
      };

      // Send error report to backend
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private getUserId = (): string | undefined => {
    // Get user ID from localStorage, sessionStorage, or context
    return localStorage.getItem('userId') || undefined;
  };

  private getSessionId = (): string | undefined => {
    // Get session ID from localStorage, sessionStorage, or context
    return sessionStorage.getItem('sessionId') || undefined;
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="error-boundary">
          <ErrorMessage
            error={errorMessage}
            type="error"
            onRetry={this.handleRetry}
            showTroubleshooting={true}
          />
          
          <div className="error-actions">
            <button 
              className="error-button primary-button"
              onClick={this.handleRetry}
            >
              Try Again
            </button>
            <button 
              className="error-button secondary-button"
              onClick={this.handleReload}
            >
              Reload Page
            </button>
          </div>

          {isDevelopment && this.state.error && (
            <details className="error-details">
              <summary>Error Details (Development Only)</summary>
              <div className="error-stack">
                <h4>Error Stack:</h4>
                <pre>{this.state.error.stack}</pre>
              </div>
              {this.state.errorInfo && (
                <div className="component-stack">
                  <h4>Component Stack:</h4>
                  <pre>{this.state.errorInfo.componentStack}</pre>
                </div>
              )}
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;