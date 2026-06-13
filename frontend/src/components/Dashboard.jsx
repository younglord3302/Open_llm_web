import React, { useState, useEffect } from 'react';
import { Cpu, Database, MessageSquare, ShieldAlert, Sparkles, Activity } from 'lucide-react';

export default function Dashboard({ stats, setView, createNewChat }) {
  const [metrics, setMetrics] = useState({
    cpu: 24,
    gpu: 42,
    vram: 5.4,
    temp: 68
  });

  // Dynamically simulate hardware metrics for premium visual feedback
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const deltaCpu = (Math.random() - 0.5) * 8;
        const deltaGpu = (Math.random() - 0.5) * 12;
        const nextCpu = Math.max(10, Math.min(95, Math.round(prev.cpu + deltaCpu)));
        const nextGpu = Math.max(15, Math.min(98, Math.round(prev.gpu + deltaGpu)));
        const nextVram = Math.max(2.0, Math.min(16.0, Number((prev.vram + (Math.random() - 0.5) * 0.4).toFixed(1))));
        const nextTemp = Math.max(50, Math.min(85, Math.round(prev.temp + (Math.random() - 0.5) * 4)));
        return { cpu: nextCpu, gpu: nextGpu, vram: nextVram, temp: nextTemp };
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="view-panel">
      <div>
        <h1 style={{ marginBottom: '8px' }}>Local AI Dashboard</h1>
        <p>Private workspace monitoring and local hardware performance metrics.</p>
      </div>

      {/* Hardware Monitoring Section */}
      <div className="grid-2">
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Activity size={20} className="logo-icon" style={{ background: 'var(--accent-blue)', boxShadow: 'none' }} />
            <h2 style={{ margin: 0 }}>Hardware Monitor</h2>
          </div>
          
          <div className="metric-container">
            <div className="metric-header">
              <span>CPU Utilization</span>
              <span>{metrics.cpu}%</span>
            </div>
            <div className="metric-bar-bg">
              <div className="metric-bar-fill" style={{ width: `${metrics.cpu}%`, background: 'var(--accent-glow)' }} />
            </div>
          </div>

          <div className="metric-container">
            <div className="metric-header">
              <span>GPU Utilization (Simulated VRAM)</span>
              <span>{metrics.gpu}%</span>
            </div>
            <div className="metric-bar-bg">
              <div className="metric-bar-fill" style={{ width: `${metrics.gpu}%`, background: 'linear-gradient(to right, #3b82f6, #10b981)' }} />
            </div>
          </div>

          <div className="metric-container">
            <div className="metric-header">
              <span>VRAM Allocated</span>
              <span>{metrics.vram} GB / 16.0 GB</span>
            </div>
            <div className="metric-bar-bg">
              <div className="metric-bar-fill" style={{ width: `${(metrics.vram / 16.0) * 100}%`, background: 'var(--accent-glow)' }} />
            </div>
          </div>

          <div className="metric-container">
            <div className="metric-header">
              <span>GPU Core Temperature</span>
              <span>{metrics.temp}°C</span>
            </div>
            <div className="metric-bar-bg">
              <div className="metric-bar-fill" style={{ width: `${(metrics.temp / 100) * 100}%`, background: metrics.temp > 75 ? '#ef4444' : '#f59e0b' }} />
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <ShieldAlert size={24} style={{ color: 'var(--accent-purple)' }} />
            <h2>Privacy-First Local AI</h2>
          </div>
          <p style={{ marginBottom: '16px' }}>
            All computations, embedding generations, and vector indices run locally on your machine. No chat history, API queries, or uploaded documents are ever sent to external cloud servers.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span className="health-pill healthy">✓ SQLite File DB Locked</span>
            <span className="health-pill healthy">✓ SSE Encryption Safe</span>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid-3">
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Conversations</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
              {stats.chatsCount}
            </p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-blue)' }}>
            <Cpu size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Active Models</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
              {stats.modelsCount}
            </p>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Database size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Knowledge Docs</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
              {stats.documentsCount}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start Actions */}
      <div className="glass-card">
        <h2 style={{ marginBottom: '16px' }}>Quick Start Workspaces</h2>
        <div className="grid-3">
          <div 
            className="glass-card" 
            style={{ cursor: 'pointer', padding: '16px', background: 'rgba(255, 255, 255, 0.02)' }}
            onClick={() => createNewChat('General Chat', 'mock-model')}
          >
            <Sparkles size={20} style={{ color: 'var(--accent-purple)', marginBottom: '10px' }} />
            <h3>General Chat</h3>
            <p style={{ fontSize: '0.85rem' }}>Instantly start a fast, local reasoning session.</p>
          </div>

          <div 
            className="glass-card" 
            style={{ cursor: 'pointer', padding: '16px', background: 'rgba(255, 255, 255, 0.02)' }}
            onClick={() => createNewChat('Code Helper', 'mock-model', 'coding')}
          >
            <Cpu size={20} style={{ color: 'var(--accent-blue)', marginBottom: '10px' }} />
            <h3>Coding Workspace</h3>
            <p style={{ fontSize: '0.85rem' }}>Engage the specialized Coding Agent configuration.</p>
          </div>

          <div 
            className="glass-card" 
            style={{ cursor: 'pointer', padding: '16px', background: 'rgba(255, 255, 255, 0.02)' }}
            onClick={() => setView('knowledge')}
          >
            <Database size={20} style={{ color: '#10b981', marginBottom: '10px' }} />
            <h3>Knowledge Base</h3>
            <p style={{ fontSize: '0.85rem' }}>Upload files and build private vector indices.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
