export default function LoadingBlock({ message = "Loading…" }) {
  return (
    <div className="spinner-wrap">
      <span className="spinner-border spinner-border-sm" role="status" />
      <span>{message}</span>
    </div>
  );
}
