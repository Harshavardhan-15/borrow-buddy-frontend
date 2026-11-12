import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import Avatar from "./Avatar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const navClass = ({ isActive }) => "nav-link" + (isActive ? " active" : "");

export default function Navbar() {
  const { user, isLoggedIn, unreadCount, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleLogout() {
    await logout();
    setMenuOpen(false);
    toast("Signed out.", "success");
    navigate("/");
  }

  const publicLinks = (
    <>
      <li className="nav-item">
        <NavLink to="/" end className={navClass}>
          Home
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/browse" className={navClass}>
          Browse items
        </NavLink>
      </li>
      <li className="nav-item">
        <Link className="nav-link" to="/#how-it-works">
          How it works
        </Link>
      </li>
    </>
  );

  const privateLinks = (
    <>
      <li className="nav-item">
        <NavLink to="/dashboard" className={navClass}>
          Dashboard
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/browse" className={navClass}>
          Browse items
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/requests" className={navClass}>
          Requests
        </NavLink>
      </li>
      <li className="nav-item">
        <NavLink to="/history" className={navClass}>
          History
        </NavLink>
      </li>
    </>
  );

  return (
    <nav className="navbar navbar-expand-lg bb-navbar sticky-top">
      <div className="container">
        <Link className="navbar-brand" to="/">
          <img src="/assets/logo.svg" alt="BorrowBuddy logo" />
          Borrow<span>Buddy</span>
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <i className="bi bi-list fs-2 text-ink" />
        </button>
        <div className={"collapse navbar-collapse" + (open ? " show" : "")} id="mainNav">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
            {isLoggedIn ? privateLinks : publicLinks}
          </ul>
          <div className="d-flex align-items-center gap-2">
            {isLoggedIn && user ? (
              <>
                <Link className="bb-bell" to="/notifications" aria-label="Notifications">
                  <i className="bi bi-bell" />
                  {unreadCount > 0 && (
                    <span className="badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
                  )}
                </Link>
                <div className="dropdown" ref={dropdownRef}>
                  <button
                    className="btn p-0 border-0 bg-transparent d-flex align-items-center gap-2"
                    type="button"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((value) => !value)}
                  >
                    <Avatar url={user.profileImage} name={user.name} />
                    <span className="d-none d-xl-inline small fw-bold text-ink">
                      {user.name.split(" ")[0]}
                    </span>
                    <i className="bi bi-chevron-down small text-muted d-none d-xl-inline" />
                  </button>
                  <ul
                    className={"dropdown-menu dropdown-menu-end" + (menuOpen ? " show" : "")}
                    style={{ right: 0, left: "auto" }}
                  >
                    <li>
                      <div className="px-3 py-2">
                        <div className="fw-bold small">{user.name}</div>
                        <div className="text-muted-2" style={{ fontSize: ".75rem" }}>
                          {user.collegeEmail}
                        </div>
                      </div>
                    </li>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/dashboard">
                        <i className="bi bi-grid me-2" />
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/profile">
                        <i className="bi bi-person me-2" />
                        My profile
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/requests">
                        <i className="bi bi-arrow-left-right me-2" />
                        Borrow requests
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/reviews">
                        <i className="bi bi-star me-2" />
                        Reviews
                      </Link>
                    </li>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <button className="dropdown-item text-danger" type="button" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2" />
                        Sign out
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <Link className="btn btn-bb-ghost d-none d-sm-inline-flex" to="/login">
                  Sign in
                </Link>
                <Link className="btn btn-bb-primary" to="/register">
                  Join BorrowBuddy
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
