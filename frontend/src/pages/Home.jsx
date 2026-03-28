import { useEffect, useState } from 'react';

const styles = {
  container: { maxWidth: '800px' },
  title: { marginBottom: '8px' },
  subtitle: { color: '#616161', marginBottom: '32px' },
  statusBox: {
    border: '1px solid #000',
    padding: '16px',
    marginTop: '24px',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  label: { fontWeight: 600, marginBottom: '8px' },
};

export default function Home() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(setHealth)
      .catch(() => setHealth({ status: 'error' }));
  }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>ShopAI</h1>
      <p style={styles.subtitle}>AI-powered e-commerce platform</p>

      <div style={styles.statusBox}>
        <div style={styles.label}>API Status</div>
        {health ? (
          <div>{health.status === 'ok' ? '✓ Backend connected' : '✗ Backend unreachable'}</div>
        ) : (
          <div>Checking...</div>
        )}
      </div>
    </div>
  );
}
