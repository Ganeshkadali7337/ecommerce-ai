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
  body: { padding: '8px' },
  category: { fontSize: '10px', color: '#616161', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  name: { fontWeight: 600, fontSize: '12px', flex: 1, minWidth: 0, wordBreak: 'break-word' },
  row: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '4px', marginTop: '4px' },
  right: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 },
  price: { fontWeight: 700, fontSize: '13px' },
  rating: { fontSize: '11px', color: '#616161', marginTop: '2px' },
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
          <div style={s.row}>
            <div style={s.name}>{product.name}</div>
            <div style={s.right}>
              <div style={s.price}>${product.price.toFixed(2)}</div>
              {product.rating > 0 && (
                <div style={s.rating}>
                  {'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))} {product.rating.toFixed(1)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
