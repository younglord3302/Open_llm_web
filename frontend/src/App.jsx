import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, MessageSquare, Cpu, Database, Bot,
  Plus, Trash2, Settings, LogOut, ChevronDown, Code,
  Search, FileText, Key, Image, Puzzle
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import ChatWorkspace from './components/ChatWorkspace';
import ModelManager from './components/ModelManager';
import KnowledgeBase from './components/KnowledgeBase';
import AgentMarketplace from './components/AgentMarketplace';
import SettingsPage from './components/SettingsPage';
import LoginPage from './components/LoginPage';
import ModelArena from './components/ModelArena';
import Toast from './components/Toast';
import WebDevWorkspace from './components/WebDevWorkspace';
import FineTunePage from './components/FineTunePage';
import PromptTemplates from './components/PromptTemplates';
import ImageGenerator from './components/ImageGenerator';
import SearchPage from './components/SearchPage';
import ApiKeyManager from './components/ApiKeyManager';
import PluginManager from './components/PluginManager';
import { api, AuthError } from './utils/api';

export default function App() {
  const [user, setUser]                   = useState(() => {
    try { return JSON.parse(localStorage.getItem('llm_user')); } catch { return null; }
  });
  const [view, setView]                   = useState('dashboard');
  const [chats, setChats]                 = useState([]);
  const [activeChat, setActiveChat]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [models, setModels]               = useState([]);
  const [documents, setDocuments]         = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [activeModelId, setActiveModelId] = useState('mock-model');
  const [activeAgentId, setActiveAgentId] = useState(null);
  const [toasts, setToasts]               = useState([]);
  const [userMenuOpen, setUserMenuOpen]   = useState(false);

  const addToast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substring(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const handleAuthError = useCallback(() => {
    localStorage.removeItem('llm_token');
    localStorage.removeItem('llm_user');
    setUser(null);
    addToast('Session expired. Please sign in again.', 'error');
  }, [addToast]);

  const handleLogin = (userData) => {
    setUser(userData);
    addToast(`Welcome back, ${userData.name || userData.email}! 👋`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('llm_token');
    localStorage.removeItem('llm_user');
    setUser(null);
    setChats([]);
    setMessages([]);
    setActiveChat(null);
    setUserMenuOpen(false);
    addToast('Signed out successfully.', 'info');
  };

  const fetchChats = useCallback(async () => {
    try { const res = await api.get('/api/chats'); setChats(await res.json()); }
    catch (e) { if (e instanceof AuthError) handleAuthError(); }
  }, [handleAuthError]);

  const fetchModels = useCallback(async () => {
    try {
      const res = await api.get('/api/models');
      const data = await res.json();
      setModels(data);
      const active = data.find(m => m.active);
      if (active) setActiveModelId(active.id);
    } catch (e) { if (e instanceof AuthError) handleAuthError(); }
  }, [handleAuthError]);

  const fetchDocuments = useCallback(async () => {
    try { const res = await api.get('/api/documents'); setDocuments(await res.json()); }
    catch (e) { if (e instanceof AuthError) handleAuthError(); }
  }, [handleAuthError]);

  const fetchMessages = useCallback(async (chatId) => {
    try { const res = await api.get(`/api/messages/${chatId}`); setMessages(await res.json()); }
    catch (e) { if (e instanceof AuthError) handleAuthError(); }
  }, [handleAuthError]);

  useEffect(() => { if (!user) return; fetchChats(); fetchModels(); fetchDocuments(); }, [user, fetchChats, fetchModels, fetchDocuments]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
      setActiveModelId(activeChat.model_id || 'mock-model');
      setActiveAgentId(activeChat.agent_id);
    } else { setMessages([]); }
  }, [activeChat, fetchMessages]);

  const handleSelectModel = async (modelId) => {
    try {
      const res = await api.post('/api/models/select', { id: modelId });
      if (res.ok) { setActiveModelId(modelId); fetchModels(); addToast('Model updated.', 'success'); }
    } catch (e) { if (e instanceof AuthError) handleAuthError(); }
  };

  const createNewChat = async (title = 'New Chat', modelId = activeModelId, agentId = null) => {
    try {
      const res = await api.post('/api/chats', { title, model_id: modelId, agent_id: agentId });
      const newChat = await res.json();
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat); setView('chat'); setActiveAgentId(agentId);
      return newChat;
    } catch (e) { if (e instanceof AuthError) handleAuthError(); return null; }
  };

  const handleDeleteChat = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await api.delete(`/api/chats/${id}`);
      if (res.ok) {
        setChats(prev => prev.filter(c => c.id !== id));
        if (activeChat?.id === id) { setActiveChat(null); setView('dashboard'); }
        addToast('Chat deleted.', 'info');
      }
    } catch (e) { if (e instanceof AuthError) handleAuthError(); }
  };

  const togglePin = async (id, e) => {
    e.stopPropagation();
    try { await api.post(`/api/chats/${id}/pin`, {}); fetchChats(); }
    catch (e) { if (e instanceof AuthError) handleAuthError(); }
  };

  const handleToggleDocSelect = (docId) => {
    setSelectedDocIds(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  };

  const getDashboardStats = () => ({
    chatsCount: chats.length,
    modelsCount: models.filter(m => m.provider !== 'mock' && m.enabled).length || 1,
    documentsCount: documents.length
  });

  const activeModelDetails = models.find(m => m.id === activeModelId) || models.find(m => m.active) || { name: 'Autodetecting...' };

  if (!user) {
    return (<><LoginPage onLogin={handleLogin} /><Toast toasts={toasts} /></>);
  }

  return (
    <div className="app-container">
      <Toast toasts={toasts} />
      <aside className="sidebar">
        <div className="sidebar-header"><div className="logo-icon">🤖</div><span className="logo-text">OpenLLM UI</span></div>
        <button className="new-chat-btn" onClick={() => createNewChat()}><Plus size={16} /> New Chat Session</button>
        <div className="chat-history">
          <label style={{ padding: '0 12px 6px 12px' }}>History</label>
          {[...chats.filter(c => c.pinned), ...chats.filter(c => !c.pinned)].map(item => (
            <div key={item.id} className={`chat-history-item ${activeChat?.id === item.id && view === 'chat' ? 'active' : ''}`}
              onClick={() => { setActiveChat(item); setView('chat'); }}>
              <span style={{ fontSize: '0.8rem' }}>{item.pinned ? '📌 ' : ''}</span>
              <div className="chat-title-text">{item.title}</div>
              <button className="delete-chat-btn" onClick={(e) => togglePin(item.id, e)} title="Pin/Unpin">📌</button>
              <button className="delete-chat-btn" onClick={(e) => handleDeleteChat(item.id, e)}><Trash2 size={13} /></button>
            </div>
          ))}
          {chats.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '12px', textAlign: 'center' }}>No chats yet.</div>}
        </div>
        <div className="sidebar-footer">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
            { id: 'chat', label: 'Chat Workspace', icon: <MessageSquare size={18} /> },
            { id: 'arena', label: 'Model Arena', icon: <Cpu size={18} /> },
            { id: 'models', label: 'Model Manager', icon: <Database size={18} /> },
            { id: 'knowledge', label: 'Knowledge Base', icon: <Bot size={18} /> },
            { id: 'agents', label: 'Agent Marketplace', icon: <Bot size={18} /> },
            { id: 'search', label: 'Search', icon: <Search size={18} /> },
            { id: 'prompts', label: 'Prompt Templates', icon: <FileText size={18} /> },
            { id: 'images', label: 'Image Gen', icon: <Image size={18} /> },
            { id: 'webdev', label: 'Web Dev Studio', icon: <Code size={18} /> },
            { id: 'finetune', label: 'Fine-Tune', icon: <Database size={18} /> },
            { id: 'plugins', label: 'Plugins', icon: <Puzzle size={18} /> },
            { id: 'keys', label: 'API Keys', icon: <Key size={18} /> },
            { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
          ].map(nav => (
            <div key={nav.id} className={`nav-item ${view === nav.id ? 'active' : ''}`}
              onClick={() => { if (nav.id === 'chat' && !activeChat && chats.length > 0) setActiveChat(chats[0]); setView(nav.id); }}>
              {nav.icon}<span>{nav.label}</span>
            </div>
          ))}
        </div>
      </aside>
      <main className="main-content">
        <header className="top-nav">
          <div className="nav-section"><span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Workspace</span><span style={{ color: 'var(--border-subtle)' }}>/</span><span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{view}</span></div>
          <div className="nav-section" style={{ gap: '12px' }}>
            <div className="model-pill" onClick={() => setView('models')}>
              <span className={`status-dot ${activeModelDetails.provider === 'mock' ? 'offline' : ''}`} /><span>{activeModelDetails.name}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <button className="user-menu-btn" onClick={() => setUserMenuOpen(p => !p)}>
                <div className="user-avatar">{(user.name || user.email)[0].toUpperCase()}</div>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.name || user.email}</span>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {userMenuOpen && (
                <div className="user-dropdown">
                  <div className="user-dropdown-header">
                    <div className="user-avatar" style={{ width: 36, height: 36, fontSize: '1rem' }}>{(user.name || user.email)[0].toUpperCase()}</div>
                    <div><div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div></div>
                  </div>
                  <button className="user-dropdown-item" onClick={() => { setView('settings'); setUserMenuOpen(false); }}><Settings size={14} /> Settings</button>
                  <button className="user-dropdown-item danger" onClick={handleLogout}><LogOut size={14} /> Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {view === 'dashboard' && <Dashboard stats={getDashboardStats()} setView={setView} createNewChat={createNewChat} />}
        {view === 'chat' && (
          <ChatWorkspace chat={activeChat} messages={messages}
            onSendMessage={(msg) => { if (msg === null) { if (activeChat) fetchMessages(activeChat.id); } else { setMessages(prev => [...prev, { id: Math.random().toString(36), role: 'user', content: msg, timestamp: new Date().toISOString() }]); } }}
            activeModelId={activeModelId} activeAgentId={activeAgentId} documents={documents}
            selectedDocIds={selectedDocIds} onToggleDocSelect={handleToggleDocSelect}
            onCreateChat={createNewChat} addToast={addToast} onAuthError={handleAuthError} />
        )}
        {view === 'arena' && <ModelArena models={models} addToast={addToast} onAuthError={handleAuthError} />}
        {view === 'models' && <ModelManager models={models} onRefresh={fetchModels} onSelectModel={handleSelectModel} activeModelId={activeModelId} addToast={addToast} onAuthError={handleAuthError} />}
        {view === 'knowledge' && <KnowledgeBase documents={documents} onRefreshDocs={fetchDocuments} selectedDocIds={selectedDocIds} onToggleDocSelect={handleToggleDocSelect} addToast={addToast} onAuthError={handleAuthError} />}
        {view === 'agents' && <AgentMarketplace createNewChat={createNewChat} onAuthError={handleAuthError} />}
        {view === 'webdev' && <WebDevWorkspace models={models} addToast={addToast} onAuthError={handleAuthError} />}
        {view === 'search' && <SearchPage addToast={addToast} onAuthError={handleAuthError} onSelectChat={(chatId) => { const c = chats.find(ch => ch.id === chatId); if(c){setActiveChat(c);setView('chat');}} } />}
        {view === 'prompts' && <PromptTemplates addToast={addToast} onAuthError={handleAuthError} />}
        {view === 'images' && <ImageGenerator addToast={addToast} onAuthError={handleAuthError} />}
        {view === 'finetune' && <FineTunePage addToast={addToast} />}
        {view === 'plugins' && <PluginManager addToast={addToast} onAuthError={handleAuthError} />}
        {view === 'keys' && <ApiKeyManager addToast={addToast} onAuthError={handleAuthError} />}
        {view === 'settings' && <SettingsPage user={user} addToast={addToast} onLogout={handleLogout} />}
      </main>
    </div>
  );
}