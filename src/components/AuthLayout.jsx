import { Link } from "react-router-dom";

export default function AuthLayout({ heading, blurb, points = [], children }) {
  return (
    <div className="auth-shell">
      <aside className="auth-side">
        <Link className="brand" to="/">
          <img src="/assets/logo.svg" alt="BorrowBuddy logo" />
          Borrow<span>Buddy</span>
        </Link>
        <div className="position-relative">
          <h2>{heading}</h2>
          <p className="mt-3">{blurb}</p>
          <div className="auth-points mt-4">
            {points.map((point) => (
              <div className="auth-point" key={point.text}>
                <i className={`bi ${point.icon}`} />
                <span>{point.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="small position-relative" style={{ color: "#8fa9cc" }}>
          © {new Date().getFullYear()} BorrowBuddy
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
