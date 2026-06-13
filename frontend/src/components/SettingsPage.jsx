import { useState, useEffect } from 'react';
import {
  Palette, Server, Shield, Bell,
  Save, RotateCcw, LogOut, Trash2
} from 'lucide-react';

const DEFAULTS = {
  theme: 'dark',
  fontSize: 'medium',
  apiUrl: 'http://localhost:5000',
  streamingSpeed: 'fast',
  notifications: true,
  tts: false,
  defaultModel: 'mock-model',
};

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function Section({ title, icon, children }) {
  return (
    <div className="glass-card" style={{ marginBottom: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ color: 'var(--accent-purple)' }}>{icon}</span>
        <h2 style={{ margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Row({ label, sublabel, children }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '12px 0',
      borderBottom: '1px solid var(--border-subtle)'
    }}>
      <div>
        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{sublabel}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--accent-purple)' : 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.25s'
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: value ? 22 : 2, width: 18, height: 18,
        borderRadius: '50%', background: '#fff',
        transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
      }} />
    </button>
  );
}

export default function SettingsPage({ user, addToast, onLogout }) {
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('llm_prefs') || '{}') }; }
    catch { return DEFAULTS; }
  });
  const [saved, setSaved] = useState(false);

  const set = (key, val) => setPrefs(p => ({ ...p, [key]: val }));

  const save = () => {
    localStorage.setItem('llm_prefs', JSON.stringify(prefs));
    setSaved(true);
    addToast('Settings saved!', 'success');
    setTimeout(() => setSaved(false), 2000);
    // Apply font size immediately
    const sizes = { small: '13px', medium: '15px', large: '17px' };
    document.documentElement.style.fontSize = sizes[prefs.fontSize] || '15px';
    applyTheme(prefs.theme);
  };

  const reset = () => {
    setPrefs(DEFAULTS);
    localStorage.removeItem('llm_prefs');
    addToast('Settings reset to defaults.', 'info');
  };

  const clearData = () => {
    if (!confirm('This will clear all local chat history and documents. Continue?')) return;
    localStorage.removeItem('llm_prefs');
    addToast('Local data cleared.', 'info');
  };

  // Apply saved font size and theme on mount
  useEffect(() => {
    const sizes = { small: '13px', medium: '15px', large: '17px' };
    document.documentElement.style.fontSize = sizes[prefs.fontSize] || '15px';
    applyTheme(prefs.theme);
  }, []);

  const selectStyle = {
    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)', borderRadius: 8,
    padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer'
  };

  return (
    <div className="view-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <h1 style={{ marginBottom: 8 }}>Settings</h1>
          <p>Customize your Local AI Workspace experience.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-btn" onClick={reset} style={{ padding: '8px 16px' }}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="primary-btn" onClick={save} style={{ padding: '8px 20px' }}>
            <Save size={14} /> {saved ? 'Saved ✓' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Account */}
        <Section title="Account" icon={<Shield size={18} />}>
          <Row label="Signed in as" sublabel={user?.email}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="user-avatar">{(user?.name || user?.email || 'U')[0].toUpperCase()}</div>
              <span style={{ fontWeight: 500 }}>{user?.name || 'Local User'}</span>
            </div>
          </Row>
          <Row label="Sign Out" sublabel="You will need to sign in again to access the workspace.">
            <button className="secondary-btn" style={{ padding: '6px 14px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={onLogout}>
              <LogOut size={14} /> Sign Out
            </button>
          </Row>
        </Section>

        {/* Appearance */}
        <Section title="Appearance" icon={<Palette size={18} />}>
          <Row label="Theme" sublabel="Switch between dark and light mode.">
            <select value={prefs.theme} onChange={e => set('theme', e.target.value)} style={selectStyle}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </Row>
          <Row label="Font Size" sublabel="Applies to the entire interface.">
            <select value={prefs.fontSize} onChange={e => set('fontSize', e.target.value)} style={selectStyle}>
              <option value="small">Small (13px)</option>
              <option value="medium">Medium (15px)</option>
              <option value="large">Large (17px)</option>
            </select>
          </Row>
          <Row label="Streaming Speed" sublabel="How fast mock responses stream word-by-word.">
            <select value={prefs.streamingSpeed} onChange={e => set('streamingSpeed', e.target.value)} style={selectStyle}>
              <option value="slow">Slow (50ms)</option>
              <option value="fast">Fast (25ms)</option>
              <option value="instant">Instant (5ms)</option>
            </select>
          </Row>
        </Section>

        {/* Backend */}
        <Section title="Backend & API" icon={<Server size={18} />}>
          <Row label="Backend URL" sublabel="The URL where your backend server is running.">
            <input
              type="text"
              value={prefs.apiUrl}
              onChange={e => set('apiUrl', e.target.value)}
              style={{ ...selectStyle, width: 240 }}
              placeholder="http://localhost:5000"
            />
          </Row>
          <Row label="Default Model" sublabel="Model used when creating new chats.">
            <select value={prefs.defaultModel} onChange={e => set('defaultModel', e.target.value)} style={selectStyle}>
              <option value="mock-model">Mock Fast LLM (Fallback)</option>
              <option value="ollama-default">Ollama Autodetect</option>
              <option value="lmstudio-default">LM Studio Autodetect</option>
            </select>
          </Row>
        </Section>

        {/* Notifications & Voice */}
        <Section title="Notifications & Voice" icon={<Bell size={18} />}>
          <Row label="Toast Notifications" sublabel="Show success/error pop-up messages.">
            <Toggle value={prefs.notifications} onChange={v => set('notifications', v)} />
          </Row>
          <Row label="Text-to-Speech by default" sublabel="Auto-read assistant responses aloud.">
            <Toggle value={prefs.tts} onChange={v => set('tts', v)} />
          </Row>
        </Section>

        {/* Danger zone */}
        <Section title="Data Management" icon={<Trash2 size={18} />}>
          <Row label="Clear Preferences" sublabel="Reset all settings to factory defaults.">
            <button className="secondary-btn" onClick={reset} style={{ padding: '6px 14px', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
              <RotateCcw size={13} /> Reset Preferences
            </button>
          </Row>
          <Row label="Clear Local Storage" sublabel="Removes all cached preferences from this browser.">
            <button className="secondary-btn" onClick={clearData} style={{ padding: '6px 14px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
              <Trash2 size={13} /> Clear Data
            </button>
          </Row>
        </Section>

        {/* Version info */}
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '8px 0' }}>
          Local AI Workspace · v1.1.0 · Privacy-first · All data stays on your machine
        </div>

      </div>
    </div>
  );
}
