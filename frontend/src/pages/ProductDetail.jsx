import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Reviews from '../components/Reviews';
import SimilarProducts from '../components/SimilarProducts';
import Spinner from '../components/Spinner';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get(`/api/products/${id}`).then(r => setProduct(r.data));
  }, [id]);

  async function addToCart() {
    try {
      await api.post('/api/cart', { productId: product.id, quantity: qty });
      setMsg('Added to cart');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add to cart');
    }
    setTimeout(() => setMsg(''), 2000);
  }

  if (!product) return <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#616161', marginTop: '40px' }}><Spinner /> Loading product...</div>;

  return (
    <div>
      <div className="product-detail-grid">
        <div style={{ background: '#f5f5f5', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#9e9e9e' }}>No image</span>
          }
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#616161', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            {product.category?.name}
          </div>
          <h1 style={{ marginBottom: '12px' }}>{product.name}</h1>
          <div style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>${product.price.toFixed(2)}</div>
          <p style={{ color: '#616161', lineHeight: '1.6', marginBottom: '24px' }}>{product.description}</p>

          {product.variants?.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Options</div>
              <select style={{ border: '1px solid #000', padding: '8px 12px', width: '100%', background: '#fff' }}>
                {product.variants.map(v => (
                  <option key={v.id}>{v.name}: {v.value}{v.price ? ` (+$${v.price})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
            <label style={{ fontWeight: 600, fontSize: '13px' }}>Qty</label>
            <input
              type="number" min="1" max={product.stock} value={qty}
              onChange={e => setQty(parseInt(e.target.value))}
              style={{ border: '1px solid #000', padding: '8px', width: '70px', outline: 'none' }}
            />
          </div>

          <div style={{ fontSize: '13px', marginBottom: '24px' }}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </div>

          {user ? (
            <button
              disabled={product.stock === 0}
              onClick={addToCart}
              style={{ background: product.stock > 0 ? '#000' : '#e0e0e0', color: product.stock > 0 ? '#fff' : '#9e9e9e', border: 'none', padding: '14px 32px', fontWeight: 600, fontSize: '15px', width: '100%', cursor: 'pointer' }}
            >
              Add to Cart
            </button>
          ) : (
            <button disabled style={{ background: '#e0e0e0', color: '#9e9e9e', border: 'none', padding: '14px 32px', fontWeight: 600, fontSize: '15px', width: '100%' }}>
              Login to purchase
            </button>
          )}

          {msg && <div style={{ marginTop: '12px', padding: '10px', border: '1px solid #000', fontSize: '13px' }}>{msg}</div>}
        </div>
      </div>

      <SimilarProducts productId={id} />
      <Reviews productId={id} />
    </div>
  );
}
