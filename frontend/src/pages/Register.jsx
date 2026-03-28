import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = {
  page: { maxWidth: '400px', margin: '60px auto' },
  title: { marginBottom: '24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontWeight: 600, fontSize: '13px' },
  input: { border: '1px solid #000', padding: '10px 12px', outline: 'none', width: '100%' },
  btn: { background: '#000', color: '#fff', border: 'none', padding: '12px', width: '100%', fontWeight: 600 },
  link: { textAlign: 'center', fontSize: '13px', color: '#616161' },
  error: { color: '#000', border: '1px solid #000', padding: '10px', fontSize: '13px' },
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Create Account</h1>
      <form onSubmit={handleSubmit} style={s.form}>
        {error && <div style={s.error}>{error}</div>}
        {['name', 'email', 'password'].map(field => (
          <div key={field} style={s.field}>
            <label style={s.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input
              style={s.input}
              type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              value={form[field]}
              onChange={e => setForm({ ...form, [field]: e.target.value })}
              required
            />
          </div>
        ))}
        <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>{loading ? 'Creating account...' : 'Register'}</button>
        <p style={s.link}>Have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}
