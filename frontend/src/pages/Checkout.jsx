import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const field = {
  label: { fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' },
  input: { border: '1px solid #000', padding: '10px 12px', width: '100%', outline: 'none', fontSize: '14px', marginBottom: '12px' },
};

export default function Checkout() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [address, setAddress] = useState({ name: '', email: '', street: '', city: '', zip: '' });
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });

  useEffect(() => {
    api.get('/api/cart').then(r => setCart(r.data));
  }, []);

  function updateAddress(key, val) { setAddress(a => ({ ...a, [key]: val })); }
  function updateCard(key, val) { setCard(c => ({ ...c, [key]: val })); }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      const { data } = await api.post('/api/orders/checkout');
      await api.post(`/api/orders/${data.order.id}/confirm`);
      navigate(`/orders/${data.order.id}`);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Checkout failed');
      setLoading(false);
    }
  }

  if (cart.items.length === 0) return <div style={{ color: '#616161', marginTop: '32px' }}>Your cart is empty.</div>;

  return (
    <div style={{ maxWidth: '560px' }}>
      <h1 style={{ marginBottom: '32px' }}>Checkout</h1>

      <form onSubmit={handlePlaceOrder}>
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e0e0e0' }}>Shipping Address</h3>
          <label style={field.label}>Full Name</label>
          <input required style={field.input} value={address.name} onChange={e => updateAddress('name', e.target.value)} />
          <label style={field.label}>Email</label>
          <input required type="email" style={field.input} value={address.email} onChange={e => updateAddress('email', e.target.value)} />
          <label style={field.label}>Street Address</label>
          <input required style={field.input} value={address.street} onChange={e => updateAddress('street', e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={field.label}>City</label>
              <input required style={field.input} value={address.city} onChange={e => updateAddress('city', e.target.value)} />
            </div>
            <div>
              <label style={field.label}>ZIP Code</label>
              <input required style={field.input} value={address.zip} onChange={e => updateAddress('zip', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e0e0e0' }}>Payment</h3>
          <div style={{ border: '1px solid #e0e0e0', padding: '12px', fontSize: '12px', color: '#616161', marginBottom: '16px' }}>
            Test mode — use card <strong>4242 4242 4242 4242</strong>, any future expiry, any CVC
          </div>
          <label style={field.label}>Card Number</label>
          <input
            required style={field.input} placeholder="4242 4242 4242 4242"
            value={card.number}
            maxLength={19}
            onChange={e => updateCard('number', e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={field.label}>Expiry (MM/YY)</label>
              <input required style={field.input} placeholder="12/27" maxLength={5} value={card.expiry} onChange={e => updateCard('expiry', e.target.value)} />
            </div>
            <div>
              <label style={field.label}>CVC</label>
              <input required style={field.input} placeholder="123" maxLength={4} value={card.cvc} onChange={e => updateCard('cvc', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e0e0e0' }}>Order Summary</h3>
          {cart.items.map(item => (
            <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: '14px' }}>
              <span>{item.product?.name} ×{item.quantity}</span>
              <span>${(item.product?.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', marginTop: '12px' }}>
            <span>Total</span>
            <span>${cart.total.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ background: '#000', color: '#fff', border: 'none', padding: '14px', width: '100%', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
        >
          {loading ? 'Placing order...' : `Pay $${cart.total.toFixed(2)}`}
        </button>
        {msg && <div style={{ marginTop: '12px', padding: '10px', border: '1px solid #000', fontSize: '13px' }}>{msg}</div>}
      </form>
    </div>
  );
}
