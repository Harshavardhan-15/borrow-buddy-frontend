import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container pb-5">
      <div className="empty-state">
        <div className="empty-icon">
          <i className="bi bi-compass" />
        </div>
        <h5 className="fw-bold mb-2">Page not found</h5>
        <p className="mb-3 mx-auto" style={{ maxWidth: 420 }}>
          The page you're looking for doesn't exist or may have moved.
        </p>
        <Link className="btn btn-bb-primary" to="/">
          Back to home
        </Link>
      </div>
    </div>
  );
}
