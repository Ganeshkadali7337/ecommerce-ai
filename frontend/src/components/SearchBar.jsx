import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function SearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    if (q.length < 1) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get(`/api/search/autocomplete?q=${encodeURIComponent(q)}`)
        .then(r => setSuggestions(r.data))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function close(e) { if (!ref.current?.contains(e.target)) setSuggestions([]); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function search(term) {
    setSuggestions([]);
    setQ('');
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <input
        style={{ border: '1px solid #000', padding: '8px 12px', width: '100%', outline: 'none', fontSize: '14px' }}
        placeholder="Search products..."
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && q && search(q)}
      />
      {suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, border: '1px solid #000', borderTop: 'none', background: '#fff', zIndex: 100 }}>
          {suggestions.map(item => (
            <div
              key={item.id}
              onClick={() => search(item.name)}
              style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #f5f5f5' }}
            >
              {item.name}
              <span style={{ fontSize: '11px', color: '#9e9e9e', marginLeft: '8px' }}>{item.category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
