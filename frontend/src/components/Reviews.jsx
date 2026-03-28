import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const s = {
  section: { marginTop: '48px', borderTop: '1px solid #000', paddingTop: '32px' },
  title: { marginBottom: '16px' },
  summary: { border: '1px solid #e0e0e0', padding: '14px', marginBottom: '24px', fontSize: '14px', color: '#616161', fontStyle: 'italic' },
  avgRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  avg: { fontSize: '32px', fontWeight: 700 },
  stars: { fontSize: '18px', letterSpacing: '2px' },
  count: { color: '#616161', fontSize: '13px' },
  reviewCard: { borderBottom: '1px solid #e0e0e0', paddingBottom: '16px', marginBottom: '16px' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  reviewer: { fontWeight: 600, fontSize: '13px' },
  rating: { fontSize: '13px' },
  reviewTitle: { fontWeight: 600, marginBottom: '4px' },
  reviewBody: { color: '#616161', fontSize: '14px', lineHeight: '1.6' },
  form: { border: '1px solid #000', padding: '20px', marginTop: '24px' },
  formTitle: { fontWeight: 600, marginBottom: '16px' },
  field: { marginBottom: '12px' },
  label: { fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' },
  input: { border: '1px solid #e0e0e0', padding: '8px 10px', width: '100%', outline: 'none' },
  textarea: { border: '1px solid #e0e0e0', padding: '8px 10px', width: '100%', outline: 'none', resize: 'vertical', minHeight: '80px' },
  select: { border: '1px solid #e0e0e0', padding: '8px 10px', width: '100%', outline: 'none', background: '#fff' },
  btn: { background: '#000', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 600 },
};

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export default function Reviews({ productId }) {
  const { user } = useAuth();
  const [data, setData] = useState({ reviews: [], avgRating: 0, total: 0 });
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const [submitted, setSubmitted] = useState(false);

  async function load() {
    const r = await api.get(`/api/reviews/${productId}`);
    setData(r.data);
  }

  useEffect(() => { load(); }, [productId]);

  async function loadSummary() {
    const r = await api.get(`/api/reviews/${productId}/summary`);
    setSummary(r.data.summary);
  }

  async function submitReview(e) {
    e.preventDefault();
    await api.post(`/api/reviews/${productId}`, { ...form, userName: user.name });
    setSubmitted(true);
    setForm({ rating: 5, title: '', body: '' });
    load();
  }

  return (
    <div style={s.section}>
      <h2 style={s.title}>Reviews</h2>

      {data.total > 0 && (
        <div style={s.avgRow}>
          <span style={s.avg}>{data.avgRating}</span>
          <div>
            <div style={s.stars}>{stars(Math.round(data.avgRating))}</div>
            <div style={s.count}>{data.total} reviews</div>
          </div>
          {!summary && (
            <button onClick={loadSummary} style={{ border: '1px solid #000', background: '#fff', padding: '6px 14px', fontSize: '13px', marginLeft: '16px' }}>
              AI Summary
            </button>
          )}
        </div>
      )}

      {summary && <div style={s.summary}>"{summary}"</div>}

      {data.reviews.map(r => (
        <div key={r._id} style={s.reviewCard}>
          <div style={s.reviewHeader}>
            <span style={s.reviewer}>{r.userName}</span>
            <span style={s.rating}>{stars(r.rating)}</span>
          </div>
          {r.title && <div style={s.reviewTitle}>{r.title}</div>}
          <div style={s.reviewBody}>{r.body}</div>
        </div>
      ))}

      {data.total === 0 && <p style={{ color: '#9e9e9e', fontSize: '14px' }}>No reviews yet.</p>}

      {user && !submitted && (
        <form onSubmit={submitReview} style={s.form}>
          <div style={s.formTitle}>Write a Review</div>
          <div style={s.field}>
            <label style={s.label}>Rating</label>
            <select style={s.select} value={form.rating} onChange={e => setForm({ ...form, rating: parseInt(e.target.value) })}>
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{stars(n)} ({n})</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>Title</label>
            <input style={s.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Review</label>
            <textarea style={s.textarea} required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          </div>
          <button type="submit" style={s.btn}>Submit Review</button>
        </form>
      )}
      {submitted && <p style={{ marginTop: '16px', fontSize: '14px' }}>Review submitted.</p>}
    </div>
  );
}
