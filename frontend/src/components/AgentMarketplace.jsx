import React, { useState, useEffect } from 'react';
import { Bot, Star, Compass, Shield, Code, Stethoscope, Terminal } from 'lucide-react';
import { api, AuthError } from '../utils/api';

export default function AgentMarketplace({ createNewChat, onAuthError }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/agents')
      .then(res => res.json())
      .then(data => { setAgents(data); setLoading(false); })
      .catch(e => {
        if (e instanceof AuthError && onAuthError) onAuthError();
        setLoading(false);
      });
  }, []);

  const getAgentColor = (id) => {
    switch (id) {
      case 'coding': return '#3b82f6';
      case 'research': return '#8b5cf6';
      case 'medical': return '#ef4444';
      case 'devops': return '#10b981';
      case 'documentation': return '#f59e0b';
      default: return '#8b5cf6';
    }
  };

  return (
    <div className="view-panel">
      <div>
        <h1 style={{ marginBottom: '8px' }}>Agent Marketplace</h1>
        <p>Explore specialized AI agents tailored to specific workloads. Deploy an agent to start an structured session.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading agents...</div>
      ) : (
        <div className="grid-3">
          {agents.map(agent => (
            <div 
              key={agent.id}
              className="glass-card agent-card"
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              <div className="agent-card-header">
                <div 
                  className="agent-avatar"
                  style={{ 
                    color: getAgentColor(agent.id),
                    background: `rgba(${agent.id === 'coding' ? '59,130,246' : agent.id === 'medical' ? '239,68,68' : '139,92,246'}, 0.08)`
                  }}
                >
                  {agent.avatar}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{agent.name}</h3>
                  <span className="source-badge" style={{ fontSize: '0.7rem', margin: 0, padding: '2px 6px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
                    Local Core Agent
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', flex: 1, marginBottom: '20px' }}>
                {agent.description}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {agent.id === 'coding' && (
                    <>
                      <span className="source-badge" style={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.1)' }}>Autocompletion</span>
                      <span className="source-badge" style={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.1)' }}>Debugging</span>
                    </>
                  )}
                  {agent.id === 'research' && (
                    <>
                      <span className="source-badge">Summaries</span>
                      <span className="source-badge">Citations</span>
                    </>
                  )}
                  {agent.id === 'medical' && (
                    <>
                      <span className="source-badge" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.1)' }}>Clinical Reference</span>
                      <span className="source-badge" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.1)' }}>Symptoms Analysis</span>
                    </>
                  )}
                  {agent.id === 'devops' && (
                    <>
                      <span className="source-badge" style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.1)' }}>Dockerfiles</span>
                      <span className="source-badge" style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.1)' }}>YAML setup</span>
                    </>
                  )}
                  {agent.id === 'documentation' && (
                    <>
                      <span className="source-badge" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.1)' }}>Markdown API</span>
                      <span className="source-badge" style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.1)' }}>Explanations</span>
                    </>
                  )}
                  {agent.id === 'orchestrator' && (
                    <>
                      <span className="source-badge">Task Routing</span>
                      <span className="source-badge">Combination Synthesis</span>
                    </>
                  )}
                </div>

                <button 
                  className="primary-btn" 
                  style={{ width: '100%', padding: '10px' }}
                  onClick={() => createNewChat(`${agent.name} Workspace`, 'mock-model', agent.id)}
                >
                  Deploy Workspace
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
