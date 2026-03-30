import { useState, useRef, useEffect } from 'react';
import api from '../api/client';
import Spinner from './Spinner';

function renderMessage(text) {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  return lines.map((line, i) => {
    const isBullet = /^(\s*[-•*]|\s*\d+\.)\s+/.test(line);
    const clean = line.replace(/^(\s*[-•*]|\s*\d+\.)\s+/, '');
    const parts = clean.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      /^\*\*[^*]+\*\*$/.test(part)
        ? <strong key={j}>{part.slice(2, -2)}</strong>
        : part
    );
    if (isBullet) {
      return (
        <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '3px' }}>
          <span style={{ flexShrink: 0 }}>•</span>
          <span>{parts}</span>
        </div>
      );
    }
    return <div key={i} style={{ marginBottom: '3px' }}>{parts}</div>;
  });
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hi! I can help you find products. What are you looking for?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await api.post('/api/ai/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.reply, cost: res.data.cost, tokens: res.data.tokensUsed }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, something went wrong. Try again.' }]);
    }
    setLoading(false);
  }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
      {open && (
        <div style={{ width: '320px', height: '420px', border: '1px solid #000', background: '#fff', display: 'flex', flexDirection: 'column', marginBottom: '8px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #000', fontWeight: 700, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            AI Shopping Assistant
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  background: m.role === 'user' ? '#000' : '#f5f5f5',
                  color: m.role === 'user' ? '#fff' : '#000',
                  padding: '8px 12px',
                  fontSize: '13px',
                  lineHeight: '1.5',
                }}>
                  {m.role === 'ai' ? renderMessage(m.text) : m.text}
                </div>
                {m.cost !== undefined && (
                  <div style={{ fontSize: '10px', color: '#9e9e9e', marginTop: '2px' }}>
                    {m.tokens} tokens · ${m.cost.toFixed(6)}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', color: '#616161', fontSize: '13px' }}>
                <Spinner size={14} /> Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: '8px', borderTop: '1px solid #000', display: 'flex', gap: '8px' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about products..."
              style={{ flex: 1, border: '1px solid #000', padding: '6px 10px', fontSize: '13px', outline: 'none' }}
            />
            <button
              onClick={send}
              disabled={loading}
              style={{ background: '#000', color: '#fff', border: 'none', padding: '6px 14px', fontSize: '13px', cursor: 'pointer' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: '#000', color: '#fff', border: 'none', width: '48px', height: '48px', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', float: 'right' }}
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  );
}
