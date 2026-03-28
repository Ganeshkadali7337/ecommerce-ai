import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const s = {
  page: { maxWidth: '500px' },
  title: { marginBottom: '24px' },
  section: { marginBottom: '24px' },
  sectionTitle: { fontWeight: 600, marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  summaryRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e0e0e0', fontSize: '14px' },
  total: { display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', marginTop: '12px' },
  note: { border: '1px solid #e0e0e0', padding: '12px', fontSize: '13px', color: '#616161', marginBottom: '24px' },
  btn: { background: '#000', color: '#fff', border: 'none', padding: '14px', width: '100%', fontWeight: 600 },
  msg: { marginTop: '12px', padding: '10px', border: '1px solid #000', fontSize: '13px' },
};

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/api/cart').then(r => setCart(r.data));
  }, []);

  async function handlePlaceOrder() {
    setLoading(true);
    setMsg('');
    try {
      const { data } = await api.post('/api/orders/checkout');
      await api.post(`/api/orders/${data.order.id}/confirm`);
      navigate(`/orders/${data.order.id}`);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Checkout</h1>

      <div style={s.section}>
        <div style={s.sectionTitle}>Order Summary</div>
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
      </div>

      <div style={s.note}>
        This is Stripe test mode. No real payment will be charged.
      </div>

      <button style={s.btn} onClick={handlePlaceOrder} disabled={loading}>
        {loading ? 'Placing order...' : 'Place Order'}
      </button>
      {msg && <div style={s.msg}>{msg}</div>}
    </div>
  );
}
