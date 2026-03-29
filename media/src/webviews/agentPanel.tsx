import React, { useState, useEffect } from 'react';
// Mock services for webview
const agentService = {
  getAgents: async () => ({ success: true, data: [] }),
};

const agentStore = {
  updateAgents: () => {},
};

interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  coordination: number;
  online: boolean;
  lastActivity: string;
  currentTask?: string;
}

const AgentPanel: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    Record<string, boolean>
  >({});

  const agentService = new AgentService();
  const agentStore = new AgentStore();

  useEffect(() => {
    fetchAgents();
    // Poll for agent status updates every 5 seconds
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await agentService.getAgents();

      if (response.success && response.data) {
        setAgents(response.data);
        agentStore.updateAgents(response.data);
      } else {
        setError(response.message || 'Failed to fetch agents');
      }
    } catch (err) {
      setError('Failed to connect to Helix API');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAgent = async (agentId: string) => {
    try {
      const response = await agentService.connectToAgent(agentId);
      if (response.success) {
        setConnectionStatus(prev => ({ ...prev, [agentId]: true }));
        showNotification(
          `Connected to ${agents.find(a => a.id === agentId)?.name}`
        );
      } else {
        throw new Error(response.message || 'Failed to connect');
      }
    } catch (err) {
      setError(`Failed to connect to agent: ${err}`);
    }
  };

  const handleDisconnectAgent = async (agentId: string) => {
    try {
      const response = await agentService.disconnectAgent(agentId);
      if (response.success) {
        setConnectionStatus(prev => ({ ...prev, [agentId]: false }));
        showNotification(
          `Disconnected from ${agents.find(a => a.id === agentId)?.name}`
        );
      } else {
        throw new Error(response.message || 'Failed to disconnect');
      }
    } catch (err) {
      setError(`Failed to disconnect agent: ${err}`);
    }
  };

  const getCoordinationColor = (level: number): string => {
    if (level >= 8) return '#3fb950'; // Green
    if (level >= 6) return '#d29922'; // Yellow
    if (level >= 4) return '#f85149'; // Red
    return '#8b949e'; // Gray
  };

  const showNotification = (message: string) => {
    // Send notification to VSCode
    if (window.acquireVsCodeApi) {
      const vscode = window.acquireVsCodeApi();
      vscode.postMessage({
        command: 'showNotification',
        text: message,
      });
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <h1>🤖 Agent Panel</h1>
          <div className="status-bar">
            <span className="status-item">Status: Loading agents...</span>
          </div>
        </div>
        <div className="loading">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="header">
          <h1>🤖 Agent Panel</h1>
        </div>
        <div className="error">
          <strong>Error:</strong> {error}
          <br />
          <button
            className="btn"
            onClick={fetchAgents}
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
        <h1>🤖 Agent Panel</h1>
        <div className="status-bar">
          <span className="status-item">Total Agents: {agents.length}</span>
          <span className="status-item">
            Online: {agents.filter(a => a.online).length}
          </span>
          <span className="status-item">
            Connected: {Object.values(connectionStatus).filter(Boolean).length}
          </span>
        </div>
      </div>

      <div className="grid">
        {agents.map(agent => (
          <div key={agent.id} className="card">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <span style={{ fontSize: '1.5rem' }}>{agent.emoji}</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {agent.name}
                  </div>
                  <div style={{ color: '#8b949e', fontSize: '0.9rem' }}>
                    {agent.role}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    color: getCoordinationColor(agent.coordination),
                    fontWeight: 'bold',
                  }}
                >
                  {agent.coordination.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                  Coordination
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '5px',
                }}
              >
                {agent.online ? (
                  <span className="online-dot"></span>
                ) : (
                  <span className="offline-dot"></span>
                )}
                <span style={{ color: agent.online ? '#3fb950' : '#f85149' }}>
                  {agent.online ? 'Online' : 'Offline'}
                </span>
              </div>

              {connectionStatus[agent.id] ? (
                <span
                  className="tag"
                  style={{ backgroundColor: '#3fb950', color: 'white' }}
                >
                  Connected
                </span>
              ) : (
                <span
                  className="tag"
                  style={{ backgroundColor: '#f85149', color: 'white' }}
                >
                  Disconnected
                </span>
              )}

              {agent.currentTask && (
                <span
                  className="tag"
                  style={{ backgroundColor: '#58a6ff', color: 'white' }}
                >
                  Working: {agent.currentTask}
                </span>
              )}
            </div>

            <div style={{ marginBottom: '15px' }}>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${agent.coordination * 10}%`,
                    backgroundColor: getCoordinationColor(agent.coordination),
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
                Coordination Level: {agent.coordination.toFixed(1)}/10
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {!connectionStatus[agent.id] ? (
                <button
                  className="btn"
                  onClick={() => handleConnectAgent(agent.id)}
                  disabled={!agent.online}
                  style={{ flex: 1 }}
                >
                  {agent.online ? 'Connect' : 'Offline'}
                </button>
              ) : (
                <button
                  className="btn btn-danger"
                  onClick={() => handleDisconnectAgent(agent.id)}
                  style={{ flex: 1 }}
                >
                  Disconnect
                </button>
              )}

              <button
                className="btn btn-secondary"
                onClick={() =>
                  setSelectedAgent(selectedAgent === agent.id ? null : agent.id)
                }
                style={{ flex: 1 }}
              >
                Details
              </button>
            </div>

            {selectedAgent === agent.id && (
              <div
                style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#21262d',
                  borderRadius: '6px',
                  border: '1px solid #30363d',
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>
                  Agent Details
                </h4>
                <div style={{ fontSize: '0.9rem', color: '#8b949e' }}>
                  <div>
                    <strong>ID:</strong> {agent.id}
                  </div>
                  <div>
                    <strong>Last Activity:</strong>{' '}
                    {new Date(agent.lastActivity).toLocaleString()}
                  </div>
                  <div>
                    <strong>Current Task:</strong> {agent.currentTask || 'None'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#8b949e' }}>
          No agents available. Please check your Helix Unified backend
          connection.
        </div>
      )}
    </div>
  );
};

export default AgentPanel;
