import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

function stars(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

export default function Reviews({ productId }) {
  const { user } = useAuth();
  const [data, setData] = useState({ reviews: [], avgRating: 0, total: 0 });
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const [images, setImages] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  async function load() {
    try {
      const r = await api.get(`/api/reviews/${productId}`);
      setData(r.data);
    } catch {}
  }

  useEffect(() => { load(); }, [productId]);

  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const r = await api.get(`/api/reviews/${productId}/summary`);
      setSummary(r.data.summary);
    } catch {
      setSummary('Could not generate summary.');
    }
    setLoadingSummary(false);
  }

  async function submitReview(e) {
    e.preventDefault();
    setSubmitting(true);
    setReviewError('');
    try {
      const fd = new FormData();
      fd.append('rating', form.rating);
      fd.append('title', form.title);
      fd.append('body', form.body);
      fd.append('userName', user.name);
      images.forEach(f => fd.append('images', f));
      await api.post(`/api/reviews/${productId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSubmitted(true);
      setForm({ rating: 5, title: '', body: '' });
      setImages([]);
      load();
    } catch (err) {
      setReviewError(err.response?.data?.error || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: '48px', borderTop: '1px solid #000', paddingTop: '32px' }}>
      <h2 style={{ marginBottom: '16px' }}>Reviews</h2>

      {data.total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <span style={{ fontSize: '32px', fontWeight: 700 }}>{data.avgRating}</span>
          <div>
            <div style={{ fontSize: '18px' }}>{stars(Math.round(data.avgRating))}</div>
            <div style={{ fontSize: '13px', color: '#616161' }}>{data.total} reviews</div>
          </div>
          {!summary && (
            <button
              onClick={loadSummary}
              disabled={loadingSummary}
              style={{ border: '1px solid #000', background: '#fff', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' }}
            >
              {loadingSummary ? 'Generating...' : 'AI Summary'}
            </button>
          )}
        </div>
      )}

      {summary && (
        <div style={{ border: '1px solid #e0e0e0', padding: '14px', marginBottom: '24px', fontSize: '14px', color: '#616161', fontStyle: 'italic' }}>
          "{summary}"
        </div>
      )}

      {data.reviews.map(r => (
        <div key={r._id} style={{ borderBottom: '1px solid #e0e0e0', paddingBottom: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{r.userName}</span>
            <span style={{ fontSize: '13px' }}>{stars(r.rating)}</span>
          </div>
          {r.title && <div style={{ fontWeight: 600, marginBottom: '4px' }}>{r.title}</div>}
          <div style={{ color: '#616161', fontSize: '14px', lineHeight: '1.6' }}>{r.body}</div>
          {r.images?.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {r.images.map((src, i) => (
                <img key={i} src={src} alt="review" style={{ width: '80px', height: '80px', objectFit: 'cover', border: '1px solid #e0e0e0' }} />
              ))}
            </div>
          )}
        </div>
      ))}

      {data.total === 0 && <p style={{ color: '#9e9e9e', fontSize: '14px' }}>No reviews yet.</p>}

      {user && !submitted && (
        <form onSubmit={submitReview} style={{ border: '1px solid #000', padding: '20px', marginTop: '24px' }}>
          <div style={{ fontWeight: 600, marginBottom: '16px' }}>Write a Review</div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Rating</label>
            <select
              style={{ border: '1px solid #e0e0e0', padding: '8px 10px', width: '100%', background: '#fff' }}
              value={form.rating}
              onChange={e => setForm({ ...form, rating: parseInt(e.target.value) })}
            >
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{stars(n)} ({n})</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Title</label>
            <input
              style={{ border: '1px solid #e0e0e0', padding: '8px 10px', width: '100%', outline: 'none' }}
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Review</label>
            <textarea
              required
              style={{ border: '1px solid #e0e0e0', padding: '8px 10px', width: '100%', outline: 'none', resize: 'vertical', minHeight: '80px' }}
              value={form.body}
              onChange={e => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Photos (optional, max 3)</label>
            <input
              type="file" accept="image/*" multiple
              onChange={e => setImages(Array.from(e.target.files).slice(0, 3))}
              style={{ fontSize: '13px' }}
            />
          </div>
          {reviewError && <div style={{ color: '#000', border: '1px solid #000', padding: '10px', fontSize: '13px', marginBottom: '12px' }}>{reviewError}</div>}
          <button type="submit" disabled={submitting} style={{ background: '#000', color: '#fff', border: 'none', padding: '10px 24px', fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
      {submitted && <p style={{ marginTop: '16px', fontSize: '14px' }}>Review submitted.</p>}
    </div>
  );
}
