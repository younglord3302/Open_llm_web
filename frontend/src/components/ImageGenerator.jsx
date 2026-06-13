import { useState } from 'react';
import { Sparkles, Image, Loader } from 'lucide-react';
import { api, AuthError } from '../utils/api';

const PROVIDERS = [
  { id: 'stability', name: 'Stability AI' },
  { id: 'openai', name: 'OpenAI DALL-E' },
  { id: 'local-sd', name: 'Local Stable Diffusion' }
];

const SIZES = ['512x512', '768x768', '1024x1024', '1024x1792', '1792x1024'];

export default function ImageGenerator({ addToast, onAuthError }) {
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('stability');
  const [size, setSize] = useState('1024x1024');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);

  const generate = async () => {
    if (!prompt.trim()) { addToast('Please enter a prompt', 'error'); return; }
    setIsGenerating(true);
    setResult(null);
    setLogs([]);

    try {
      const response = await api.stream('/api/generate-image', { prompt, provider, size });
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
          if (dataStr === '[DONE]') break;
          try {
            const json = JSON.parse(dataStr);
            if (json.type === 'status') setLogs(prev => [...prev, json.message]);
            if (json.type === 'complete') setResult(json);
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if (err instanceof AuthError) onAuthError();
      addToast(`Generation error: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="view-panel">
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ marginBottom: '8px' }}>Image Generation</h1>
        <p>Generate images using AI. Supports Stability AI, OpenAI DALL-E, and local Stable Diffusion.</p>
      </div>

      <div className="grid-2">
        <div className="glass-card">
          <h3 style={{ marginBottom: '12px' }}>Prompt</h3>
          <textarea rows={4} placeholder="Describe the image you want to generate…" value={prompt}
            onChange={e => setPrompt(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '0.9rem', marginBottom: '12px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Provider</label>
              <select value={provider} onChange={e => setProvider(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Size</label>
              <select value={size} onChange={e => setSize(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <button className="primary-btn" onClick={generate} disabled={isGenerating || !prompt.trim()}
            style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {isGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'Generating…' : 'Generate Image'}
          </button>
          {logs.length > 0 && (
            <div style={{ marginTop: '12px', padding: '10px', borderRadius: '8px', background: 'var(--bg-tertiary)', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}
        </div>

        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          {result ? (
            <div style={{ textAlign: 'center' }}>
              <Image size={64} style={{ color: 'var(--accent-purple)', marginBottom: '12px' }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{result.message}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>Prompt: {result.prompt}</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Image size={64} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>Generated image will appear here</p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: '20px', background: 'rgba(59,130,246,0.03)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <strong>Note:</strong> To use real image generation, add your API keys in <strong>Settings → API Keys</strong>. For local Stable Diffusion, ensure it's running on localhost.
        </p>
      </div>
    </div>
  );
}