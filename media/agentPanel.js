// React-based Agent Panel for VSCode Web View
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const AgentCard = ({ agent, onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Simulate connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      onConnect(agent.id);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      style={{
        border: `2px solid ${agent.color}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        backgroundColor: '#1e1e1e',
        transition: 'all 0.3s ease',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>{agent.emoji}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#ffffff' }}>
              {agent.name}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>
              {agent.role}
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: agent.online ? '#28a745' : '#666',
            }}
          ></div>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {agent.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {agent.capabilities.map(capability => (
            <span
              key={capability}
              style={{
                fontSize: '10px',
                backgroundColor: '#333',
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#ccc',
              }}
            >
              {capability}
            </span>
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#888' }}>Performance</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
            {agent.coordination}/10
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={handleConnect}
          disabled={!agent.online || isConnecting}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: agent.online ? agent.color : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: agent.online ? 'pointer' : 'not-allowed',
            opacity: agent.online ? 1 : 0.5,
          }}
        >
          {isConnecting
            ? 'Connecting...'
            : agent.online
              ? 'Connect'
              : 'Offline'}
        </button>
        <button
          onClick={() =>
            window.vscode.postMessage({
              command: 'analyzeCode',
              agentId: agent.id,
            })
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
          Analyze Code
        </button>
      </div>
    </div>
  );
};

const AgentPanel = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for agent updates from the extension host
    const handleMessage = event => {
      const message = event.data;
      if (message.command === 'updateAgents' && message.agents) {
        setAgents(message.agents);
        setLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);

    // Request agent data from extension host
    window.vscode.postMessage({ command: 'refreshAgents' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = agentId => {
    window.vscode.postMessage({
      command: 'connectToAgent',
      agentId: agentId,
    });
  };

  const handleAnalyzeCode = () => {
    window.vscode.postMessage({
      command: 'analyzeCode',
    });
  };

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
        <h1 style={{ margin: 0, fontSize: '24px' }}>Agent Panel</h1>
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          <button
            onClick={handleAnalyzeCode}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Quick Analysis
          </button>
          <button
            onClick={() =>
              window.vscode.postMessage({ command: 'refreshAgents' })
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

      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            color: '#888',
          }}
        >
          Loading agents...
        </div>
      ) : (
        <div>
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#2d2d2d',
              borderRadius: '8px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px', color: '#888' }}>
              Connected Agents: {agents.filter(a => a.online).length}/
              {agents.length}
            </h3>
          </div>

          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onConnect={handleConnect} />
          ))}
        </div>
      )}
    </div>
  );
};

// Initialize React
ReactDOM.render(<AgentPanel />, document.getElementById('root'));
