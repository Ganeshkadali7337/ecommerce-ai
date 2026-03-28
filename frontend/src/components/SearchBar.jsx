import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const s = {
  wrapper: { position: 'relative', width: '100%', maxWidth: '500px' },
  input: { border: '1px solid #000', padding: '10px 14px', width: '100%', outline: 'none', fontSize: '14px' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, border: '1px solid #000', borderTop: 'none', background: '#fff', zIndex: 10 },
  suggestion: { padding: '10px 14px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #e0e0e0' },
  category: { fontSize: '11px', color: '#9e9e9e', marginLeft: '8px' },
};

export default function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (q.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/search/autocomplete?q=${encodeURIComponent(q)}`)
        .then(r => setSuggestions(r.data))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function handler(e) { if (!ref.current?.contains(e.target)) setSuggestions([]); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function search(term) {
    setSuggestions([]);
    setQ(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <div style={s.wrapper} ref={ref}>
      <input
        style={s.input}
        placeholder="Search products..."
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && search(q)}
      />
      {suggestions.length > 0 && (
        <div style={s.dropdown}>
          {suggestions.map(s => (
            <div key={s.id} style={s.suggestion} onClick={() => search(s.name)}>
              {s.name} <span style={s.category}>{s.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
