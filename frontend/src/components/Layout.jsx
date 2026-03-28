import { Outlet, Link } from 'react-router-dom';

const styles = {
  header: {
    borderBottom: '1px solid #000',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontWeight: 700,
    fontSize: '18px',
    letterSpacing: '0.05em',
  },
  nav: {
    display: 'flex',
    gap: '24px',
  },
  main: {
    minHeight: 'calc(100vh - 57px)',
    padding: '32px 24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
};

export default function Layout() {
  return (
    <>
      <header style={styles.header}>
        <Link to="/" style={styles.logo}>SHOPAI</Link>
        <nav style={styles.nav}>
          <Link to="/products">Products</Link>
          <Link to="/cart">Cart</Link>
          <Link to="/login">Login</Link>
        </nav>
      </header>
      <main style={styles.main}>
        <Outlet />
      </main>
    </>
  );
}
