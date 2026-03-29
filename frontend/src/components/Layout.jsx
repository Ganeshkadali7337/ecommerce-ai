import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SearchBar from './SearchBar';
import ChatWidget from './ChatWidget';

export default function Layout() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <>
      <header className="header">
        <Link to="/" className="header-logo">SHOPAI</Link>
        <div className="header-search">
          <SearchBar />
        </div>
        <nav className="header-nav">
          <Link to="/products">Products</Link>
          <Link to="/cart" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Cart
            {cartCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-10px',
                background: '#000',
                color: '#fff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/orders">Orders</Link>
              <button
                onClick={handleLogout}
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

      <main className="main-content">
        <Outlet />
      </main>
      <ChatWidget />
    </>
  );
}
