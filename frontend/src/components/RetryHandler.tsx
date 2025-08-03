import React, { useState, useCallback } from 'react';
import ErrorMessage from './ErrorMessage';

interface RetryHandlerProps {
  children: (retryFn: () => void, isRetrying: boolean, error: string | null) => React.ReactNode;
  onRetry: () => Promise<void>;
  maxRetries?: number;
  retryDelay?: number;
  showTroubleshooting?: boolean;
}

interface RetryState {
  isRetrying: boolean;
  error: string | null;
  retryCount: number;
}

const RetryHandler: React.FC<RetryHandlerProps> = ({
  children,
  onRetry,
  maxRetries = 3,
  retryDelay = 1000,
  showTroubleshooting = true
}) => {
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    error: null,
    retryCount: 0
  });

  const handleRetry = useCallback(async () => {
    if (state.retryCount >= maxRetries) {
      setState(prev => ({
        ...prev,
        error: `Maximum retry attempts (${maxRetries}) exceeded. Please try again later.`
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      error: null
    }));

    try {
      // Add delay before retry (exponential backoff)
      const delay = retryDelay * Math.pow(2, state.retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      await onRetry();
      
      // Reset state on success
      setState({
        isRetrying: false,
        error: null,
        retryCount: 0
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isRetrying: false,
        error: errorMessage,
        retryCount: prev.retryCount + 1
      }));
    }
  }, [onRetry, maxRetries, retryDelay, state.retryCount]);

  const handleDismissError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const resetRetryCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      retryCount: 0
    }));
  }, []);

  return (
    <div className="retry-handler">
      {state.error && (
        <ErrorMessage
          error={state.error}
          type="error"
          onRetry={state.retryCount < maxRetries ? handleRetry : undefined}
          onDismiss={handleDismissError}
          showTroubleshooting={showTroubleshooting}
        />
      )}
      {children(handleRetry, state.isRetrying, state.error)}
    </div>
  );
};

export default RetryHandler;