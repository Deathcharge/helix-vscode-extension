import React, { useState, useEffect } from 'react';

interface UCFFullMetrics {
  harmony: number;
  resilience: number;
  throughput: number;
  friction: number;
  focus: number;
  velocity: number;
}

interface CoordinationAlert {
  id: string;
  type: 'crisis' | 'opportunity' | 'recommendation';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  actionable: boolean;
}

const CoordinationDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<UCFFullMetrics | null>(null);
  const [alerts, setAlerts] = useState<CoordinationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const apiService = new ApiService();

  useEffect(() => {
    fetchMetrics();
    fetchAlerts();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMetrics();
        fetchAlerts();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCoordinationMetrics();

      if (response.success && response.data) {
        setMetrics(response.data);
      } else {
        setError(response.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError('Failed to connect to Helix API');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await apiService.getCoordinationAlerts();
      if (response.success && response.data) {
        setAlerts(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  const getMetricColor = (value: number): string => {
    if (value >= 8) return '#3fb950'; // Green
    if (value >= 6) return '#d29922'; // Yellow
    if (value >= 4) return '#f85149'; // Red
    return '#8b949e'; // Gray
  };

  const getMetricStatus = (value: number): string => {
    if (value >= 8) return 'Excellent';
    if (value >= 6) return 'Good';
    if (value >= 4) return 'Warning';
    return 'Critical';
  };

  const getOverallCoordination = (): number => {
    if (!metrics) return 0;
    const avg =
      (metrics.harmony +
        metrics.resilience +
        metrics.throughput +
        metrics.focus +
        (10 - metrics.friction)) /
      5;
    return Math.round(avg * 10) / 10;
  };

  const getOverallStatus = (): string => {
    const level = getOverallCoordination();
    if (level >= 8) return 'Peak Coordination';
    if (level >= 6) return 'Heightened Awareness';
    if (level >= 4) return 'Meditation State';
    return 'Deep Meditation';
  };

  const handleRecommendations = async () => {
    try {
      const response = await apiService.getCoordinationRecommendations();
      if (response.success && response.data) {
        const recommendations = response.data;
        recommendations.forEach(rec => {
          showNotification(rec.title + ': ' + rec.description);
        });
      }
    } catch (err) {
      setError('Failed to fetch recommendations');
    }
  };

  const showNotification = (message: string) => {
    if (window.acquireVsCodeApi) {
      const vscode = window.acquireVsCodeApi();
      vscode.postMessage({
        command: 'showNotification',
        text: message,
      });
    }
  };

  if (loading && !metrics) {
    return (
      <div className="container">
        <div className="header">
          <h1>🌀 Coordination Dashboard</h1>
          <div className="status-bar">
            <span className="status-item">Status: Loading metrics...</span>
          </div>
        </div>
        <div className="loading">Loading coordination metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <h1>🌀 Coordination Dashboard</h1>
        </div>
        <div className="error">
          <strong>Error:</strong> {error}
          <br />
          <button
            className="btn"
            onClick={fetchMetrics}
            style={{ marginTop: '10px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🌀 Coordination Dashboard</h1>
        <div className="status-bar">
          <span className="status-item">
            Overall: {getOverallCoordination()}/10 ({getOverallStatus()})
          </span>
          <span className="status-item">
            Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          </span>
          <button
            className="btn btn-secondary"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pause' : 'Resume'}
          </button>
          <button className="btn" onClick={handleRecommendations}>
            Get Recommendations
          </button>
        </div>
      </div>

      <div className="grid">
        {/* Overall Coordination Card */}
        <div
          className="card metric-card"
          style={{ gridColumn: '1 / -1', textAlign: 'center' }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🧠</div>
          <div
            className="metric-value"
            style={{ color: getMetricColor(getOverallCoordination()) }}
          >
            {getOverallCoordination()}
          </div>
          <div className="metric-label">{getOverallStatus()}</div>
          <div className="progress-bar" style={{ marginTop: '15px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${getOverallCoordination() * 10}%`,
                backgroundColor: getMetricColor(getOverallCoordination()),
              }}
            ></div>
          </div>
        </div>

        {/* Individual Metrics */}
        {metrics && (
          <>
            <div className="card metric-card">
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎵</div>
              <div
                className="metric-value"
                style={{ color: getMetricColor(metrics.harmony) }}
              >
                {metrics.harmony.toFixed(1)}
              </div>
              <div className="metric-label">Harmony</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${metrics.harmony * 10}%`,
                    backgroundColor: getMetricColor(metrics.harmony),
                  }}
                ></div>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#8b949e',
                  marginTop: '5px',
                }}
              >
                {getMetricStatus(metrics.harmony)}
              </div>
            </div>

            <div className="card metric-card">
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🛡️</div>
              <div
                className="metric-value"
                style={{ color: getMetricColor(metrics.resilience) }}
              >
                {metrics.resilience.toFixed(1)}
              </div>
              <div className="metric-label">Resilience</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${metrics.resilience * 10}%`,
                    backgroundColor: getMetricColor(metrics.resilience),
                  }}
                ></div>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#8b949e',
                  marginTop: '5px',
                }}
              >
                {getMetricStatus(metrics.resilience)}
              </div>
            </div>

            <div className="card metric-card">
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚡</div>
              <div
                className="metric-value"
                style={{ color: getMetricColor(metrics.throughput) }}
              >
                {metrics.throughput.toFixed(1)}
              </div>
              <div className="metric-label">Throughput</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${metrics.throughput * 10}%`,
                    backgroundColor: getMetricColor(metrics.throughput),
                  }}
                ></div>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#8b949e',
                  marginTop: '5px',
                }}
              >
                {getMetricStatus(metrics.throughput)}
              </div>
            </div>

            <div className="card metric-card">
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👁️</div>
              <div
                className="metric-value"
                style={{ color: getMetricColor(metrics.focus) }}
              >
                {metrics.focus.toFixed(1)}
              </div>
              <div className="metric-label">Focus</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${metrics.focus * 10}%`,
                    backgroundColor: getMetricColor(metrics.focus),
                  }}
                ></div>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#8b949e',
                  marginTop: '5px',
                }}
              >
                {getMetricStatus(metrics.focus)}
              </div>
            </div>

            <div className="card metric-card">
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🧹</div>
              <div
                className="metric-value"
                style={{ color: getMetricColor(10 - metrics.friction) }}
              >
                {(10 - metrics.friction).toFixed(1)}
              </div>
              <div className="metric-label">Friction Cleansing</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(10 - metrics.friction) * 10}%`,
                    backgroundColor: getMetricColor(10 - metrics.friction),
                  }}
                ></div>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#8b949e',
                  marginTop: '5px',
                }}
              >
                {getMetricStatus(10 - metrics.friction)}
              </div>
            </div>

            <div className="card metric-card">
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🚀</div>
              <div
                className="metric-value"
                style={{ color: getMetricColor(metrics.velocity) }}
              >
                {metrics.velocity.toFixed(1)}
              </div>
              <div className="metric-label">Velocity Acceleration</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${metrics.velocity * 10}%`,
                    backgroundColor: getMetricColor(metrics.velocity),
                  }}
                ></div>
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  color: '#8b949e',
                  marginTop: '5px',
                }}
              >
                {getMetricStatus(metrics.velocity)}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Alerts Section */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>🚨 Coordination Alerts</h3>

        {alerts.length === 0 ? (
          <div
            style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}
          >
            No active alerts. Coordination levels are stable. 🎉
          </div>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {alerts.map(alert => (
              <div
                key={alert.id}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #30363d',
                  backgroundColor:
                    alert.severity === 'critical' ? '#3a1a1a' : '#21262d',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '5px',
                  }}
                >
                  <span
                    className="tag"
                    style={{
                      backgroundColor:
                        alert.severity === 'critical'
                          ? '#f85149'
                          : alert.severity === 'high'
                            ? '#d29922'
                            : alert.severity === 'medium'
                              ? '#58a6ff'
                              : '#8b949e',
                      color: 'white',
                    }}
                  >
                    {alert.type.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                  {alert.message}
                </div>
                {alert.actionable && (
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  >
                    Take Action
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>⚡ Quick Actions</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn" onClick={fetchMetrics}>
            Refresh Metrics
          </button>
          <button className="btn btn-secondary" onClick={fetchAlerts}>
            Check Alerts
          </button>
          <button className="btn" onClick={handleRecommendations}>
            Get Recommendations
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pause Auto-Refresh' : 'Resume Auto-Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoordinationDashboard;
