import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';

async function downloadInvoice(orderId) {
  const res = await api.get(`/api/orders/${orderId}/invoice`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${orderId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const statusColors = { pending: '#9e9e9e', paid: '#000', shipped: '#000', cancelled: '#9e9e9e' };

const s = {
  row: { border: '1px solid #e0e0e0', padding: '16px', marginBottom: '12px' },
  rowHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  orderId: { fontWeight: 600, fontSize: '13px', fontFamily: 'monospace' },
  status: { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  meta: { fontSize: '13px', color: '#616161' },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' },
  itemRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e0e0e0', fontSize: '14px' },
  sidebar: { border: '1px solid #000', padding: '20px', alignSelf: 'start' },
  label: { fontWeight: 600, marginBottom: '4px', fontSize: '13px' },
  value: { color: '#616161', fontSize: '14px', marginBottom: '16px' },
  invoiceLink: { display: 'inline-block', border: '1px solid #000', padding: '8px 16px', fontSize: '13px', fontWeight: 600 },
};

export function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/api/orders/${id}`).then(r => setOrder(r.data));
  }, [id]);

  if (!order) return <div>Loading...</div>;

  return (
    <div>
      <Link to="/orders" style={{ fontSize: '13px', color: '#616161' }}>← Back to orders</Link>
      <h1 style={{ margin: '16px 0 24px' }}>Order Details</h1>
      <div style={s.detailGrid}>
        <div>
          {order.items.map(item => (
            <div key={item.id} style={s.itemRow}>
              <span>{item.product?.name} ×{item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ ...s.itemRow, fontWeight: 700 }}>
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
        <aside style={s.sidebar}>
          <div style={s.label}>Order ID</div>
          <div style={{ ...s.value, fontFamily: 'monospace', fontSize: '12px' }}>{order.id}</div>
          <div style={s.label}>Status</div>
          <div style={{ ...s.value, color: statusColors[order.status] || '#000', fontWeight: 600, textTransform: 'uppercase' }}>{order.status}</div>
          <div style={s.label}>Date</div>
          <div style={s.value}>{new Date(order.createdAt).toLocaleDateString()}</div>
          {order.status === 'paid' && (
            <button onClick={() => downloadInvoice(order.id)} style={{ ...s.invoiceLink, cursor: 'pointer', background: '#fff' }}>
              Download Invoice
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get('/api/orders').then(r => setOrders(r.data));
  }, []);

  if (orders.length === 0) return <div style={{ color: '#616161', marginTop: '32px' }}>No orders yet.</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Order History</h1>
      {orders.map(order => (
        <Link key={order.id} to={`/orders/${order.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
          <div style={s.row}>
            <div style={s.rowHeader}>
              <span style={s.orderId}>{order.id.slice(0, 8)}...</span>
              <span style={{ ...s.status, color: statusColors[order.status] || '#000' }}>{order.status}</span>
            </div>
            <div style={s.meta}>
              {order.items.length} item{order.items.length !== 1 ? 's' : ''} · ${order.total.toFixed(2)} · {new Date(order.createdAt).toLocaleDateString()}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
