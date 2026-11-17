import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { resolveLink } from "../utils/format.js";

const POINTS = [
  {
    icon: "bi-shield-check",
    text: "Your password is hashed with BCrypt — never stored in plain text."
  },
  {
    icon: "bi-qr-code",
    text: "Single-use QR handovers keep every exchange verified."
  },
  {
    icon: "bi-calendar-check",
    text: "Reservations are protected from double bookings."
  }
];

function safeNext(value) {
  if (!value) return "/dashboard";
  if (/^[a-z0-9-]+\.html(\?.*)?$/i.test(value)) return resolveLink(value, "/dashboard");
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/dashboard";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoggedIn } = useAuth();
  const { toast } = useToast();

  const expired = searchParams.get("expired");
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn && !expired) navigate("/dashboard", { replace: true });
  }, [isLoggedIn, expired, navigate]);

  async function submit(event) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");
    const errors = {};
    if (!email.trim()) errors.collegeEmail = "Enter your college email.";
    if (!password) errors.password = "Enter your password.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setBusy(true);
    try {
      const auth = await login({ collegeEmail: email.trim(), password });
      toast("Welcome back, " + auth.user.name.split(" ")[0] + "!", "success");
      navigate(safeNext(searchParams.get("next")), { replace: true });
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFormError(error.message || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      heading="Welcome back to your campus sharing network."
      blurb="Sign in to manage your listings, approve requests and keep your borrowing on track."
      points={POINTS}
    >
      <Link
        className="d-inline-flex align-items-center gap-2 mb-4 text-decoration-none"
        to="/"
        style={{ color: "var(--bb-muted)", fontWeight: 600, fontSize: ".88rem" }}
      >
        <i className="bi bi-arrow-left" /> Back to home
      </Link>
      <h1 className="mb-1">Sign in</h1>
      <p className="text-muted-2 mb-4">Use your college email to continue.</p>

      {expired && (
        <div className="alert alert-warning d-flex align-items-center gap-2 py-2" role="alert">
          <i className="bi bi-clock-history" />
          <span>Your session expired. Please sign in again.</span>
        </div>
      )}
      {registered && (
        <div className="alert alert-info d-flex align-items-center gap-2 py-2" role="alert">
          <i className="bi bi-check-circle" />
          <span>Account created. Sign in to get started.</span>
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="collegeEmail">
            College email
          </label>
          <div className="input-icon">
            <i className="bi bi-envelope" />
            <input
              className={"form-control" + (fieldErrors.collegeEmail ? " is-invalid" : "")}
              id="collegeEmail"
              name="collegeEmail"
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="invalid-feedback">{fieldErrors.collegeEmail}</div>
        </div>

        <div className="mb-2">
          <div className="d-flex justify-content-between align-items-center">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <span className="form-text mb-1">Min. 8 characters</span>
          </div>
          <div className="input-icon position-relative">
            <i className="bi bi-lock" />
            <input
              className={"form-control" + (fieldErrors.password ? " is-invalid" : "")}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              style={{ paddingRight: "2.9rem" }}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              <i className={"bi " + (showPassword ? "bi-eye-slash" : "bi-eye")} />
            </button>
          </div>
          <div className="invalid-feedback">{fieldErrors.password}</div>
        </div>

        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="remember" defaultChecked />
            <label className="form-check-label small text-muted-2" htmlFor="remember">
              Keep me signed in
            </label>
          </div>
        </div>

        {formError && (
          <div className="alert alert-danger py-2" role="alert">
            {formError}
          </div>
        )}

        <button className="btn btn-bb-primary w-100 btn-lg" type="submit" disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2" />}
          Sign in
        </button>
      </form>

      <p className="text-center text-muted-2 mt-4 mb-0" style={{ fontSize: ".88rem" }}>
        New to BorrowBuddy?{" "}
        <Link className="fw-bold" to="/register">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
