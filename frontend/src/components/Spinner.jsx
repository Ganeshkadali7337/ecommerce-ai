export default function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid #e0e0e0`,
      borderTop: `2px solid #000`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      display: 'inline-block',
    }} />
  );
}
