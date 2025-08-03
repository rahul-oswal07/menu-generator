import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RetryHandler from '../RetryHandler';

// Mock the ErrorMessage component
jest.mock('../ErrorMessage', () => {
  return function MockErrorMessage({ error, onRetry, onDismiss, showTroubleshooting }: any) {
    if (!error) return null;
    return (
      <div data-testid="error-message">
        <span data-testid="error-text">{error}</span>
        {onRetry && <button onClick={onRetry}>Retry</button>}
        {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
      </div>
    );
  };
});

describe('RetryHandler', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children with retry function', () => {
    render(
      <RetryHandler onRetry={mockOnRetry}>
        {(retryFn, isRetrying, error) => (
          <div>
            <span data-testid="retry-status">
              {isRetrying ? 'Retrying...' : 'Ready'}
            </span>
            <button onClick={retryFn}>Manual Retry</button>
          </div>
        )}
      </RetryHandler>
    );

    expect(screen.getByTestId('retry-status')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
    expect(screen.getByText('Manual Retry')).toBeTruthy();
  });

  it('handles successful retry', async () => {
    mockOnRetry.mockResolvedValueOnce(undefined);

    render(
      <RetryHandler onRetry={mockOnRetry}>
        {(retryFn, isRetrying, error) => (
          <div>
            <span data-testid="retry-status">
              {isRetrying ? 'Retrying...' : 'Ready'}
            </span>
            <button onClick={retryFn}>Manual Retry</button>
          </div>
        )}
      </RetryHandler>
    );

    const retryButton = screen.getByText('Manual Retry');
    fireEvent.click(retryButton);

    // Should show retrying state
    expect(screen.getByText('Retrying...')).toBeTruthy();

    // Fast-forward through the delay
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeTruthy();
    });
  });

  it('handles failed retry and shows error', async () => {
    const errorMessage = 'Retry failed';
    mockOnRetry.mockRejectedValueOnce(new Error(errorMessage));

    render(
      <RetryHandler onRetry={mockOnRetry}>
        {(retryFn, isRetrying, error) => (
          <div>
            <span data-testid="retry-status">
              {isRetrying ? 'Retrying...' : 'Ready'}
            </span>
            <button onClick={retryFn}>Manual Retry</button>
          </div>
        )}
      </RetryHandler>
    );

    const retryButton = screen.getByText('Manual Retry');
    fireEvent.click(retryButton);

    // Fast-forward through the delay
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeTruthy();
      expect(screen.getByText(errorMessage)).toBeTruthy();
    });
  });

  it('implements exponential backoff for retries', async () => {
    mockOnRetry
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce(undefined);

    render(
      <RetryHandler onRetry={mockOnRetry} retryDelay={100}>
        {(retryFn, isRetrying, error) => (
          <div>
            <button onClick={retryFn}>Manual Retry</button>
          </div>
        )}
      </RetryHandler>
    );

    const retryButton = screen.getByText('Manual Retry');

    // First retry - delay should be 100ms
    fireEvent.click(retryButton);
    jest.advanceTimersByTime(100);
    await waitFor(() => expect(mockOnRetry).toHaveBeenCalledTimes(1));

    // Second retry - delay should be 200ms (exponential backoff)
    const errorRetryButton = await screen.findByText('Retry');
    fireEvent.click(errorRetryButton);
    jest.advanceTimersByTime(200);
    await waitFor(() => expect(mockOnRetry).toHaveBeenCalledTimes(2));

    // Third retry - delay should be 400ms
    const secondErrorRetryButton = await screen.findByText('Retry');
    fireEvent.click(secondErrorRetryButton);
    jest.advanceTimersByTime(400);
    await waitFor(() => expect(mockOnRetry).toHaveBeenCalledTimes(3));
  });

  it('stops retrying after max attempts', async () => {
    mockOnRetry.mockRejectedValue(new Error('Always fails'));

    render(
      <RetryHandler onRetry={mockOnRetry} maxRetries={2}>
        {(retryFn, isRetrying, error) => (
          <div>
            <button onClick={retryFn}>Manual Retry</button>
          </div>
        )}
      </RetryHandler>
    );

    const retryButton = screen.getByText('Manual Retry');

    // First attempt
    fireEvent.click(retryButton);
    jest.advanceTimersByTime(1000);
    await waitFor(() => expect(mockOnRetry).toHaveBeenCalledTimes(1));

    // Second attempt
    const firstRetryButton = await screen.findByText('Retry');
    fireEvent.click(firstRetryButton);
    jest.advanceTimersByTime(2000);
    await waitFor(() => expect(mockOnRetry).toHaveBeenCalledTimes(2));

    // Third attempt - should show max retries exceeded (no retry button should be available)
    await waitFor(() => {
      expect(screen.queryByText('Retry')).toBeNull();
    });

    // Try manual retry which should show max retries message
    const manualRetryButton = screen.getByText('Manual Retry');
    fireEvent.click(manualRetryButton);

    await waitFor(() => {
      expect(screen.getByText(/Maximum retry attempts.*exceeded/)).toBeTruthy();
    });

    // Should not call onRetry again
    expect(mockOnRetry).toHaveBeenCalledTimes(2);
  });

  it('allows dismissing errors', async () => {
    mockOnRetry.mockRejectedValueOnce(new Error('Test error'));

    render(
      <RetryHandler onRetry={mockOnRetry}>
        {(retryFn, isRetrying, error) => (
          <div>
            <button onClick={retryFn}>Manual Retry</button>
            <span data-testid="error-state">{error || 'No error'}</span>
          </div>
        )}
      </RetryHandler>
    );

    const retryButton = screen.getByText('Manual Retry');
    fireEvent.click(retryButton);

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(screen.getByTestId('error-text')).toBeTruthy();
    });

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).toBeNull();
      expect(screen.getByText('No error')).toBeTruthy();
    });
  });

  it('resets retry count on successful operation', async () => {
    mockOnRetry
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Second failure'));

    render(
      <RetryHandler onRetry={mockOnRetry} retryDelay={100}>
        {(retryFn, isRetrying, error) => (
          <div>
            <button onClick={retryFn}>Manual Retry</button>
          </div>
        )}
      </RetryHandler>
    );

    const retryButton = screen.getByText('Manual Retry');

    // First attempt fails
    fireEvent.click(retryButton);
    jest.advanceTimersByTime(100);
    await waitFor(() => expect(mockOnRetry).toHaveBeenCalledTimes(1));

    // Retry succeeds
    const firstRetryButton = await screen.findByText('Retry');
    fireEvent.click(firstRetryButton);
    jest.advanceTimersByTime(200);
    await waitFor(() => expect(mockOnRetry).toHaveBeenCalledTimes(2));

    // New attempt should start with base delay again
    fireEvent.click(retryButton);
    jest.advanceTimersByTime(100); // Should be base delay, not exponential
    await waitFor(() => expect(mockOnRetry).toHaveBeenCalledTimes(3));
  });
});