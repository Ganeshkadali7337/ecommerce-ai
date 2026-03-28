import { useEffect, useState } from 'react';
import api from '../api/client';
import ProductCard from './ProductCard';
import Spinner from './Spinner';

export default function SimilarProducts({ productId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/products/${productId}/similar`)
      .then(r => setProducts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#616161', marginTop: '8px' }}>
      <Spinner /> Loading similar products...
    </div>
  );

  if (products.length === 0) return null;

  return (
    <div style={{ marginTop: '48px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>Similar Products</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
