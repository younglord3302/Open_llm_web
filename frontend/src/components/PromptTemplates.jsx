import { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Search, Copy } from 'lucide-react';
import { api, AuthError } from '../utils/api';

const CATEGORIES = ['general', 'coding', 'writing', 'analysis', 'custom'];

export default function PromptTemplates({ addToast, onAuthError }) {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editTemplate, setEditTemplate] = useState({ name: '', content: '', category: 'general' });

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/prompts');
      setTemplates(await res.json());
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const saveTemplate = async () => {
    if (!editTemplate.name.trim() || !editTemplate.content.trim()) {
      addToast('Name and content are required', 'error'); return;
    }
    try {
      const res = await api.post('/api/prompts', editTemplate);
      if (res.ok) {
        addToast('Template saved', 'success');
        setShowEditor(false);
        setEditTemplate({ name: '', content: '', category: 'general' });
        fetchTemplates();
      }
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  const deleteTemplate = async (id) => {
    try {
      await api.delete(`/api/prompts/${id}`);
      addToast('Template deleted', 'info');
      fetchTemplates();
    } catch (e) { if (e instanceof AuthError) onAuthError(); }
  };

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="view-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Prompt Templates</h1>
          <p>Save, manage, and reuse prompt templates across conversations.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowEditor(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> New Template
        </button>
      </div>

      {showEditor && (
        <div className="glass-card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>{editTemplate.id ? 'Edit' : 'New'} Template</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" placeholder="Template name" value={editTemplate.name}
              onChange={e => setEditTemplate({...editTemplate, name: e.target.value})} style={{ padding: '8px', fontSize: '0.9rem' }} />
            <select value={editTemplate.category} onChange={e => setEditTemplate({...editTemplate, category: e.target.value})}
              style={{ padding: '8px', fontSize: '0.9rem' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <textarea rows={6} placeholder="Template content (use {{variable}} for placeholders)" value={editTemplate.content}
              onChange={e => setEditTemplate({...editTemplate, content: e.target.value})} style={{ padding: '8px', fontSize: '0.85rem', fontFamily: 'monospace' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="primary-btn" onClick={saveTemplate}><Save size={14} /> Save</button>
              <button className="secondary-btn" onClick={() => setShowEditor(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '0.85rem' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map(t => (
          <div key={t.id} className="glass-card" style={{ padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</span>
                <span className="health-pill" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{t.category}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '40px' }}>{t.content}</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button className="prompt-icon-btn" title="Copy" onClick={() => { navigator.clipboard.writeText(t.content); addToast('Copied!', 'success'); }}>
                <Copy size={14} />
              </button>
              <button className="prompt-icon-btn" title="Edit" onClick={() => { setEditTemplate(t); setShowEditor(true); }}>
                <Save size={14} />
              </button>
              <button className="prompt-icon-btn" title="Delete" onClick={() => deleteTemplate(t.id)} style={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
            No templates yet. Click "New Template" to create one.
          </div>
        )}
      </div>
    </div>
  );
}