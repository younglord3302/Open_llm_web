import { useState, useEffect } from 'react';
import { Plus, Trash2, Key } from 'lucide-react';
import { api, AuthError } from '../utils/api';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'stability', name: 'Stability AI', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'cohere', name: 'Cohere', placeholder: '...' },
  { id: 'together', name: 'Together AI', placeholder: '...' },
  { id: 'replicate', name: 'Replicate', placeholder: 'r8_...' }
];

export default function ApiKeyManager({ addToast, onAuthError }) {
  const [keys, setKeys] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState({ provider: 'openai', key: '' });

  const fetchKeys = async () => {
    try {
      const res = await api.get('/api/keys');
      setKeys(await res.json());
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  useEffect(() => { fetchKeys(); }, []);

  const addKey = async () => {
    if (!newKey.key.trim()) { addToast('API key is required', 'error'); return; }
    try {
      const res = await api.post('/api/keys', newKey);
      if (res.ok) {
        addToast('API key saved', 'success');
        setNewKey({ provider: 'openai', key: '' });
        setShowAdd(false);
        fetchKeys();
      }
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  const deleteKey = async (id) => {
    try {
      await api.delete(`/api/keys/${id}`);
      addToast('Key deleted', 'info');
      fetchKeys();
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  return (
    <div className="view-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>API Key Management</h1>
          <p>Store and manage API keys for external LLM and image generation providers.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Add Key
        </button>
      </div>

      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '16px', padding: '16px' }}>
          <h3 style={{ marginBottom: '10px' }}>New API Key</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <select value={newKey.provider} onChange={e => setNewKey({...newKey, provider: e.target.value})} style={{ padding: '8px' }}>
              {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="password" placeholder={PROVIDERS.find(p => p.id === newKey.provider)?.placeholder || 'API key'}
              value={newKey.key} onChange={e => setNewKey({...newKey, key: e.target.value})} style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="primary-btn" onClick={addKey}>Save</button>
            <button className="secondary-btn" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {keys.map(k => (
          <div key={k.id} className="glass-card" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Key size={18} style={{ color: 'var(--accent-purple)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{k.provider}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{k.key}</div>
              </div>
            </div>
            <button className="prompt-icon-btn" onClick={() => deleteKey(k.id)} style={{ color: '#ef4444' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {keys.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
            No API keys configured. Add keys for external providers like OpenAI, Stability AI, etc.
          </div>
        )}
      </div>
    </div>
  );
}