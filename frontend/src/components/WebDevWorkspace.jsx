import React, { useState, useEffect } from 'react';
import { Send, Code, Layout, Server, CheckCircle, Loader2, Database, Cloud, TestTube, Palette } from 'lucide-react';
import WorkspacePanel from './WorkspacePanel';
import { api, AuthError } from '../utils/api';

const ROLES = [
  { id: 'architect', name: 'Web Architect', icon: <Layout size={16} />, description: 'Plans structure & tech stack' },
  { id: 'ux', name: 'UI/UX Designer', icon: <Palette size={16} />, description: 'Layout, accessibility & user flow' },
  { id: 'frontend', name: 'Frontend Coder', icon: <Code size={16} />, description: 'Writes React/Tailwind UI' },
  { id: 'backend', name: 'Backend Coder', icon: <Server size={16} />, description: 'Writes Node.js/Express APIs' },
  { id: 'database', name: 'Database Designer', icon: <Database size={16} />, description: 'Designs SQL/NoSQL schemas' },
  { id: 'qa', name: 'QA Tester', icon: <TestTube size={16} />, description: 'Writes test cases & finds edge cases' },
  { id: 'devops', name: 'DevOps Engineer', icon: <Cloud size={16} />, description: 'Docker, CI/CD & deployment' },
  { id: 'reviewer', name: 'Code Reviewer', icon: <CheckCircle size={16} />, description: 'Reviews for bugs & security' }
];

export default function WebDevWorkspace({ models, addToast, onAuthError }) {
  const [roleAssignments, setRoleAssignments] = useState({});
  const [prompt, setPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]); // { agent, type: 'start'|'chunk'|'done', content }

  const handleRoleChange = (roleId, modelId) => {
    setRoleAssignments(prev => ({ ...prev, [roleId]: modelId }));
  };

  const handleRun = async () => {
    if (!prompt.trim()) return;
    if (Object.keys(roleAssignments).length === 0) {
      addToast('Please assign at least one model to a role.', 'error');
      return;
    }

    setIsRunning(true);
    setLogs([]);
    
    try {
      const response = await api.stream('/api/webdev/orchestrate', { prompt, roleAssignments });
      if (response.status === 401) { onAuthError(); return; }
      if (!response.ok) throw new Error('Orchestration failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const clean = line.trim();
          if (!clean || !clean.startsWith('data:')) continue;
          const dataStr = clean.substring(5).trim();
          if (dataStr === '[DONE]') {
            setIsRunning(false);
            break;
          }
          try {
            const json = JSON.parse(dataStr);
            if (json.type === 'error') {
              addToast(json.message, 'error');
              setIsRunning(false);
              break;
            }
            setLogs(prev => {
              if (json.type === 'error') {
                return [...prev, { agent: json.agent || 'unknown', type: 'error', content: json.message }];
              }
              
              const existingIndex = prev.findIndex(log => log.agent === json.agent && log.type !== 'error');
              
              if (existingIndex !== -1 && json.type === 'chunk') {
                const updated = [...prev];
                updated[existingIndex] = { 
                  ...updated[existingIndex], 
                  content: updated[existingIndex].content + (json.chunk || '') 
                };
                return updated;
              }
              
              // If it's a 'start' or 'done' or new agent, append it
              return [...prev, { agent: json.agent, type: json.type, content: json.content || json.chunk || '' }];
            });
          } catch (e) { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if (err instanceof AuthError) { onAuthError(); return; }
      addToast(`Orchestration failed: ${err.message}`, 'error');
      setIsRunning(false);
    }
  };

  return (
    <div className="view-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ marginBottom: '8px' }}>Web Development Workspace</h1>
        <p>Orchestrate multiple local models to plan, code, and review your web projects.</p>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: '16px', padding: '16px' }}>
        {/* Left: Role Assignments */}
        <div style={{ width: '280px', borderRight: '1px solid var(--border-subtle)', padding: '20px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '16px' }}>Role Assignments</h3>
          {ROLES.map(role => (
            <div key={role.id} style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>
                {role.icon} {role.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{role.description}</div>
              <select 
                className="arena-select" 
                style={{ width: '100%' }}
                value={roleAssignments[role.id] || ''}
                onChange={(e) => handleRoleChange(role.id, e.target.value)}
                disabled={isRunning}
              >
                <option value="">-- Select Model --</option>
                {models.filter(m => m.provider !== 'mock').map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Middle: Prompt & Output Logs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ marginBottom: '16px' }}>
            <textarea
              className="prompt-textarea"
              rows={4}
              placeholder="Describe your web development project (e.g., 'Build a React task manager with a Node.js backend and JWT auth')..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isRunning}
              style={{ width: '100%', resize: 'none' }}
            />
            <button 
              className="primary-btn" 
              style={{ marginTop: '12px', width: '100%' }}
              onClick={handleRun}
              disabled={isRunning || !prompt.trim()}
            >
              {isRunning ? <><Loader2 size={16} className="spin" /> Orchestrating...</> : <><Send size={16} /> Start Orchestration</>}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
            {logs.length === 0 && !isRunning && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                Output logs will appear here as agents work.
              </div>
            )}
            {logs.map((log, idx) => {
              const role = ROLES.find(r => r.id === log.agent.replace('webdev-', ''));
              return (
                <div key={idx} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600, color: 'var(--accent-purple)' }}>
                    {role?.icon} {role?.name || log.agent}
                    {log.type === 'done' && <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} />}
                  </div>
                  <div style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-code)', color: 'var(--text-secondary)' }}>
                    {log.content}
                  </div>
                </div>
              );
            })}
            {isRunning && logs.length > 0 && logs[logs.length - 1].type === 'chunk' && (
              <div className="typing-dots" style={{ marginLeft: '24px' }}><span /><span /><span /></div>
            )}
          </div>
        </div>

        {/* Right: Workspace Editor */}
        <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', minWidth: '400px' }}>
          <WorkspacePanel addToast={addToast} onAuthError={onAuthError} />
        </div>
      </div>
    </div>
  );
}