import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorMessage from '../ErrorMessage';

describe('ErrorMessage', () => {
  const mockOnRetry = jest.fn();
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorMessage error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message with default error type', () => {
    render(<ErrorMessage error="Something went wrong" />);
    
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('❌')).toBeTruthy();
  });

  it('renders warning type correctly', () => {
    render(<ErrorMessage error="Warning message" type="warning" />);
    
    expect(screen.getByText('Warning message')).toBeTruthy();
    expect(screen.getByText('⚠️')).toBeTruthy();
  });

  it('renders info type correctly', () => {
    render(<ErrorMessage error="Info message" type="info" />);
    
    expect(screen.getByText('Info message')).toBeTruthy();
    expect(screen.getByText('ℹ️')).toBeTruthy();
  });

  it('shows retry button when onRetry is provided', () => {
    render(
      <ErrorMessage 
        error="Test error" 
        onRetry={mockOnRetry}
      />
    );
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeTruthy();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('shows dismiss button when onDismiss is provided', () => {
    render(
      <ErrorMessage 
        error="Test error" 
        onDismiss={mockOnDismiss}
      />
    );
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeTruthy();
    
    fireEvent.click(dismissButton);
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows troubleshooting tips for network errors', () => {
    render(
      <ErrorMessage 
        error="Network connection failed" 
        showTroubleshooting={true}
      />
    );
    
    expect(screen.getByText('Troubleshooting Tips:')).toBeTruthy();
    expect(screen.getByText(/Check your internet connection/)).toBeTruthy();
    expect(screen.getByText(/Refresh the page/)).toBeTruthy();
  });

  it('shows troubleshooting tips for file upload errors', () => {
    render(
      <ErrorMessage 
        error="File upload failed" 
        showTroubleshooting={true}
      />
    );
    
    expect(screen.getByText(/Check file format/)).toBeTruthy();
    expect(screen.getByText(/Check file size/)).toBeTruthy();
    expect(screen.getByText(/Try a different image/)).toBeTruthy();
  });

  it('shows troubleshooting tips for OCR errors', () => {
    render(
      <ErrorMessage 
        error="OCR processing failed" 
        showTroubleshooting={true}
      />
    );
    
    expect(screen.getByText(/Improve image quality/)).toBeTruthy();
    expect(screen.getByText(/Ensure good lighting/)).toBeTruthy();
    expect(screen.getByText(/Check text visibility/)).toBeTruthy();
  });

  it('shows troubleshooting tips for image generation errors', () => {
    render(
      <ErrorMessage 
        error="Image generation failed" 
        showTroubleshooting={true}
      />
    );
    
    expect(screen.getByText(/Try again later/)).toBeTruthy();
    expect(screen.getByText(/Check menu item details/)).toBeTruthy();
  });

  it('shows generic troubleshooting tips for unknown errors', () => {
    render(
      <ErrorMessage 
        error="Unknown error occurred" 
        showTroubleshooting={true}
      />
    );
    
    expect(screen.getByText(/Try refreshing the page/)).toBeTruthy();
    expect(screen.getByText(/Check your connection/)).toBeTruthy();
  });

  it('does not show troubleshooting when showTroubleshooting is false', () => {
    render(
      <ErrorMessage 
        error="Network connection failed" 
        showTroubleshooting={false}
      />
    );
    
    expect(screen.queryByText('Troubleshooting Tips:')).toBeNull();
  });

  it('handles refresh page action', () => {
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: mockReload },
      writable: true
    });

    render(
      <ErrorMessage 
        error="Network connection failed" 
        showTroubleshooting={true}
      />
    );
    
    const refreshButton = screen.getByText('Refresh Page');
    fireEvent.click(refreshButton);
    
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('renders both retry and dismiss buttons when both handlers are provided', () => {
    render(
      <ErrorMessage 
        error="Test error" 
        onRetry={mockOnRetry}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText('Try Again')).toBeTruthy();
    expect(screen.getByText('Dismiss')).toBeTruthy();
  });
});