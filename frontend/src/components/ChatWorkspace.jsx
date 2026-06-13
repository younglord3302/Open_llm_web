import { useState, useEffect, useRef } from 'react';
import {
  Send, Paperclip, FileText, Database, Mic, MicOff, Volume2, VolumeX, Check,
  FileJson, FileCode
} from 'lucide-react';
import { api, AuthError } from '../utils/api';
import { MarkdownContent, ReasoningBlock } from './MarkdownRenderer';
import { parseMessage } from './MarkdownUtils';

// Animated typing dots
function TypingIndicator() {
  return (
    <div className="message-bubble assistant">
      <div className="message-avatar">🧠</div>
      <div className="message-content-wrapper">
        <span className="message-sender">Local Assistant</span>
        <div className="message-card">
          <div className="typing-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWorkspace({
  chat, messages, onSendMessage,
  activeModelId, activeAgentId,
  documents, selectedDocIds, onToggleDocSelect,
  onCreateChat, addToast, onAuthError
}) {
  // ── Export functions ──────────────────────────────────────────────────────
  const exportAsJSON = () => {
    const data = {
      chatId: chat?.id,
      title: chat?.title || 'Untitled',
      exportedAt: new Date().toISOString(),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        sources: m.sources || []
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${chat?.id || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Chat exported as JSON', 'success');
  };

  const exportAsMarkdown = () => {
    let md = `# ${chat?.title || 'Chat Export'}\n\n`;
    md += `*Exported: ${new Date().toLocaleString()}*\n\n---\n\n`;
    messages.forEach(m => {
      const role = m.role === 'user' ? '👤 **You**' : '🧠 **Assistant**';
      md += `### ${role}\n\n${m.content}\n\n`;
      if (m.sources?.length > 0) {
        md += `> Sources: ${m.sources.map(s => `${s.documentName} (${Math.round(s.similarity * 100)}%)`).join(', ')}\n\n`;
      }
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${chat?.id || 'export'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Chat exported as Markdown', 'success');
  };
  const [inputText, setInputText]         = useState('');
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming]     = useState(false);
  const [showRAGDropdown, setShowRAGDropdown] = useState(false);
  const [isListening, setIsListening]    = useState(false);
  const [ttsEnabled, setTtsEnabled]      = useState(() => {
    try { return JSON.parse(localStorage.getItem('llm_prefs') || '{}').tts || false; } catch { return false; }
  });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isAttaching, setIsAttaching]    = useState(false);
  const fileInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingMessage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  // ── Voice input ────────────────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { addToast('Speech recognition not supported in this browser.', 'error'); return; }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setInputText(transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => { setIsListening(false); addToast('Microphone error. Check browser permissions.', 'error'); };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // ── TTS playback ───────────────────────────────────────────────────────────
  const speak = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, 'code block').replace(/[*#`]/g, ''));
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // ── Send message ──────────────────────────────────────────────────────────
  // ── File attachment ──────────────────────────────────────────────────────
  const handleFileAttach = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!chat?.id) { addToast('Start a conversation first to attach files.', 'error'); return; }

    setIsAttaching(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('llm_token');
      const res = await fetch(`/api/chats/${chat.id}/attach`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      if (res.status === 401) { onAuthError(); return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setAttachedFiles(prev => [...prev, data.attachment]);
        addToast(`Attached: ${data.attachment.fileName}`, 'success');
      } else {
        addToast(data.error || 'Failed to attach file', 'error');
      }
    } catch (err) {
      addToast(`Attach error: ${err.message}`, 'error');
    } finally {
      setIsAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (attId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== attId));
  };

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming) return;
    let userQuery = inputText;
    
    // Prepend attached file contents to the query
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map(f => `[File: ${f.fileName}]\n${f.text || ''}`).join('\n\n');
      userQuery = `${userQuery}\n\n--- Attached Files ---\n${fileContext}`;
      setAttachedFiles([]);
    }
    setInputText('');
    setIsStreaming(true);
    setStreamingMessage('');
    onSendMessage(userQuery);

    let targetChatId = chat?.id;
    if (!targetChatId && onCreateChat) {
      const newChat = await onCreateChat('New Conversation', activeModelId, activeAgentId);
      if (newChat) targetChatId = newChat.id;
      else { setIsStreaming(false); return; }
    }

    try {
      const response = await api.stream('/api/chat', {
        chatId: targetChatId,
        content: userQuery,
        modelId: activeModelId,
        agentId: activeAgentId,
        documentIds: selectedDocIds
      });

      if (response.status === 401) { onAuthError(); return; }
      if (!response.ok) throw new Error('Server error');

      const reader  = response.body.getReader();
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
            if (json.chunk) { fullText += json.chunk; setStreamingMessage(fullText); }
            if (json.error) addToast(`Stream error: ${json.error}`, 'error');
          } catch { /* ignore parse errors on invalid stream lines */ }
        }
      }
      speak(fullText);
    } catch (err) {
      if (err instanceof AuthError) { onAuthError(); return; }
      addToast(`Failed to reach backend: ${err.message}`, 'error');
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
      onSendMessage(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const selectPreset = (text) => { setInputText(text); textareaRef.current?.focus(); };

  const promptPresets = [
    { text: 'Write a Python script to validate IP addresses', label: '💻 Python Script' },
    { text: 'Explain Docker volumes in simple terms', label: '🐳 Docker Volumes' },
    { text: 'What is backpropagation in neural networks?', label: '🔍 Backpropagation' },
  ];

  return (
    <div className="chat-workspace">
      {/* Export bar */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <button className="secondary-btn" onClick={exportAsJSON} style={{ padding: '4px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileJson size={14} /> Export JSON
          </button>
          <button className="secondary-btn" onClick={exportAsMarkdown} style={{ padding: '4px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCode size={14} /> Export Markdown
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="messages-list">
        {messages.length === 0 && !streamingMessage && !isStreaming && (
          <div className="empty-chat-state">
            <div className="empty-logo">🧠</div>
            <h2>Local AI Workspace</h2>
            <p>Your privacy-respecting conversation engine. Start typing below, choose a model, or attach documents via RAG.</p>
          </div>
        )}

        {messages.map(msg => {
          const { thought, response } = parseMessage(msg.content);
          return (
            <div key={msg.id} className={`message-bubble ${msg.role}`}>
              <div className="message-avatar">{msg.role === 'user' ? '👤' : activeAgentId ? '🤖' : '🧠'}</div>
              <div className="message-content-wrapper">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="message-sender">
                    {msg.role === 'user' ? 'You' : activeAgentId ? `${activeAgentId} Agent` : 'Local Assistant'}
                  </span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-card">
                  {thought && <ReasoningBlock thought={thought} />}
                  <MarkdownContent content={response} />
                  {msg.sources?.length > 0 && (
                    <div className="sources-container">
                      {msg.sources.map((src, i) => (
                        <span key={i} className="source-badge">
                          <Database size={10} /> {src.documentName} ({Math.round(src.similarity * 100)}%)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Streaming live message */}
        {streamingMessage && (
          <div className="message-bubble assistant">
            <div className="message-avatar">{activeAgentId ? '🤖' : '🧠'}</div>
            <div className="message-content-wrapper">
              <span className="message-sender">Streaming…</span>
              <div className="message-card">
                {(() => {
                  const { thought, response } = parseMessage(streamingMessage);
                  return (
                    <>
                      {thought && <ReasoningBlock thought={thought} />}
                      {response
                        ? <MarkdownContent content={response} />
                        : <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Generating thought logs…</span>
                      }
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator shown while waiting for first chunk */}
        {isStreaming && !streamingMessage && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Selected docs bar */}
      {selectedDocIds.length > 0 && (
        <div className="selected-docs-bar">
          {selectedDocIds.map(docId => {
            const docObj = documents.find(d => d.id === docId);
            if (!docObj) return null;
            return (
              <span key={docId} className="selected-doc-tag">
                <FileText size={12} style={{ color: 'var(--accent-blue)' }} />
                <span>{docObj.name}</span>
                <button className="remove-doc-tag-btn" onClick={() => onToggleDocSelect(docId)}>×</button>
              </span>
            );
          })}
        </div>
      )}

      {/* Prompt area */}
      <div className="prompt-area">
        {messages.length === 0 && !streamingMessage && (
          <div className="prompt-presets">
            {promptPresets.map((p, i) => (
              <button key={i} className="preset-chip" onClick={() => selectPreset(p.text)}>{p.label}</button>
            ))}
          </div>
        )}

        {/* Attached files chips */}
        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '6px 0' }}>
            {attachedFiles.map(f => (
              <span key={f.id} className="selected-doc-tag" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' }}>
                <FileText size={12} style={{ color: '#10b981' }} />
                <span>{f.fileName}</span>
                <button className="remove-doc-tag-btn" onClick={() => removeAttachment(f.id)}>×</button>
              </span>
            ))}
          </div>
        )}

        <div className="prompt-bar-wrapper">
          {/* RAG selector */}
          <div style={{ position: 'relative' }}>
            <button
              className={`prompt-icon-btn ${selectedDocIds.length > 0 ? 'send' : ''}`}
              style={{ background: selectedDocIds.length > 0 ? 'rgba(59,130,246,0.1)' : 'transparent', color: selectedDocIds.length > 0 ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
              onClick={() => setShowRAGDropdown(!showRAGDropdown)}
              title="Attach Document Context (RAG)"
            >
              <Paperclip size={18} />
            </button>
            {showRAGDropdown && (
              <div className="glass-card" style={{ position: 'absolute', bottom: 45, left: 0, width: 280, maxHeight: 220, overflowY: 'auto', padding: 12, zIndex: 20, boxShadow: 'var(--glass-shadow)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', paddingBottom: 6, borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>ATTACH KNOWLEDGE DOCUMENTS</div>
                {documents.map(doc => {
                  const active = selectedDocIds.includes(doc.id);
                  return (
                    <div key={doc.id} onClick={() => onToggleDocSelect(doc.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: active ? 'rgba(59,130,246,0.08)' : 'transparent', fontSize: '0.8rem', color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 200 }}>{doc.name}</span>
                      {active && <Check size={14} style={{ color: 'var(--accent-blue)' }} />}
                    </div>
                  );
                })}
                {documents.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No documents indexed. Go to Knowledge Base to upload.</div>}
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            className="prompt-textarea"
            placeholder={isListening ? '🎙 Listening...' : activeAgentId ? `Ask ${activeAgentId} Agent... (Shift+Enter for newline)` : 'Send a message... (Shift+Enter for newline)'}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming || isListening}
          />

          <div className="prompt-actions">
            {/* File attach button */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.csv,.json,.js,.py,.ts,.jsx,.tsx,.html,.css,.xml,.log"
              style={{ display: 'none' }}
              onChange={handleFileAttach}
            />
            <button
              className="prompt-icon-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming || isAttaching}
              title="Attach a file"
              style={{ color: isAttaching ? '#f59e0b' : 'var(--text-secondary)' }}
            >
              <FileText size={16} />
            </button>

            {/* Voice input button */}
            <button
              className={`prompt-icon-btn ${isListening ? 'send' : ''}`}
              onClick={isListening ? stopListening : startListening}
              title={isListening ? 'Stop listening' : 'Voice input'}
              style={{ color: isListening ? '#ef4444' : 'var(--text-secondary)' }}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* TTS toggle */}
            <button
              className={`prompt-icon-btn ${ttsEnabled ? 'send' : ''}`}
              onClick={() => setTtsEnabled(p => !p)}
              title={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
              style={{ color: ttsEnabled ? 'var(--accent-blue)' : 'var(--text-secondary)' }}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Send button */}
            <button className="prompt-icon-btn send" onClick={handleSend} disabled={isStreaming || !inputText.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
