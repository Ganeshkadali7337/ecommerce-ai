import { Link } from 'react-router-dom';

const s = {
  card: {
    border: '1px solid #000',
    display: 'flex',
    flexDirection: 'column',
  },
  img: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover',
    display: 'block',
    background: '#f5f5f5',
  },
  imgPlaceholder: {
    width: '100%',
    aspectRatio: '1',
    background: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9e9e9e',
    fontSize: '12px',
  },
  body: { padding: '12px' },
  category: { fontSize: '11px', color: '#616161', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  name: { fontWeight: 600, marginBottom: '6px', fontSize: '14px' },
  price: { fontWeight: 700, fontSize: '15px' },
};

export default function ProductCard({ product }) {
  return (
    <Link to={`/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={s.card}>
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} style={s.img} />
          : <div style={s.imgPlaceholder}>No image</div>
        }
        <div style={s.body}>
          <div style={s.category}>{product.category?.name}</div>
          <div style={s.name}>{product.name}</div>
          <div style={s.price}>${product.price.toFixed(2)}</div>
        </div>
      </div>
    </Link>
  );
}
