import React, { useState } from 'react';
import { api } from '../utils/api';
import { Cpu, Lock, Mail, User, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password, name);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      localStorage.setItem('llm_token', data.token);
      localStorage.setItem('llm_user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError('Cannot reach backend. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async () => {
    setEmail('user@local.ai');
    setPassword('localpassword');
    setError('');
    setLoading(true);
    try {
      const res = await api.login('user@local.ai', 'localpassword');
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('llm_token', data.token);
        localStorage.setItem('llm_user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        // Try auto-register default user if login fails
        const reg = await api.register('user@local.ai', 'localpassword', 'Local User');
        const regData = await reg.json();
        if (reg.ok) {
          localStorage.setItem('llm_token', regData.token);
          localStorage.setItem('llm_user', JSON.stringify(regData.user));
          onLogin(regData.user);
        } else {
          setError(regData.error || 'Quick login failed.');
        }
      }
    } catch {
      setError('Cannot reach backend. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated background orbs */}
      <div className="login-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <div className="login-container">
        {/* Logo */}
        <div className="login-logo">
          <div className="logo-icon" style={{ width: 56, height: 56, fontSize: '1.6rem' }}>🤖</div>
          <h1 className="login-title">Local AI Workspace</h1>
          <p className="login-subtitle">Your private, fully local AI platform</p>
        </div>

        {/* Card */}
        <div className="glass-card login-card">
          {/* Tab switcher */}
          <div className="login-tabs">
            <button
              className={`login-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              className={`login-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {mode === 'register' && (
              <div className="input-group">
                <label className="input-label">Display Name</label>
                <div className="input-wrapper">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className="login-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="login-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="pass-toggle"
                  onClick={() => setShowPass(p => !p)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="primary-btn login-submit"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-dots">
                  <span /><span /><span />
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          <button
            className="secondary-btn quick-login-btn"
            onClick={quickLogin}
            disabled={loading}
          >
            <Sparkles size={15} />
            Quick Local Login
          </button>

          <p className="login-hint">
            🔒 All data stays on your machine. No cloud, no tracking.
          </p>
        </div>

        {/* Feature pills */}
        <div className="login-features">
          <span className="health-pill healthy">✓ 100% Local</span>
          <span className="health-pill healthy">✓ Privacy First</span>
          <span className="health-pill healthy">✓ Ollama & LM Studio</span>
        </div>
      </div>
    </div>
  );
}
