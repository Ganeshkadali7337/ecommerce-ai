import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header style={{ borderBottom: '1px solid #000', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.05em', flexShrink: 0 }}>SHOPAI</Link>
        <div style={{ flex: 1 }}>
          <SearchBar />
        </div>
        <nav style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '14px', flexShrink: 0 }}>
          <Link to="/products">Products</Link>
          <Link to="/cart">Cart</Link>
          {user ? (
            <>
              <Link to="/orders">Orders</Link>
              <button
                onClick={() => { logout(); navigate('/'); }}
                style={{ background: 'none', border: '1px solid #000', padding: '5px 12px', fontSize: '13px', cursor: 'pointer' }}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>
      <main style={{ minHeight: 'calc(100vh - 57px)', padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
        <Outlet />
      </main>
    </>
  );
}
