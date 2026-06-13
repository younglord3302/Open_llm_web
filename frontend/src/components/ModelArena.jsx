import { useState, useRef, useEffect } from 'react';
import { Send, Cpu, XCircle } from 'lucide-react';
import { api, AuthError } from '../utils/api';
import { MarkdownContent, ReasoningBlock } from './MarkdownRenderer';
import { parseMessage } from './MarkdownUtils';

// ─── Main Arena Component ──────────────────────────────────────────────────────
export default function ModelArena({ models, addToast, onAuthError }) {
  const availableModels = models.filter(m => m.enabled || m.provider === 'mock');
  
  const [selectedModelIds, setSelectedModelIds] = useState(
    availableModels.slice(0, 2).map(m => m.id)
  );
  const [inputText, setInputText] = useState('');
  
  const [promptHistory, setPromptHistory] = useState([]); // { id, prompt, responses: { [modelId]: string } }
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [streams, setStreams] = useState({}); // { [modelId]: string }

  const addModel = () => {
    if (selectedModelIds.length < 10) {
      const nextModel = availableModels.find(m => !selectedModelIds.includes(m.id)) || availableModels[0];
      setSelectedModelIds([...selectedModelIds, nextModel.id]);
    }
  };

  const removeModel = (modelId) => {
    if (selectedModelIds.length > 1) {
      setSelectedModelIds(selectedModelIds.filter(id => id !== modelId));
      setStreams(prev => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });
    }
  };

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [promptHistory, streams]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming) return;
    if (selectedModelIds.length === 0) {
      addToast('Please select at least one model.', 'error');
      return;
    }

    const currentPrompt = inputText;
    setInputText('');
    setIsStreaming(true);
    
    const initialStreams = {};
    selectedModelIds.forEach(id => { initialStreams[id] = ''; });
    setStreams(initialStreams);

    const newEntry = { id: Math.random().toString(36), prompt: currentPrompt, responses: {} };

    try {
      const streamPromises = selectedModelIds.map(async (modelId) => {
        const res = await api.stream('/api/chat', { 
          chatId: 'arena-' + Math.random().toString(36).substring(2), 
          content: currentPrompt, 
          modelId, 
          documentIds: [] 
        });

        if (res.status === 401) { onAuthError(); return null; }
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Model ${modelId} failed: ${res.status} - ${errorText}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullText = '';
        
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
              if (json.chunk) { 
                fullText += json.chunk; 
                setStreams(prev => ({ ...prev, [modelId]: fullText }));
              }
            } catch { /* ignore parse errors on invalid stream lines */ }
          }
        }
        return { modelId, fullText };
      });

      const results = await Promise.all(streamPromises);
      results.filter(Boolean).forEach(({ modelId, fullText }) => {
        newEntry.responses[modelId] = fullText;
      });
      
      setPromptHistory(prev => [...prev, newEntry]);
    } catch (err) {
      if (err instanceof AuthError) { onAuthError(); return; }
      addToast(`Arena stream failed: ${err.message}`, 'error');
    } finally {
      setIsStreaming(false);
      setStreams({});
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const clearArena = () => {
    if (!confirm('Clear arena history?')) return;
    setPromptHistory([]);
    setStreams({});
  };

  return (
    <div className="arena-container">
      {/* Header controls */}
      <div className="arena-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo-icon" style={{ width: 32, height: 32, fontSize: '1rem' }}>⚔️</div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Model Arena</h2>
          <span className="health-pill" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)' }}>
            Compare Mode
          </span>
        </div>
        <button className="secondary-btn" onClick={clearArena} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          <XCircle size={14} /> Clear Arena
        </button>
      </div>

      {/* Model Selectors */}
      <div className="arena-selectors" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '0 24px', marginBottom: 16 }}>
        {selectedModelIds.map((modelId, index) => (
          <div key={modelId} className="arena-selector-panel" style={{ flex: '1 1 200px', minWidth: '200px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
              <Cpu size={14} /> MODEL {String.fromCharCode(65 + index)}
              {selectedModelIds.length > 1 && (
                <button 
                  className="secondary-btn" 
                  onClick={() => removeModel(modelId)} 
                  disabled={isStreaming}
                  style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: '0.7rem' }}
                >
                  <XCircle size={12} />
                </button>
              )}
            </div>
            <select 
              value={modelId} 
              onChange={e => {
                const newIds = [...selectedModelIds];
                newIds[index] = e.target.value;
                setSelectedModelIds(newIds);
              }} 
              className="arena-select" 
              disabled={isStreaming}
            >
              {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        ))}
        <button 
          className="secondary-btn" 
          onClick={addModel} 
          disabled={isStreaming || selectedModelIds.length >= 10}
          style={{ flex: '0 0 auto', padding: '8px 16px', height: 'fit-content', alignSelf: 'flex-end', marginBottom: 8 }}
        >
          + Add Model
        </button>
      </div>

      {/* Battleground (Chat History) */}
      <div className="arena-battleground">
        {promptHistory.length === 0 && !isStreaming && (
          <div className="empty-chat-state" style={{ marginTop: 60 }}>
            <div className="empty-logo" style={{ fontSize: '2rem' }}>⚔️</div>
            <h3>Arena Ready</h3>
            <p>Type a prompt below to see how both models respond side-by-side.</p>
          </div>
        )}

        {promptHistory.map((item) => (
          <div key={item.id} className="arena-turn">
            <div className="arena-prompt">
              <div className="message-avatar" style={{ width: 30, height: 30, fontSize: '0.9rem', background: 'var(--accent-glow)', color: 'white', border: 'none' }}>👤</div>
              <div className="arena-prompt-text">{item.prompt}</div>
            </div>
            <div className="arena-split-view" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {selectedModelIds.map(modelId => (
                <div key={modelId} className="arena-panel">
                  <div className="arena-panel-content glass-card">
                    {(() => {
                      const { thought, response } = parseMessage(item.responses[modelId] || '');
                      return (
                        <>
                          {thought && <ReasoningBlock thought={thought} />}
                          <MarkdownContent content={response} />
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Active Streaming Turn */}
        {isStreaming && (
          <div className="arena-turn">
            <div className="arena-split-view" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {selectedModelIds.map(modelId => (
                <div key={modelId} className="arena-panel">
                  <div className="arena-panel-content glass-card active-stream">
                    {(() => {
                      const { thought, response } = parseMessage(streams[modelId] || '');
                      if (!streams[modelId]) return <div className="typing-dots"><span /><span /><span /></div>;
                      return (
                        <>
                          {thought && <ReasoningBlock thought={thought} />}
                          {response ? <MarkdownContent content={response} /> : <span style={{ color: 'var(--text-muted)' }}>Generating thought logs…</span>}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="prompt-area" style={{ padding: '16px 24px' }}>
        <div className="prompt-bar-wrapper">
          <textarea
            ref={textareaRef}
            rows={1}
            className="prompt-textarea"
            placeholder="Enter prompt for both models... (Shift+Enter for newline)"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
          />
          <div className="prompt-actions">
            <button className="prompt-icon-btn send" onClick={handleSend} disabled={isStreaming || !inputText.trim() || selectedModelIds.length === 0}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
