export default function Loader({ text = '' }) {
  return (
    <div className="loader" style={{ flexDirection: 'column', gap: 12 }}>
      <div className="spinner" />
      {text && (
        <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>{text}</p>
      )}
    </div>
  );
}
