import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    api.get('/api/products/meta/categories').then(r => setCategories(r.data));
    api.get('/api/products?limit=4').then(r => setFeatured(r.data.products || []));
  }, []);

  return (
    <div>
      <div style={{ borderBottom: '1px solid #000', paddingBottom: '32px', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Welcome to ShopAI</h1>
        <p style={{ color: '#616161' }}>AI-powered shopping — search, discover, and buy smarter.</p>
        <Link to="/products">
          <button style={{ marginTop: '20px', background: '#000', color: '#fff', border: 'none', padding: '12px 28px', fontWeight: 600 }}>
            Shop Now
          </button>
        </Link>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ marginBottom: '16px' }}>Categories</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {categories.map(c => (
            <Link key={c.id} to={`/products?category=${c.slug}`}>
              <div style={{ border: '1px solid #000', padding: '10px 20px', fontSize: '14px' }}>
                {c.name}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: '16px' }}>Latest Products</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {featured.map(p => (
            <Link key={p.id} to={`/products/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              <div style={{ border: '1px solid #e0e0e0' }}>
                <div style={{ background: '#f5f5f5', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9e9e9e', fontSize: '12px' }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'No image'}
                </div>
                <div style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{p.name}</div>
                  <div style={{ fontWeight: 700 }}>${p.price.toFixed(2)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
