import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ItemCard from "../components/ItemCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api } from "../api/client.js";

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const end = Number(target) || 0;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(end * eased));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}

function HeroStat({ value }) {
  const animated = useCountUp(value);
  return <strong>{value === null ? "—" : animated.toLocaleString()}</strong>;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ students: null, items: null, completedBorrows: null });
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/public/stats")
      .then((data) => {
        if (!cancelled) setStats(data || {});
      })
      .catch(() => {
        if (!cancelled) setStats({ students: 0, items: 0, completedBorrows: 0 });
      });

    api
      .get("/api/items/featured")
      .then((items) => {
        if (!cancelled) setFeatured(items || []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function submitSearch(event) {
    event.preventDefault();
    const trimmed = query.trim();
    navigate("/browse" + (trimmed ? "?q=" + encodeURIComponent(trimmed) : ""));
  }

  return (
    <>
      <section className="bb-hero">
        <div className="container position-relative">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <span className="eyebrow eyebrow-light">
                <i className="bi bi-stars" /> Built for your campus
              </span>
              <h1>
                Borrow what you need.
                <br />
                <span className="accent">Lend what you don't.</span>
              </h1>
              <p className="lead">
                Calculators, lab coats, cameras, textbooks — borrow them from students on your
                campus and return them when you're done. No shops, no markup, just sharing.
              </p>
              <form className="hero-search" role="search" onSubmit={submitSearch}>
                <input
                  className="form-control"
                  type="search"
                  placeholder="Search calculators, books, cameras…"
                  aria-label="Search items"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button className="btn btn-bb-teal px-4" type="submit">
                  <i className="bi bi-search me-1" /> Search
                </button>
              </form>
              <div className="hero-stats">
                <div className="hero-stat">
                  <HeroStat value={stats.students} />
                  <span>Students sharing</span>
                </div>
                <div className="hero-stat">
                  <HeroStat value={stats.items} />
                  <span>Items listed</span>
                </div>
                <div className="hero-stat">
                  <HeroStat value={stats.completedBorrows} />
                  <span>Successful borrows</span>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="hero-visual">
                <div className="hero-card hero-card-main">
                  <div className="hero-item-row">
                    <div className="hero-thumb">
                      <i className="bi bi-calculator" />
                    </div>
                    <div className="min-w-0">
                      <div className="fw-bold" style={{ fontSize: ".92rem" }}>
                        Casio FX-991EX Calculator
                      </div>
                      <div className="small text-muted-2">Electronics · Aarav S.</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="pill pill-success">
                      <i className="bi bi-check-circle-fill" /> Available
                    </span>
                    <span className="pill pill-teal">
                      <i className="bi bi-qr-code" /> QR handover
                    </span>
                  </div>
                  <div className="hero-mini-grid">
                    <div className="hero-mini">
                      <i className="bi bi-shield-check" /> Verified students
                    </div>
                    <div className="hero-mini">
                      <i className="bi bi-star-fill" style={{ color: "#f5b301" }} /> Rated lenders
                    </div>
                  </div>
                </div>
                <div className="hero-card hero-card-qr">
                  <div className="hero-qr-icon">
                    <i className="bi bi-qr-code" />
                  </div>
                  <div className="fw-bold" style={{ fontSize: ".85rem" }}>
                    Scan to hand over
                  </div>
                  <div className="small text-muted-2">Single-use QR code, verified in seconds.</div>
                </div>
                <div className="hero-card hero-card-rating">
                  <div className="fw-bold" style={{ fontSize: ".85rem" }}>
                    4.9 <i className="bi bi-star-fill" />
                  </div>
                  <div className="small text-muted-2">Campus trust score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bb-section-sm">
        <div className="container">
          <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
            <div>
              <span className="eyebrow">
                <i className="bi bi-grid" /> Popular right now
              </span>
              <h2 className="bb-section-title mt-3 mb-1">Recently listed on campus</h2>
              <p className="bb-section-lead mb-0">
                Fresh items from students near you, ready to be borrowed.
              </p>
            </div>
            <Link className="btn btn-bb-outline" to="/browse">
              Browse all items <i className="bi bi-arrow-right ms-1" />
            </Link>
          </div>

          <div className="row g-4">
            {loading &&
              [0, 1, 2].map((index) => (
                <div className="col-md-6 col-xl-4" key={index}>
                  <div className="skeleton" style={{ height: 380, borderRadius: 20 }} />
                </div>
              ))}

            {!loading && failed && (
              <div className="col-12">
                <EmptyState
                  icon="bi-wifi-off"
                  title="Could not load items"
                  text="The server may be starting up. Refresh the page to try again."
                />
              </div>
            )}

            {!loading && !failed && featured.length === 0 && (
              <div className="col-12">
                <EmptyState
                  icon="bi-box-seam"
                  title="No items listed yet"
                  text="Be the first to share something with your campus."
                  action={
                    <Link className="btn btn-bb-primary" to="/items/new">
                      List the first item
                    </Link>
                  }
                />
              </div>
            )}

            {!loading &&
              !failed &&
              featured.slice(0, 6).map((item) => (
                <div className="col-md-6 col-xl-4" key={item.id}>
                  <ItemCard item={item} />
                </div>
              ))}
          </div>
        </div>
      </section>

      <section className="bb-section bg-white border-top border-bottom" id="how-it-works">
        <div className="container">
          <div className="text-center mb-5">
            <span className="eyebrow">
              <i className="bi bi-signpost-split" /> How it works
            </span>
            <h2 className="bb-section-title mt-3 mb-2">Three steps to borrow anything</h2>
            <p className="bb-section-lead mx-auto">
              BorrowBuddy handles the awkward parts — requests, approvals, handovers and returns —
              so you can focus on your studies.
            </p>
          </div>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="bb-card step-card">
                <div className="step-num">1</div>
                <h3 className="h5 fw-bold mb-2">Find &amp; request</h3>
                <p className="text-muted-2 mb-0" style={{ fontSize: ".9rem" }}>
                  Browse items by category, check availability and pick the dates you need. Send a
                  request with a short message.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="bb-card step-card">
                <div className="step-num">2</div>
                <h3 className="h5 fw-bold mb-2">Approve &amp; meet</h3>
                <p className="text-muted-2 mb-0" style={{ fontSize: ".9rem" }}>
                  The owner approves your dates. At handover, the owner shows a single-use QR code
                  and you scan it to confirm.
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="bb-card step-card">
                <div className="step-num">3</div>
                <h3 className="h5 fw-bold mb-2">Return &amp; review</h3>
                <p className="text-muted-2 mb-0" style={{ fontSize: ".9rem" }}>
                  Return the item by the agreed date, mark it returned, then leave a review to build
                  campus trust.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bb-section">
        <div className="container">
          <div className="row g-5 align-items-center">
            <div className="col-lg-5">
              <span className="eyebrow">
                <i className="bi bi-heart" /> Why BorrowBuddy
              </span>
              <h2 className="bb-section-title mt-3 mb-3">
                Sharing that feels safe, simple and fair
              </h2>
              <p className="text-muted-2 mb-4">
                Every handover is verified, every reservation is protected from double-booking, and
                every review comes from a completed borrow.
              </p>
              <Link className="btn btn-bb-primary" to="/register">
                <i className="bi bi-person-plus me-1" /> Join your campus
              </Link>
            </div>
            <div className="col-lg-7">
              <div className="row g-4">
                <div className="col-sm-6">
                  <div className="bb-card benefit-card">
                    <div className="benefit-icon">
                      <i className="bi bi-shield-lock" />
                    </div>
                    <h3 className="h6 fw-bold">Secure by design</h3>
                    <p className="text-muted-2 mb-0" style={{ fontSize: ".86rem" }}>
                      JWT authentication, BCrypt password hashing and role-based access control on
                      every endpoint.
                    </p>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="bb-card benefit-card">
                    <div className="benefit-icon">
                      <i className="bi bi-qr-code-scan" />
                    </div>
                    <h3 className="h6 fw-bold">Verified handovers</h3>
                    <p className="text-muted-2 mb-0" style={{ fontSize: ".86rem" }}>
                      Single-use QR codes prove the item changed hands — and can't be reused.
                    </p>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="bb-card benefit-card">
                    <div className="benefit-icon">
                      <i className="bi bi-calendar-check" />
                    </div>
                    <h3 className="h6 fw-bold">No double bookings</h3>
                    <p className="text-muted-2 mb-0" style={{ fontSize: ".86rem" }}>
                      Overlapping reservations are blocked with database-level locking.
                    </p>
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="bb-card benefit-card">
                    <div className="benefit-icon">
                      <i className="bi bi-star" />
                    </div>
                    <h3 className="h6 fw-bold">Real reviews only</h3>
                    <p className="text-muted-2 mb-0" style={{ fontSize: ".86rem" }}>
                      Reviews unlock only after a completed borrow and return.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bb-section-sm">
        <div className="container">
          <div
            className="bb-card p-4 p-md-5 text-center"
            style={{
              background: "linear-gradient(130deg,#0b2552,#123a7a 60%,#0b6b83)",
              border: 0
            }}
          >
            <h2 className="text-white mb-2" style={{ fontSize: "clamp(1.5rem,2.6vw,2.1rem)" }}>
              Got something sitting in your hostel room?
            </h2>
            <p className="mb-4" style={{ color: "#c8d7ee" }}>
              List it in two minutes and help a classmate out — you stay in control of who borrows
              it.
            </p>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <Link className="btn btn-bb-teal btn-lg" to="/items/new">
                <i className="bi bi-plus-circle me-1" /> List an item
              </Link>
              <Link className="btn btn-outline-light btn-lg" to="/browse">
                Browse items
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
