import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bb-footer">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="brand">
              <img src="/assets/logo.svg" alt="" />
              Borrow<span>Buddy</span>
            </div>
            <p>
              A student-first borrowing and lending platform that turns unused campus items into
              shared resources. Save money, build trust, and borrow smarter.
            </p>
            <div className="social-links">
              <a href="#" aria-label="Instagram">
                <i className="bi bi-instagram" />
              </a>
              <a href="#" aria-label="X">
                <i className="bi bi-twitter-x" />
              </a>
              <a href="#" aria-label="GitHub">
                <i className="bi bi-github" />
              </a>
            </div>
          </div>
          <div className="col-6 col-lg-2">
            <h6>Explore</h6>
            <Link to="/browse">Browse items</Link>
            <Link to="/#how-it-works">How it works</Link>
            <Link to="/items/new">List an item</Link>
            <Link to="/register">Create account</Link>
          </div>
          <div className="col-6 col-lg-2">
            <h6>Your account</h6>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/requests">Borrow requests</Link>
            <Link to="/history">History</Link>
            <Link to="/notifications">Notifications</Link>
          </div>
          <div className="col-lg-4">
            <h6>Built for campus</h6>
            <p className="mb-2">
              <i className="bi bi-shield-check me-2 text-info" />
              JWT secured · BCrypt passwords
            </p>
            <p className="mb-2">
              <i className="bi bi-qr-code me-2 text-info" />
              QR-verified handovers
            </p>
            <p className="mb-0">
              <i className="bi bi-people me-2 text-info" />
              Ratings after completed returns
            </p>
          </div>
        </div>
        <div className="bb-footer-bottom">
          <span>© {year} BorrowBuddy. A college sharing project.</span>
          <span>Made for students, by students.</span>
        </div>
      </div>
    </footer>
  );
}
