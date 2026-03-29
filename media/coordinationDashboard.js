// React-based Coordination Dashboard for VSCode Web View
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const CoordinationDashboard = () => {
  const [metrics, setMetrics] = useState({
    harmony: 0,
    resilience: 0,
    throughput: 0,
    friction: 0,
    focus: 0,
    velocity: 0,
  });
  const [metricsLoaded, setMetricsLoaded] = useState(false);

  const [alerts, setAlerts] = useState([]);

  const [isMonitoring, setIsMonitoring] = useState(true);

  useEffect(() => {
    // Listen for real metric updates from the extension host
    const handleMessage = event => {
      const message = event.data;
      if (message.command === 'updateMetrics' && message.metrics) {
        setMetrics(message.metrics);
        setMetricsLoaded(true);
      }
      if (message.command === 'updateAlerts' && message.alerts) {
        setAlerts(
          message.alerts.map((a, i) => ({
            ...a,
            id: a.id || `alert-${i}`,
            timestamp: a.timestamp ? new Date(a.timestamp) : new Date(),
          }))
        );
      }
    };
    window.addEventListener('message', handleMessage);

    // Request initial data from extension host
    window.vscode.postMessage({ command: 'refreshCoordination' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getMetricColor = value => {
    if (value >= 8) return '#28a745'; // Green
    if (value >= 6) return '#ffc107'; // Yellow
    if (value >= 4) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  const getMetricStatus = value => {
    if (value >= 8) return 'Excellent';
    if (value >= 6) return 'Good';
    if (value >= 4) return 'Fair';
    return 'Poor';
  };

  const MetricBar = ({ name, value, color, status }) => (
    <div
      style={{
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#2d2d2d',
        borderRadius: '8px',
        border: `1px solid ${color}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
          {name}
        </span>
        <span style={{ fontSize: '12px', color: '#888' }}>{status}</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            flex: 1,
            height: '8px',
            backgroundColor: '#444',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${value * 10}%`,
              backgroundColor: color,
              transition: 'width 0.3s ease',
            }}
          ></div>
        </div>
        <span
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#fff',
            minWidth: '30px',
          }}
        >
          {value.toFixed(1)}/10
        </span>
      </div>
    </div>
  );

  const AlertCard = ({ alert }) => (
    <div
      style={{
        padding: '12px',
        backgroundColor:
          alert.severity === 'critical'
            ? '#3d1a1a'
            : alert.severity === 'high'
              ? '#3d2a1a'
              : alert.severity === 'medium'
                ? '#3d3d1a'
                : '#1a3d2a',
        border: `1px solid ${
          alert.severity === 'critical'
            ? '#dc3545'
            : alert.severity === 'high'
              ? '#fd7e14'
              : alert.severity === 'medium'
                ? '#ffc107'
                : '#28a745'
        }`,
        borderRadius: '8px',
        marginBottom: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '4px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            color:
              alert.severity === 'critical'
                ? '#ff6b6b'
                : alert.severity === 'high'
                  ? '#ffa726'
                  : alert.severity === 'medium'
                    ? '#ffeb3b'
                    : '#66bb6a',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          {alert.type} • {alert.severity}
        </span>
        <span style={{ fontSize: '10px', color: '#888' }}>
          {alert.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '14px', color: '#fff' }}>
        {alert.message}
      </p>
      {alert.actionable && (
        <button
          onClick={() => console.log('Taking action for', alert.id)}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            backgroundColor: '#444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Take Action
        </button>
      )}
    </div>
  );

  const overallCoordination =
    (metrics.harmony +
      metrics.resilience +
      metrics.throughput +
      (10 - metrics.friction) +
      metrics.focus +
      metrics.velocity) /
    6;

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#1e1e1e',
        color: '#ffffff',
        minHeight: '100vh',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px' }}>Performance Dashboard</h1>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            style={{
              padding: '8px 16px',
              backgroundColor: isMonitoring ? '#dc3545' : '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={() =>
              window.vscode.postMessage({ command: 'refreshCoordination' })
            }
            style={{
              padding: '8px 16px',
              backgroundColor: '#444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Metrics Section */}
        <div
          style={{
            backgroundColor: '#2d2d2d',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #444',
          }}
        >
          <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '18px' }}>
            UCF Metrics
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            <MetricBar
              name="Harmony"
              value={metrics.harmony}
              color={getMetricColor(metrics.harmony)}
              status={getMetricStatus(metrics.harmony)}
            />
            <MetricBar
              name="Resilience"
              value={metrics.resilience}
              color={getMetricColor(metrics.resilience)}
              status={getMetricStatus(metrics.resilience)}
            />
            <MetricBar
              name="Throughput"
              value={metrics.throughput}
              color={getMetricColor(metrics.throughput)}
              status={getMetricStatus(metrics.throughput)}
            />
            <MetricBar
              name="Friction"
              value={metrics.friction}
              color={getMetricColor(10 - metrics.friction)}
              status={getMetricStatus(10 - metrics.friction)}
            />
            <MetricBar
              name="Focus"
              value={metrics.focus}
              color={getMetricColor(metrics.focus)}
              status={getMetricStatus(metrics.focus)}
            />
            <MetricBar
              name="Velocity"
              value={metrics.velocity}
              color={getMetricColor(metrics.velocity)}
              status={getMetricStatus(metrics.velocity)}
            />
          </div>

          {/* Overall Coordination */}
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#333',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <div
              style={{ fontSize: '14px', color: '#888', marginBottom: '4px' }}
            >
              Overall Performance Score
            </div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: getMetricColor(overallCoordination),
              }}
            >
              {overallCoordination.toFixed(1)}/10
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              {getMetricStatus(overallCoordination)}
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        <div
          style={{
            backgroundColor: '#2d2d2d',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #444',
          }}
        >
          <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '18px' }}>
            Performance Alerts
          </h2>

          {alerts.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#888',
                padding: '20px',
              }}
            >
              {metricsLoaded ? 'No alerts at this time' : 'Loading alerts...'}
            </div>
          ) : (
            <div>
              {alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div
        style={{
          backgroundColor: '#2d2d2d',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #444',
        }}
      >
        <h2 style={{ margin: 0, marginBottom: '16px', fontSize: '18px' }}>
          Recommendations
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
          }}
        >
          {metrics.throughput < 6 && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#333',
                borderRadius: '8px',
                border: '1px solid #555',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#ffc107',
                }}
              >
                ⚡ Energy Boost
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>
                Your throughput (energy) is low. Consider taking a short walk,
                doing some light stretching, or getting some fresh air.
              </p>
            </div>
          )}

          {metrics.harmony < 5 && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#333',
                borderRadius: '8px',
                border: '1px solid #555',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#dc3545',
                }}
              >
                🧘 Mindfulness Break
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>
                Your harmony levels are low. Take 5 minutes for deep breathing
                or mindfulness meditation.
              </p>
            </div>
          )}

          {metrics.velocity > 8 && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#333',
                borderRadius: '8px',
                border: '1px solid #555',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#28a745',
                }}
              >
                🎯 Focus Time
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>
                Your velocity (focus) is excellent! This is the perfect time for
                deep work and complex tasks.
              </p>
            </div>
          )}

          {metrics.friction > 6 && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#333',
                borderRadius: '8px',
                border: '1px solid #555',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  color: '#fd7e14',
                }}
              >
                🧹 Mental Clarity
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#ccc' }}>
                High friction levels indicate mental clutter. Try organizing
                your workspace or clearing browser tabs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Initialize React
ReactDOM.render(<CoordinationDashboard />, document.getElementById('root'));
