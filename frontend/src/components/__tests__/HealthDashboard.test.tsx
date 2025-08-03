import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HealthDashboard from '../HealthDashboard';

// Mock fetch
global.fetch = jest.fn();

const mockDashboardData = {
  overview: {
    status: 'healthy' as const,
    uptime: 3600000, // 1 hour
    version: '1.0.0',
    environment: 'development',
    timestamp: '2023-01-01T12:00:00Z'
  },
  services: [
    {
      name: 'database',
      status: 'healthy' as const,
      responseTime: 50,
      lastCheck: '2023-01-01T12:00:00Z'
    },
    {
      name: 'ocr-service',
      status: 'degraded' as const,
      responseTime: 200,
      lastCheck: '2023-01-01T12:00:00Z',
      error: 'High response time'
    }
  ],
  metrics: {
    memory: {
      used: 100000000,
      total: 200000000,
      percentage: 50
    },
    requests: {
      total: 1000,
      errors: 10,
      averageResponseTime: 150
    },
    errors: {
      totalErrors: 5
    }
  },
  alerts: {
    critical: 0,
    warnings: 1
  }
};

describe('HealthDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<HealthDashboard />);
    
    expect(screen.getByText('Loading health dashboard...')).toBeInTheDocument();
  });

  it('should render dashboard data when loaded successfully', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockDashboardData
      })
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
    });

    // Check overview section
    expect(screen.getByText('✅ HEALTHY')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();

    // Check services
    expect(screen.getByText('database')).toBeInTheDocument();
    expect(screen.getByText('ocr-service')).toBeInTheDocument();

    // Check metrics
    expect(screen.getByText('1,000')).toBeInTheDocument(); // Total requests
    expect(screen.getByText('50.0%')).toBeInTheDocument(); // Memory percentage
  });

  it('should render error state when fetch fails', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load health dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should handle HTTP error responses', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load health dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('HTTP 500: Internal Server Error')).toBeInTheDocument();
  });

  it('should retry fetching data when retry button is clicked', async () => {
    (fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockDashboardData
        })
      });

    render(<HealthDashboard />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load health dashboard')).toBeInTheDocument();
    });

    // Click retry
    fireEvent.click(screen.getByText('Retry'));

    // Wait for successful load
    await waitFor(() => {
      expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should refresh data when refresh button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockDashboardData
      })
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
    });

    // Click refresh
    fireEvent.click(screen.getByText('Refresh Data'));

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should format uptime correctly', async () => {
    const dataWithLongUptime = {
      ...mockDashboardData,
      overview: {
        ...mockDashboardData.overview,
        uptime: 90061000 // 1 day, 1 hour, 1 minute, 1 second
      }
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: dataWithLongUptime
      })
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/1d 1h 1m/)).toBeInTheDocument();
    });
  });

  it('should format bytes correctly', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockDashboardData
      })
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/95.37 MB \/ 190.73 MB/)).toBeInTheDocument();
    });
  });

  it('should display alerts when present', async () => {
    const dataWithAlerts = {
      ...mockDashboardData,
      alerts: {
        critical: 2,
        warnings: 3
      }
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: dataWithAlerts
      })
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText('❌ 2 Critical Issues')).toBeInTheDocument();
      expect(screen.getByText('⚠️ 3 Warnings')).toBeInTheDocument();
    });
  });

  it('should display service errors', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockDashboardData
      })
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Error: High response time')).toBeInTheDocument();
    });
  });

  it('should calculate error rate correctly', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockDashboardData
      })
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      // 10 errors out of 1000 requests = 1%
      expect(screen.getByText('1.00%')).toBeInTheDocument();
    });
  });

  it('should auto-refresh data every 30 seconds', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockDashboardData
      })
    });

    render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should cleanup interval on unmount', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockDashboardData
      })
    });

    const { unmount } = render(<HealthDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
    });

    unmount();

    // Fast-forward 30 seconds - should not trigger another fetch
    jest.advanceTimersByTime(30000);

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});