import React, { useState, useEffect } from 'react';
import './HealthDashboard.css';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastCheck: string;
  error?: string;
}

interface DashboardData {
  overview: {
    status: 'healthy' | 'unhealthy' | 'degraded';
    uptime: number;
    version: string;
    environment: string;
    timestamp: string;
  };
  services: ServiceStatus[];
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    requests: {
      total: number;
      errors: number;
      averageResponseTime: number;
    };
    errors: any;
  };
  alerts: {
    critical: number;
    warnings: number;
  };
}

const HealthDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/health/dashboard');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
        setError(null);
        setLastUpdated(new Date());
      } else {
        throw new Error('Failed to fetch dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (uptime: number): string => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  };

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return '#10b981'; // green
      case 'degraded':
        return '#f59e0b'; // yellow
      case 'unhealthy':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <div className="health-dashboard">
        <div className="loading">Loading health dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="health-dashboard">
        <div className="error">
          <h3>Failed to load health dashboard</h3>
          <p>{error}</p>
          <button onClick={fetchDashboardData}>Retry</button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="health-dashboard">
        <div className="no-data">No dashboard data available</div>
      </div>
    );
  }

  return (
    <div className="health-dashboard">
      <div className="dashboard-header">
        <h2>System Health Dashboard</h2>
        <div className="last-updated">
          Last updated: {lastUpdated?.toLocaleTimeString()}
        </div>
      </div>

      {/* Overview Section */}
      <div className="overview-section">
        <div className="overview-card">
          <div className="status-indicator">
            <span 
              className="status-dot" 
              style={{ backgroundColor: getStatusColor(dashboardData.overview.status) }}
            />
            <span className="status-text">
              {getStatusIcon(dashboardData.overview.status)} {dashboardData.overview.status.toUpperCase()}
            </span>
          </div>
          <div className="overview-details">
            <div className="detail-item">
              <span className="label">Uptime:</span>
              <span className="value">{formatUptime(dashboardData.overview.uptime)}</span>
            </div>
            <div className="detail-item">
              <span className="label">Version:</span>
              <span className="value">{dashboardData.overview.version}</span>
            </div>
            <div className="detail-item">
              <span className="label">Environment:</span>
              <span className="value">{dashboardData.overview.environment}</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(dashboardData.alerts.critical > 0 || dashboardData.alerts.warnings > 0) && (
          <div className="alerts-card">
            <h3>Active Alerts</h3>
            {dashboardData.alerts.critical > 0 && (
              <div className="alert critical">
                ❌ {dashboardData.alerts.critical} Critical Issues
              </div>
            )}
            {dashboardData.alerts.warnings > 0 && (
              <div className="alert warning">
                ⚠️ {dashboardData.alerts.warnings} Warnings
              </div>
            )}
          </div>
        )}
      </div>

      {/* Services Section */}
      <div className="services-section">
        <h3>Service Status</h3>
        <div className="services-grid">
          {dashboardData.services.map((service) => (
            <div key={service.name} className="service-card">
              <div className="service-header">
                <span className="service-name">{service.name}</span>
                <span 
                  className="service-status"
                  style={{ color: getStatusColor(service.status) }}
                >
                  {getStatusIcon(service.status)} {service.status}
                </span>
              </div>
              <div className="service-details">
                <div className="detail-row">
                  <span>Response Time:</span>
                  <span>{service.responseTime}ms</span>
                </div>
                <div className="detail-row">
                  <span>Last Check:</span>
                  <span>{new Date(service.lastCheck).toLocaleTimeString()}</span>
                </div>
                {service.error && (
                  <div className="service-error">
                    Error: {service.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics Section */}
      <div className="metrics-section">
        <h3>System Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-card">
            <h4>Memory Usage</h4>
            <div className="metric-value">
              {formatBytes(dashboardData.metrics.memory.used)} / {formatBytes(dashboardData.metrics.memory.total)}
            </div>
            <div className="metric-percentage">
              {dashboardData.metrics.memory.percentage.toFixed(1)}%
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${dashboardData.metrics.memory.percentage}%` }}
              />
            </div>
          </div>

          <div className="metric-card">
            <h4>Requests</h4>
            <div className="metric-value">
              {dashboardData.metrics.requests.total.toLocaleString()}
            </div>
            <div className="metric-details">
              <div>Errors: {dashboardData.metrics.requests.errors}</div>
              <div>Avg Response: {dashboardData.metrics.requests.averageResponseTime.toFixed(0)}ms</div>
            </div>
          </div>

          <div className="metric-card">
            <h4>Error Rate</h4>
            <div className="metric-value">
              {dashboardData.metrics.requests.total > 0 
                ? ((dashboardData.metrics.requests.errors / dashboardData.metrics.requests.total) * 100).toFixed(2)
                : '0.00'
              }%
            </div>
            <div className="metric-details">
              Total Errors: {dashboardData.metrics.errors.totalErrors || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-footer">
        <button onClick={fetchDashboardData} className="refresh-button">
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default HealthDashboard;