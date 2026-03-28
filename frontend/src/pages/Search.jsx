import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', minRating: '' });

  const q = searchParams.get('q') || '';

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    const params = { q };
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.minRating) params.minRating = filters.minRating;

    api.get('/api/search', { params })
      .then(r => setResults(r.data.products || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q, filters]);

  function applyFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  return (
    <div>
      <h1 style={{ marginBottom: '8px' }}>Search Results</h1>
      {q && <p style={{ color: '#616161', marginBottom: '24px' }}>Showing results for "<strong>{q}</strong>"</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '32px' }}>
        <aside>
          <div style={{ fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Filters</div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Min Price</div>
            <input
              type="number" placeholder="0"
              style={{ border: '1px solid #e0e0e0', padding: '7px 10px', width: '100%', outline: 'none' }}
              value={filters.minPrice}
              onChange={e => applyFilter('minPrice', e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Max Price</div>
            <input
              type="number" placeholder="999"
              style={{ border: '1px solid #e0e0e0', padding: '7px 10px', width: '100%', outline: 'none' }}
              value={filters.maxPrice}
              onChange={e => applyFilter('maxPrice', e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Min Rating</div>
            <select
              style={{ border: '1px solid #e0e0e0', padding: '7px 10px', width: '100%', background: '#fff' }}
              value={filters.minRating}
              onChange={e => applyFilter('minRating', e.target.value)}
            >
              <option value="">Any</option>
              {[4, 3, 2, 1].map(n => <option key={n} value={n}>{n}+ stars</option>)}
            </select>
          </div>
        </aside>

        <div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#616161' }}>
              <Spinner /> Searching...
            </div>
          ) : results.length === 0 && q ? (
            <p style={{ color: '#616161' }}>No results found for "{q}"</p>
          ) : (
            <>
              <div style={{ color: '#616161', fontSize: '13px', marginBottom: '16px' }}>{results.length} results</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                {results.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
