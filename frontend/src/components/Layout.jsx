import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = {
  header: {
    borderBottom: '1px solid #000',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: { fontWeight: 700, fontSize: '18px', letterSpacing: '0.05em' },
  nav: { display: 'flex', gap: '24px', alignItems: 'center', fontSize: '14px' },
  btn: { background: 'none', border: '1px solid #000', padding: '6px 14px', fontSize: '13px' },
  main: {
    minHeight: 'calc(100vh - 57px)',
    padding: '32px 24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <>
      <header style={s.header}>
        <Link to="/" style={s.logo}>SHOPAI</Link>
        <nav style={s.nav}>
          <Link to="/products">Products</Link>
          <Link to="/cart">Cart</Link>
          {user ? (
            <>
              <Link to="/orders">Orders</Link>
              <button style={s.btn} onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>
      <main style={s.main}>
        <Outlet />
      </main>
    </>
  );
}
