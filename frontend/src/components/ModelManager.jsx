import { useState } from 'react';
import { Check, RefreshCw, Server, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { api, AuthError } from '../utils/api';
import { useWebSocket } from '../utils/useWebSocket';

export default function ModelManager({ models, onRefresh, onSelectModel, activeModelId, addToast, onAuthError }) {
  const { connected, lastUpdate } = useWebSocket();
  const [endpoints, setEndpoints] = useState({
    ollama: 'http://127.0.0.1:11434',
    lmstudio: 'http://127.0.0.1:1234'
  });
  const [testingId, setTestingId] = useState(null);
  const [testResult, setTestResult] = useState({});

  const handleEndpointChange = (provider, value) => {
    setEndpoints(prev => ({ ...prev, [provider]: value }));
  };

  const saveAndConnect = async (model) => {
    setTestingId(model.id);
    setTestResult(prev => ({ ...prev, [model.id]: 'connecting' }));
    try {
      const response = await api.post('/api/models/connect', {
        id: model.id,
        enabled: true,
        endpoint: endpoints[model.provider]
      });
      const data = await response.json();
      if (response.ok && data.healthy) {
        setTestResult(prev => ({ ...prev, [model.id]: 'healthy' }));
        addToast(`${model.name} connected successfully!`, 'success');
        onRefresh();
      } else {
        setTestResult(prev => ({ ...prev, [model.id]: 'offline' }));
        addToast(`${model.name} is unreachable. Is it running?`, 'error');
      }
    } catch (e) {
      if (e instanceof AuthError) { onAuthError(); return; }
      setTestResult(prev => ({ ...prev, [model.id]: 'offline' }));
      addToast('Connection test failed.', 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleToggle = async (model, currentVal) => {
    try {
      const response = await api.post('/api/models/connect', {
        id: model.id,
        enabled: !currentVal
      });
      if (response.ok) {
        onRefresh();
        addToast(`${model.name} ${!currentVal ? 'enabled' : 'disabled'}.`, 'info');
      }
    } catch (e) {
      if (e instanceof AuthError) onAuthError();
    }
  };

  // Split models into base connection templates and auto-discovered models by ID
  const templates = models.filter(m => m.id === 'mock-model' || m.id === 'ollama-default' || m.id === 'lmstudio-default');
  const discovered = models.filter(m => m.id !== 'mock-model' && m.id !== 'ollama-default' && m.id !== 'lmstudio-default');

  return (
    <div className="view-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Model & Endpoint Manager</h1>
          <p>Configure connections to your local LLM services and choose your default model.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: connected ? '#10b981' : '#ef4444' }}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{connected ? 'Live' : 'Offline'}</span>
            {lastUpdate && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Updated {new Date(lastUpdate).toLocaleTimeString()}</span>}
          </div>
          <button className="secondary-btn" onClick={onRefresh} style={{ padding: '8px 16px' }}>
            <RefreshCw size={16} /> Scan Endpoints
          </button>
        </div>
      </div>

      <div className="grid-2">
        {/* Connection Setup */}
        <div className="glass-card">
          <h2>Local Integrations</h2>
          <p style={{ marginBottom: '20px' }}>Setup links to Ollama / LM Studio. Make sure they are running locally with CORS allowed.</p>

          {templates.map(model => {
            if (model.provider === 'mock') return null;
            const status = testResult[model.id] || (model.enabled ? 'connected' : 'disabled');
            return (
              <div key={model.id} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server size={18} style={{ color: 'var(--accent-purple)' }} />
                    <span style={{ fontWeight: 600 }}>{model.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label className="health-pill healthy" style={{ textTransform: 'none', margin: 0, padding: '2px 8px' }}>
                      <input
                        type="checkbox"
                        checked={model.enabled}
                        onChange={() => handleToggle(model, model.enabled)}
                        style={{ marginRight: '6px', cursor: 'pointer' }}
                      /> Enabled
                    </label>
                    {status === 'healthy'     && <span className="health-pill healthy">Connected</span>}
                    {status === 'offline'     && <span className="health-pill unhealthy">Unreachable</span>}
                    {status === 'connecting'  && <span className="health-pill" style={{ color: '#f59e0b' }}>Testing…</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={endpoints[model.provider] || model.endpoint}
                    onChange={e => handleEndpointChange(model.provider, e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    placeholder="http://localhost:port"
                    disabled={!model.enabled}
                  />
                  <button
                    className="primary-btn"
                    onClick={() => saveAndConnect(model)}
                    disabled={!model.enabled || testingId === model.id}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    {testingId === model.id ? 'Testing…' : 'Test & Save'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guide */}
        <div className="glass-card" style={{ background: 'rgba(59,130,246,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <AlertCircle size={24} style={{ color: 'var(--accent-blue)' }} />
            <h2 style={{ margin: 0 }}>Connection Guide</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <div>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>1. Ollama:</span>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Run with CORS enabled:<br />
                <code>OLLAMA_ORIGINS="*" ollama serve</code>
              </p>
            </div>
            <div>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>2. LM Studio:</span>
              <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                Open LM Studio → Local Server tab → Start Server. CORS is enabled by default on port 1234.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Discovered models list */}
      <div className="glass-card">
        <h2>Discovered Models</h2>
        <p style={{ marginBottom: '16px' }}>Select the active model to use for queries. Auto-discovered from connected endpoints.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Mock model always shown */}
          {templates.filter(m => m.provider === 'mock').map(model => (
            <div
              key={model.id}
              className={`model-pill ${activeModelId === model.id ? 'active' : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px', padding: '16px', border: activeModelId === model.id ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)', background: activeModelId === model.id ? 'rgba(139,92,246,0.05)' : 'var(--bg-secondary)', cursor: 'pointer' }}
              onClick={() => onSelectModel(model.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="status-dot" style={{ backgroundColor: 'var(--accent-purple)', boxShadow: '0 0 8px var(--accent-purple)' }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{model.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Built-in simulation — zero setup required.</div>
                </div>
              </div>
              {activeModelId === model.id && <Check size={18} style={{ color: 'var(--accent-purple)' }} />}
            </div>
          ))}

          {discovered.map(model => (
            <div
              key={model.id}
              className={`model-pill ${activeModelId === model.id ? 'active' : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px', padding: '16px', border: activeModelId === model.id ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)', background: activeModelId === model.id ? 'rgba(139,92,246,0.05)' : 'var(--bg-secondary)', cursor: 'pointer' }}
              onClick={() => onSelectModel(model.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="status-dot" />
                <div>
                  <div style={{ fontWeight: 600 }}>{model.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Provider: {model.provider.toUpperCase()} · {model.endpoint}</div>
                </div>
              </div>
              {activeModelId === model.id && <Check size={18} style={{ color: 'var(--accent-purple)' }} />}
            </div>
          ))}

          {discovered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
              No local models detected. Enable Ollama or LM Studio then click <strong>Scan Endpoints</strong>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
