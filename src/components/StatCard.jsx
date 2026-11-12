import { Link } from "react-router-dom";

export default function StatCard({ icon, value, label, tone = "", to, linkLabel = "View" }) {
  return (
    <div className="col-6 col-lg-3">
      <div className="stat-card h-100">
        <div className={"stat-icon " + tone}>
          <i className={`bi ${icon}`} />
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {to && (
          <Link className="stat-link d-inline-block mt-2" to={to}>
            {linkLabel} <i className="bi bi-arrow-right" />
          </Link>
        )}
      </div>
    </div>
  );
}
