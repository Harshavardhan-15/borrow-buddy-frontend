export default function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <i className={`bi ${icon}`} />
      </div>
      <h5 className="fw-bold mb-2">{title}</h5>
      <p className="mb-3 mx-auto" style={{ maxWidth: 420 }}>
        {text}
      </p>
      {action}
    </div>
  );
}
