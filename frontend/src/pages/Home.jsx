import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ProductCard from '../components/ProductCard';
import Spinner from '../components/Spinner';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/products/meta/categories').then(r => setCategories(r.data)),
      api.get('/api/products?limit=4').then(r => setFeatured(r.data.products || [])),
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#616161' }}>
      <Spinner /> Loading...
    </div>
  );

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
        <div className="product-grid">
          {featured.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  );
}
