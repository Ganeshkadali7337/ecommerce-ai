import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Reviews from '../components/Reviews';

const s = {
  layout: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' },
  imgBox: { background: '#f5f5f5', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  img: { width: '100%', height: '100%', objectFit: 'cover' },
  placeholder: { color: '#9e9e9e' },
  category: { fontSize: '12px', color: '#616161', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' },
  name: { marginBottom: '12px' },
  price: { fontSize: '24px', fontWeight: 700, marginBottom: '16px' },
  desc: { color: '#616161', lineHeight: '1.6', marginBottom: '24px' },
  stock: { fontSize: '13px', marginBottom: '24px' },
  btn: { background: '#000', color: '#fff', border: 'none', padding: '14px 32px', fontWeight: 600, fontSize: '15px', width: '100%' },
  btnDisabled: { background: '#e0e0e0', color: '#9e9e9e', border: 'none', padding: '14px 32px', fontWeight: 600, fontSize: '15px', width: '100%' },
  variants: { marginBottom: '24px' },
  variantLabel: { fontSize: '13px', fontWeight: 600, marginBottom: '8px' },
  variantSelect: { border: '1px solid #000', padding: '8px 12px', width: '100%', outline: 'none', background: '#fff' },
  msg: { marginTop: '12px', padding: '10px', border: '1px solid #000', fontSize: '13px' },
};

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

  if (!product) return <div>Loading...</div>;

  return (
    <div style={{ ...s.layout, gridTemplateColumns: '1fr 1fr', flexWrap: 'wrap' }}>
      <div style={s.imgBox}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} style={s.img} />
          : <span style={s.placeholder}>No image</span>
        }
      </div>
      <div>
        <div style={s.category}>{product.category?.name}</div>
        <h1 style={s.name}>{product.name}</h1>
        <div style={s.price}>${product.price.toFixed(2)}</div>
        <p style={s.desc}>{product.description}</p>

        {product.variants?.length > 0 && (
          <div style={s.variants}>
            <div style={s.variantLabel}>Options</div>
            <select style={s.variantSelect}>
              {product.variants.map(v => (
                <option key={v.id} value={v.id}>{v.name}: {v.value}{v.price ? ` (+$${v.price})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: '13px' }}>Qty</label>
          <input
            type="number"
            min="1"
            max={product.stock}
            value={qty}
            onChange={e => setQty(parseInt(e.target.value))}
            style={{ border: '1px solid #000', padding: '8px', width: '70px', outline: 'none' }}
          />
        </div>

        <div style={s.stock}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </div>

        {user ? (
          <button
            style={product.stock > 0 ? s.btn : s.btnDisabled}
            disabled={product.stock === 0}
            onClick={addToCart}
          >
            Add to Cart
          </button>
        ) : (
          <button style={s.btnDisabled} disabled>Login to purchase</button>
        )}

        {msg && <div style={s.msg}>{msg}</div>}
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Reviews productId={id} />
      </div>
    </div>
  );
}
