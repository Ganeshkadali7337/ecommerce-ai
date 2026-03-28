import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const s = {
  layout: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '48px' },
  row: { display: 'grid', gridTemplateColumns: '60px 1fr auto auto', gap: '16px', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #e0e0e0' },
  img: { width: '60px', height: '60px', objectFit: 'cover', background: '#f5f5f5' },
  name: { fontWeight: 600 },
  qtyInput: { border: '1px solid #000', padding: '6px 8px', width: '60px', textAlign: 'center', outline: 'none' },
  removeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#9e9e9e' },
  summary: { border: '1px solid #000', padding: '24px', alignSelf: 'start' },
  summaryTitle: { fontWeight: 600, marginBottom: '16px' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' },
  total: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', borderTop: '1px solid #000', paddingTop: '12px', marginTop: '8px' },
  checkoutBtn: { background: '#000', color: '#fff', border: 'none', padding: '14px', width: '100%', fontWeight: 600, marginTop: '16px' },
  empty: { color: '#616161', marginTop: '32px' },
};

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });

  async function fetchCart() {
    if (!user) return;
    const { data } = await api.get('/api/cart');
    setCart(data);
  }

  useEffect(() => { fetchCart(); }, [user]);

  async function updateQty(productId, quantity) {
    await api.put(`/api/cart/${productId}`, { quantity });
    fetchCart();
  }

  async function remove(productId) {
    await api.delete(`/api/cart/${productId}`);
    fetchCart();
  }

  if (!user) return <div style={s.empty}>Please <Link to="/login">login</Link> to view your cart.</div>;
  if (cart.items.length === 0) return <div style={s.empty}>Your cart is empty. <Link to="/products">Browse products</Link></div>;

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Cart</h1>
      <div className="cart-layout">
        <div>
          {cart.items.map(item => (
            <div key={item.productId} className="cart-row">
              {item.product?.imageUrl
                ? <img src={item.product.imageUrl} alt={item.product.name} style={s.img} />
                : <div style={s.img} />
              }
              <div>
                <div style={s.name}>{item.product?.name}</div>
                <div style={{ fontSize: '13px', color: '#616161' }}>${item.product?.price.toFixed(2)} each</div>
              </div>
              <input
                type="number"
                min="1"
                value={item.quantity}
                style={s.qtyInput}
                onChange={e => updateQty(item.productId, parseInt(e.target.value))}
              />
              <button style={s.removeBtn} onClick={() => remove(item.productId)}>×</button>
            </div>
          ))}
        </div>

        <aside style={s.summary}>
          <div style={s.summaryTitle}>Order Summary</div>
          {cart.items.map(item => (
            <div key={item.productId} style={s.summaryRow}>
              <span>{item.product?.name} ×{item.quantity}</span>
              <span>${(item.product?.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={s.total}>
            <span>Total</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>
          <button style={s.checkoutBtn} onClick={() => navigate('/checkout')}>
            Checkout
          </button>
        </aside>
      </div>
    </div>
  );
}
