import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';

const s = {
  layout: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: '32px' },
  sidebar: {},
  sidebarTitle: { fontWeight: 600, marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  categoryItem: { padding: '6px 0', fontSize: '14px', cursor: 'pointer', borderBottom: '1px solid #e0e0e0' },
  active: { fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  pagination: { display: 'flex', gap: '8px', marginTop: '32px', alignItems: 'center' },
  pageBtn: { border: '1px solid #000', background: '#fff', padding: '6px 12px' },
  pageBtnActive: { border: '1px solid #000', background: '#000', color: '#fff', padding: '6px 12px' },
};

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ products: [], total: 0, pages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', minRating: '' });
  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';

  useEffect(() => {
    api.get('/api/products/meta/categories').then(r => setCategories(r.data));
  }, []);

  useEffect(() => {
    const params = { page, limit: 20 };
    if (category) params.category = category;
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.minRating) params.minRating = filters.minRating;
    setLoading(true);
    api.get('/api/products', { params }).then(r => setData(r.data)).finally(() => setLoading(false));
  }, [page, category, filters]);

  function setCategory(slug) {
    setSearchParams(slug ? { category: slug } : {});
  }

  function setPage(p) {
    const params = { page: p };
    if (category) params.category = category;
    setSearchParams(params);
  }

  function applyFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }));
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Products</h1>
      <div className="category-filter-mobile">
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ marginBottom: '8px' }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input type="number" placeholder="Min price" value={filters.minPrice} onChange={e => applyFilter('minPrice', e.target.value)}
            style={{ flex: 1, minWidth: '80px', border: '1px solid #e0e0e0', padding: '8px', outline: 'none' }} />
          <input type="number" placeholder="Max price" value={filters.maxPrice} onChange={e => applyFilter('maxPrice', e.target.value)}
            style={{ flex: 1, minWidth: '80px', border: '1px solid #e0e0e0', padding: '8px', outline: 'none' }} />
          <select value={filters.minRating} onChange={e => applyFilter('minRating', e.target.value)}
            style={{ flex: 1, minWidth: '100px', border: '1px solid #e0e0e0', padding: '8px', background: '#fff' }}>
            <option value="">Any rating</option>
            {[4, 3, 2, 1].map(n => <option key={n} value={n}>{n}+ stars</option>)}
          </select>
        </div>
      </div>
      <div className="products-layout">
        <aside className="products-sidebar">
          <div style={s.sidebarTitle}>Category</div>
          <div style={{ ...s.categoryItem, ...(category === '' ? s.active : {}) }} onClick={() => setCategory('')}>All</div>
          {categories.map(c => (
            <div key={c.id} style={{ ...s.categoryItem, ...(category === c.slug ? s.active : {}) }} onClick={() => setCategory(c.slug)}>
              {c.name}
            </div>
          ))}

          <div style={{ ...s.sidebarTitle, marginTop: '24px' }}>Price</div>
          <input type="number" placeholder="Min" value={filters.minPrice} onChange={e => applyFilter('minPrice', e.target.value)}
            style={{ border: '1px solid #e0e0e0', padding: '6px 8px', width: '100%', outline: 'none', marginBottom: '8px' }} />
          <input type="number" placeholder="Max" value={filters.maxPrice} onChange={e => applyFilter('maxPrice', e.target.value)}
            style={{ border: '1px solid #e0e0e0', padding: '6px 8px', width: '100%', outline: 'none' }} />

          <div style={{ ...s.sidebarTitle, marginTop: '24px' }}>Min Rating</div>
          <select value={filters.minRating} onChange={e => applyFilter('minRating', e.target.value)}
            style={{ border: '1px solid #e0e0e0', padding: '6px 8px', width: '100%', background: '#fff' }}>
            <option value="">Any</option>
            {[4, 3, 2, 1].map(n => <option key={n} value={n}>{n}+ stars</option>)}
          </select>

        </aside>
        <div>
          <div style={{ color: '#616161', fontSize: '13px', marginBottom: '16px' }}>
            {data.total} products
          </div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#616161' }}><Spinner /> Loading...</div>
          ) : (
            <div style={s.grid}>
              {data.products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          {data.pages > 1 && (
            <div style={s.pagination}>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  style={p === page ? s.pageBtnActive : s.pageBtn}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
