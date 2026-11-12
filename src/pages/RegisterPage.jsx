import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

const POINTS = [
  { icon: "bi-people", text: "Only students with a college email can join." },
  { icon: "bi-cash-coin", text: "Borrowing is free — no deposits, no markup." },
  { icon: "bi-star", text: "Build a trust score from completed borrows." }
];

const STRENGTH_COLORS = ["#e9eef6", "#ef4444", "#f59e0b", "#0ea5a4", "#047857"];
const STRENGTH_LABELS = [
  "Use 8+ characters with letters and numbers.",
  "Weak — add more characters.",
  "Fair — add a number or symbol.",
  "Good password.",
  "Strong password."
];

function scorePassword(value) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
  if (value.length >= 12) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return score;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoggedIn } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    collegeEmail: "",
    studentId: "",
    password: "",
    confirmPassword: ""
  });
  const [terms, setTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn) navigate("/dashboard", { replace: true });
  }, [isLoggedIn, navigate]);

  const strength = scorePassword(form.password);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  }

  async function submit(event) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");

    const errors = {};
    if (!form.name.trim()) errors.name = "Enter your full name.";
    if (!form.collegeEmail.trim()) errors.collegeEmail = "Enter your college email.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.collegeEmail.trim())) {
      errors.collegeEmail = "Enter a valid email address.";
    }
    if (!form.studentId.trim()) errors.studentId = "Enter your student ID.";
    if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      errors.password = "Include at least one letter and one number.";
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    if (!terms) {
      setFormError("Please confirm you'll return borrowed items on time.");
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    if (!terms) return;

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        collegeEmail: form.collegeEmail.trim(),
        studentId: form.studentId.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword
      });
      toast("Account created. Welcome to BorrowBuddy!", "success");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFormError(error.message || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      heading="Join the sharing economy on your campus."
      blurb="Create a free account with your college email, list what you can lend, and borrow what you need."
      points={POINTS}
    >
      <Link
        className="d-inline-flex align-items-center gap-2 mb-4 text-decoration-none"
        to="/"
        style={{ color: "var(--bb-muted)", fontWeight: 600, fontSize: ".88rem" }}
      >
        <i className="bi bi-arrow-left" /> Back to home
      </Link>
      <h1 className="mb-1">Create your account</h1>
      <p className="text-muted-2 mb-4">It takes less than a minute.</p>

      <form onSubmit={submit} noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="name">
            Full name
          </label>
          <div className="input-icon">
            <i className="bi bi-person" />
            <input
              className={"form-control" + (fieldErrors.name ? " is-invalid" : "")}
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Aarav Sharma"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
            />
          </div>
          <div className="invalid-feedback">{fieldErrors.name}</div>
        </div>

        <div className="row g-3">
          <div className="col-sm-7">
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
                value={form.collegeEmail}
                onChange={(event) => update("collegeEmail", event.target.value)}
                required
              />
            </div>
            <div className="invalid-feedback">{fieldErrors.collegeEmail}</div>
          </div>
          <div className="col-sm-5">
            <label className="form-label" htmlFor="studentId">
              Student ID
            </label>
            <div className="input-icon">
              <i className="bi bi-person-vcard" />
              <input
                className={"form-control" + (fieldErrors.studentId ? " is-invalid" : "")}
                id="studentId"
                name="studentId"
                type="text"
                placeholder="STU2024001"
                value={form.studentId}
                onChange={(event) => update("studentId", event.target.value)}
                required
              />
            </div>
            <div className="invalid-feedback">{fieldErrors.studentId}</div>
          </div>
        </div>

        <div className="mt-3">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <div className="input-icon position-relative">
            <i className="bi bi-lock" />
            <input
              className={"form-control" + (fieldErrors.password ? " is-invalid" : "")}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              style={{ paddingRight: "2.9rem" }}
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
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
          <div className="strength-bar mt-2">
            <span
              style={{
                width: strength * 25 + "%",
                background: STRENGTH_COLORS[strength]
              }}
            />
          </div>
          <div className="form-text mt-1">{STRENGTH_LABELS[strength]}</div>
          <div className="invalid-feedback">{fieldErrors.password}</div>
        </div>

        <div className="mt-3">
          <label className="form-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <div className="input-icon position-relative">
            <i className="bi bi-shield-lock" />
            <input
              className={"form-control" + (fieldErrors.confirmPassword ? " is-invalid" : "")}
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              style={{ paddingRight: "2.9rem" }}
              value={form.confirmPassword}
              onChange={(event) => update("confirmPassword", event.target.value)}
              required
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showConfirm ? "Hide password" : "Show password"}
              onClick={() => setShowConfirm((value) => !value)}
            >
              <i className={"bi " + (showConfirm ? "bi-eye-slash" : "bi-eye")} />
            </button>
          </div>
          <div className="invalid-feedback">{fieldErrors.confirmPassword}</div>
        </div>

        <div className="form-check mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="terms"
            checked={terms}
            onChange={(event) => {
              setTerms(event.target.checked);
              setFormError("");
            }}
            required
          />
          <label className="form-check-label small text-muted-2" htmlFor="terms">
            I agree to treat borrowed items with care and return them on time.
          </label>
        </div>

        {formError && (
          <div className="alert alert-danger py-2 mt-3" role="alert">
            {formError}
          </div>
        )}

        <button className="btn btn-bb-primary w-100 btn-lg mt-3" type="submit" disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2" />}
          Create account
        </button>
      </form>

      <p className="text-center text-muted-2 mt-4 mb-0" style={{ fontSize: ".88rem" }}>
        Already have an account?{" "}
        <Link className="fw-bold" to="/login">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
