import { useState, useEffect } from 'react';
import { Trash2, Puzzle, Check, X } from 'lucide-react';
import { api, AuthError } from '../utils/api';

const BUILTIN_HANDLERS = [
  { name: 'Log All Messages', handler: 'logger', description: 'Log all chat messages to console' },
  { name: 'Word Count', handler: 'wordcount', description: 'Append word count to each response' },
  { name: 'Toxicity Filter', handler: 'toxicity', description: 'Warn if content contains toxic language' },
  { name: 'Rate Limiter', handler: 'ratelimit', description: 'Add extra rate limiting per user' },
  { name: 'Custom Webhook', handler: 'webhook', description: 'POST responses to a webhook URL' }
];

export default function PluginManager({ addToast, onAuthError }) {
  const [plugins, setPlugins] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editPlugin, setEditPlugin] = useState({ name: '', handler: '', description: '' });

  const fetchPlugins = async () => {
    try {
      const res = await api.get('/api/plugins');
      setPlugins(await res.json());
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  useEffect(() => { fetchPlugins(); }, []);

  const savePlugin = async () => {
    if (!editPlugin.name.trim() || !editPlugin.handler.trim()) {
      addToast('Name and handler are required', 'error'); return;
    }
    try {
      const res = await api.post('/api/plugins', { ...editPlugin, enabled: true });
      if (res.ok) {
        addToast('Plugin added', 'success');
        setShowAdd(false);
        setEditPlugin({ name: '', handler: '', description: '' });
        fetchPlugins();
      }
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  const deletePlugin = async (id) => {
    try {
      await api.delete(`/api/plugins/${id}`);
      addToast('Plugin removed', 'info');
      fetchPlugins();
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  return (
    <div className="view-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Plugin System</h1>
          <p>Extend functionality with plugins. Each plugin runs on every chat message.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Puzzle size={16} /> Add Plugin
        </button>
      </div>

      {showAdd && (
        <div className="glass-card" style={{ marginBottom: '16px', padding: '16px' }}>
          <h3 style={{ marginBottom: '10px' }}>New Plugin</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Built-in Handlers</label>
            <select onChange={e => {
              const h = BUILTIN_HANDLERS.find(b => b.handler === e.target.value);
              if (h) setEditPlugin(h);
            }} style={{ width: '100%', padding: '8px' }}>
              <option value="">Select a built-in handler…</option>
              {BUILTIN_HANDLERS.map(h => <option key={h.handler} value={h.handler}>{h.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Plugin name" value={editPlugin.name}
              onChange={e => setEditPlugin({...editPlugin, name: e.target.value})} style={{ padding: '8px', fontSize: '0.9rem' }} />
            <input type="text" placeholder="Handler ID (e.g., logger)" value={editPlugin.handler}
              onChange={e => setEditPlugin({...editPlugin, handler: e.target.value})} style={{ padding: '8px', fontSize: '0.85rem', fontFamily: 'monospace' }} />
            <input type="text" placeholder="Description (optional)" value={editPlugin.description}
              onChange={e => setEditPlugin({...editPlugin, description: e.target.value})} style={{ padding: '8px', fontSize: '0.85rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button className="primary-btn" onClick={savePlugin}><Check size={14} /> Save</button>
            <button className="secondary-btn" onClick={() => setShowAdd(false)}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {plugins.map(p => (
          <div key={p.id} className="glass-card" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Puzzle size={18} style={{ color: 'var(--accent-purple)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.handler}</div>
                {p.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.description}</div>}
              </div>
            </div>
            <button className="prompt-icon-btn" onClick={() => deletePlugin(p.id)} style={{ color: '#ef4444' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {plugins.length === 0 && !showAdd && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
            No plugins installed. Click "Add Plugin" to extend functionality.
          </div>
        )}
      </div>
    </div>
  );
}