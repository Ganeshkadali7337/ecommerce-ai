import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import ProductCard from '../components/ProductCard';

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
  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';

  useEffect(() => {
    api.get('/api/products/meta/categories').then(r => setCategories(r.data));
  }, []);

  useEffect(() => {
    const params = { page, limit: 20 };
    if (category) params.category = category;
    api.get('/api/products', { params }).then(r => setData(r.data));
  }, [page, category]);

  function setCategory(slug) {
    setSearchParams(slug ? { category: slug } : {});
  }

  function setPage(p) {
    const params = { page: p };
    if (category) params.category = category;
    setSearchParams(params);
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Products</h1>
      <div style={s.layout}>
        <aside style={s.sidebar}>
          <div style={s.sidebarTitle}>Category</div>
          <div style={{ ...s.categoryItem, ...(category === '' ? s.active : {}) }} onClick={() => setCategory('')}>
            All
          </div>
          {categories.map(c => (
            <div
              key={c.id}
              style={{ ...s.categoryItem, ...(category === c.slug ? s.active : {}) }}
              onClick={() => setCategory(c.slug)}
            >
              {c.name}
            </div>
          ))}
        </aside>
        <div>
          <div style={{ color: '#616161', fontSize: '13px', marginBottom: '16px' }}>
            {data.total} products
          </div>
          <div style={s.grid}>
            {data.products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
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
