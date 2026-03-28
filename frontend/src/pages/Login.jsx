import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = {
  page: { maxWidth: '400px', margin: '60px auto' },
  title: { marginBottom: '24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontWeight: 600, fontSize: '13px' },
  input: {
    border: '1px solid #000',
    padding: '10px 12px',
    outline: 'none',
    width: '100%',
  },
  btn: {
    background: '#000',
    color: '#fff',
    border: 'none',
    padding: '12px',
    width: '100%',
    fontWeight: 600,
  },
  link: { textAlign: 'center', fontSize: '13px', color: '#616161' },
  error: { color: '#000', border: '1px solid #000', padding: '10px', fontSize: '13px' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Login</h1>
      <form onSubmit={handleSubmit} style={s.form}>
        {error && <div style={s.error}>{error}</div>}
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button type="submit" style={s.btn}>Login</button>
        <p style={s.link}>No account? <Link to="/register">Register</Link></p>
      </form>
    </div>
  );
}
