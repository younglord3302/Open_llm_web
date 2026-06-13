// ─── Shared markdown parsing utilities ────────────────────────────────────────
// Split into a separate file to support fast refresh.

export function parseBold(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 650 }}>{part.slice(2, -2)}</strong>;
    const subParts = part.split(/(`.*?`)/g);
    return subParts.map((sp, si) => {
      if (sp.startsWith('`') && sp.endsWith('`'))
        return <code key={`${i}-${si}`} style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4, fontFamily: 'var(--font-code)', fontSize: '0.85rem' }}>{sp.slice(1, -1)}</code>;
      return sp;
    });
  });
}

export function parseMessage(text) {
  let thought = '', response = text;
  if (text.includes('<thought>')) {
    const parts = text.split('<thought>');
    const postThought = parts[1] || '';
    if (postThought.includes('</thought>')) {
      const subParts = postThought.split('</thought>');
      thought = subParts[0];
      response = parts[0] + subParts.slice(1).join('</thought>');
    } else {
      thought = postThought;
      response = parts[0];
    }
  }
  return { thought, response };
}