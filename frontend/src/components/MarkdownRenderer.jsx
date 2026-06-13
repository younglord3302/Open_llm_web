import { useState } from 'react';
import { Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { parseBold } from './MarkdownUtils';
// ─── Code block with copy button ──────────────────────────────────────────────
export function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: 'relative', margin: '14px 0', border: '1px solid var(--border-subtle)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <span style={{ textTransform: 'uppercase', fontFamily: 'var(--font-code)' }}>{language}</span>
        <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          {copied ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: 16, background: 'rgba(0,0,0,0.4)', overflowX: 'auto' }}>
        <code style={{ fontFamily: 'var(--font-code)', fontSize: '0.85rem', color: '#e5e7eb' }}>{code}</code>
      </pre>
    </div>
  );
}

// ─── Markdown content renderer ────────────────────────────────────────────────
// Supports: headings (##, ###), lists (- ), bold (**), inline code (`), code blocks (```)
export function MarkdownContent({ content, style }) {
  if (!content) return null;
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="md-content" style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const lines = part.split('\n');
          const language = lines[0].replace('```', '').trim() || 'code';
          const code = lines.slice(1, -1).join('\n');
          return <CodeBlock key={index} language={language} code={code} />;
        }
        return (
          <div key={index}>
            {part.split('\n').map((line, lineIdx) => {
              if (line.trim().startsWith('- '))
                return <ul key={lineIdx} style={{ margin: '4px 0 4px 20px' }}><li>{parseBold(line.trim().substring(2))}</li></ul>;
              if (line.startsWith('### '))
                return <h3 key={lineIdx} style={{ marginTop: 16, color: 'var(--text-primary)' }}>{line.replace('### ', '')}</h3>;
              if (line.startsWith('## '))
                return <h2 key={lineIdx} style={{ marginTop: 20, color: 'var(--text-primary)' }}>{line.replace('## ', '')}</h2>;
              if (line.trim() === '') return <div key={lineIdx} style={{ height: 10 }} />;
              return <p key={lineIdx} style={{ margin: '6px 0' }}>{parseBold(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Reasoning block (collapsible thought process) ────────────────────────────
export function ReasoningBlock({ thought }) {
  const [expanded, setExpanded] = useState(true);
  if (!thought) return null;
  return (
    <div className="reasoning-container">
      <div className="reasoning-header" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>Agent Thinking Process</span>
      </div>
      {expanded && <div className="reasoning-body">{thought.trim()}</div>}
    </div>
  );
}