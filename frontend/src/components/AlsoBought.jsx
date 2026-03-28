import { useEffect, useState } from 'react';
import api from '../api/client';
import ProductCard from './ProductCard';

export default function AlsoBought({ productId }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get(`/api/orders/also-bought/${productId}`)
      .then(r => setProducts(r.data))
      .catch(() => {});
  }, [productId]);

  if (products.length === 0) return null;

  return (
    <div style={{ marginTop: '48px' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>Customers Also Bought</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {products.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
