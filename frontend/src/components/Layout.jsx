import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import ChatWidget from './ChatWidget';

export default function Layout() {
  const { user, logout } = useAuth();
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
          <Link to="/cart">Cart</Link>
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
