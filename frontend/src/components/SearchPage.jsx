import { useState } from 'react';
import { Search, MessageSquare, Clock } from 'lucide-react';
import { api, AuthError } from '../utils/api';

export default function SearchPage({ addToast, onAuthError, onSelectChat }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearched(true);
    try {
      const res = await api.post('/api/search', { query });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      if (e instanceof AuthError) onAuthError();
      addToast('Search failed', 'error');
    }
  };

  return (
    <div className="view-panel">
      <h1 style={{ marginBottom: '8px' }}>Conversation Search</h1>
      <p style={{ marginBottom: '20px' }}>Full-text search across all your chat messages.</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search all messages…" value={query}
            onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '0.9rem' }} />
        </div>
        <button className="primary-btn" onClick={handleSearch}>Search</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {results.map(msg => (
          <div key={msg.id} className="glass-card" style={{ padding: '14px', cursor: 'pointer' }}
            onClick={() => onSelectChat && onSelectChat(msg.chat_id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <MessageSquare size={14} style={{ color: 'var(--accent-blue)' }} />
                <span style={{ color: 'var(--accent-blue)', fontWeight: 500 }}>{msg.chat_title}</span>
                <span className={`health-pill ${msg.role === 'user' ? 'healthy' : ''}`} style={{ fontSize: '0.65rem' }}>
                  {msg.role}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Clock size={12} /> {new Date(msg.timestamp).toLocaleString()}
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '3em' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {searched && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
            No messages found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
}