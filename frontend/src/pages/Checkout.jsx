import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../api/client';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const inputStyle = {
  border: '1px solid #000', padding: '10px 12px', width: '100%',
  outline: 'none', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box',
};
const labelStyle = { fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' };

function CheckoutForm({ cart }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [address, setAddress] = useState({ name: '', email: '', street: '', city: '', zip: '' });

  function set(key, val) { setAddress(a => ({ ...a, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setMsg('');

    try {
      const { data } = await api.post('/api/orders/checkout');

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: address.name, email: address.email },
        },
      });

      if (result.error) {
        setMsg(result.error.message);
        setLoading(false);
        return;
      }

      await api.post(`/api/orders/${data.order.id}/confirm`);
      navigate(`/orders/${data.order.id}`);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '520px' }}>
      <h1 style={{ marginBottom: '32px' }}>Checkout</h1>

      <h3 style={{ marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px solid #e0e0e0' }}>Shipping Address</h3>
      <label style={labelStyle}>Full Name</label>
      <input required style={inputStyle} value={address.name} onChange={e => set('name', e.target.value)} />
      <label style={labelStyle}>Email</label>
      <input required type="email" style={inputStyle} value={address.email} onChange={e => set('email', e.target.value)} />
      <label style={labelStyle}>Street Address</label>
      <input required style={inputStyle} value={address.street} onChange={e => set('street', e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>City</label>
          <input required style={inputStyle} value={address.city} onChange={e => set('city', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>ZIP</label>
          <input required style={inputStyle} value={address.zip} onChange={e => set('zip', e.target.value)} />
        </div>
      </div>

      <h3 style={{ margin: '24px 0 16px', paddingBottom: '8px', borderBottom: '1px solid #e0e0e0' }}>Payment</h3>
      <div style={{ border: '1px solid #e0e0e0', padding: '10px', fontSize: '12px', color: '#616161', marginBottom: '12px' }}>
        Test card: <strong>4242 4242 4242 4242</strong> · Any future date · Any CVC
      </div>
      <div style={{ border: '1px solid #000', padding: '12px', marginBottom: '24px' }}>
        <CardElement options={{ style: { base: { fontSize: '14px', color: '#000' } } }} />
      </div>

      <h3 style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e0e0e0' }}>Order Summary</h3>
      {cart.items.map(item => (
        <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
          <span>{item.product?.name} ×{item.quantity}</span>
          <span>${(item.product?.price * item.quantity).toFixed(2)}</span>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px', margin: '12px 0 24px', paddingTop: '8px', borderTop: '1px solid #000' }}>
        <span>Total</span>
        <span>${cart.total.toFixed(2)}</span>
      </div>

      <button
        type="submit" disabled={loading || !stripe}
        style={{ background: '#000', color: '#fff', border: 'none', padding: '14px', width: '100%', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}
      >
        {loading ? 'Processing...' : `Pay $${cart.total.toFixed(2)}`}
      </button>
      {msg && <div style={{ marginTop: '12px', padding: '10px', border: '1px solid #000', fontSize: '13px' }}>{msg}</div>}
    </form>
  );
}

export default function Checkout() {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/api/cart').then(r => setCart(r.data));
  }, []);

  if (cart.items.length === 0) {
    return <div style={{ color: '#616161', marginTop: '32px' }}>Your cart is empty.</div>;
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm cart={cart} navigate={navigate} />
    </Elements>
  );
}
