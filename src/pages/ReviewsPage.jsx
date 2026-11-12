import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import StatCard from "../components/StatCard.jsx";
import Stars from "../components/Stars.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingBlock from "../components/LoadingBlock.jsx";
import { formatDate, handleImageError, imageUrl, timeAgo } from "../utils/format.js";

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very good",
  5: "Excellent"
};

function StarInput({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className="d-flex align-items-center gap-2">
      <div
        className="star-input"
        role="radiogroup"
        aria-label="Rating"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={star <= active ? "active" : ""}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            aria-checked={value === star}
            role="radio"
            onMouseEnter={() => setHovered(star)}
            onClick={() => onChange(star)}
          >
            <i className="bi bi-star-fill" />
          </button>
        ))}
      </div>
      <span className="small text-muted-2">
        {active ? RATING_LABELS[active] : "Select a rating"}
      </span>
    </div>
  );
}

function PendingCard({ transaction, currentUser, onSubmitted }) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isOwner = currentUser && transaction.owner.id === currentUser.id;
  const counterpart = isOwner ? transaction.borrower : transaction.owner;
  const roleLabel = isOwner ? "You lent to" : "You borrowed from";

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (rating < 1 || rating > 5) {
      setError("Choose a star rating from 1 to 5 before submitting.");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/reviews", {
        transactionId: Number(transaction.id),
        rating,
        comment: comment.trim() || null
      });
      toast("Review submitted. Thank you for building campus trust!", "success");
      onSubmitted();
    } catch (requestError) {
      setError(requestError.message || "Could not submit your review.");
      setBusy(false);
    }
  }

  return (
    <div className="bb-card mb-3 review-card">
      <div className="bb-card-body">
        <div className="d-flex flex-wrap gap-3">
          <img
            src={imageUrl(transaction.item.imageUrl)}
            alt=""
            onError={handleImageError}
            style={{
              width: 76,
              height: 76,
              borderRadius: 14,
              objectFit: "cover",
              flex: "0 0 76px"
            }}
          />
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
              <div className="min-w-0">
                <div className="fw-bold">
                  <Link className="text-reset" to={`/items/${transaction.item.id}`}>
                    {transaction.item.itemName}
                  </Link>
                </div>
                <div className="small text-muted-2">
                  <i className="bi bi-person me-1" />
                  {roleLabel} {counterpart.name} · {transaction.item.category}
                </div>
              </div>
              <span className="pill pill-success">
                <i className="bi bi-check-circle-fill" /> Returned
              </span>
            </div>
            <div className="small text-muted-2 mt-2">
              <i className="bi bi-calendar3 me-1" />
              {formatDate(transaction.startDate)} – {formatDate(transaction.returnDate)}
            </div>
          </div>
        </div>

        <div className="divider" />

        <form onSubmit={submit} noValidate>
          <div className="mb-2">
            <StarInput value={rating} onChange={setRating} />
          </div>
          <label className="form-label" htmlFor={`comment-${transaction.id}`}>
            Comment <span className="text-muted-2 fw-normal">(optional)</span>
          </label>
          <textarea
            className="form-control"
            id={`comment-${transaction.id}`}
            rows={2}
            maxLength={1000}
            placeholder="How was the item and the exchange? Your feedback helps the next borrower."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
          {error && (
            <div className="alert alert-danger py-2 mt-2" role="alert">
              {error}
            </div>
          )}
          <div className="d-flex flex-wrap gap-2 mt-3">
            <button className="btn btn-bb-primary btn-sm" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Submitting…
                </>
              ) : (
                <>
                  <i className="bi bi-send me-1" />
                  Submit review
                </>
              )}
            </button>
            <Link className="btn btn-bb-ghost btn-sm" to={`/items/${transaction.item.id}`}>
              View item
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function GivenCard({ review }) {
  return (
    <div className="bb-card mb-3">
      <div className="bb-card-body">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
          <div className="min-w-0">
            <div className="fw-bold">{review.itemName}</div>
            <div className="small text-muted-2">
              <i className="bi bi-person me-1" />
              Review for {review.reviewedStudent.name} · {timeAgo(review.createdAt)}
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Stars rating={review.rating} />
            <span className="small fw-bold text-muted-2">{review.rating}/5</span>
          </div>
        </div>
        <div
          className="rounded-3 p-3 mt-3"
          style={{ background: "#f8fbff", fontSize: ".88rem", color: "#475569" }}
        >
          {review.comment ? (
            review.comment
          ) : (
            <span className="text-muted-2 fst-italic">No comment left.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);
  const [given, setGiven] = useState([]);
  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingData, givenData, profileData] = await Promise.all([
        api.get("/api/reviews/pending"),
        api.get("/api/reviews/mine"),
        api.get("/api/students/profile").catch(() => null)
      ]);
      setPending(pendingData || []);
      setGiven(givenData || []);
      setProfile(profileData);
    } catch (requestError) {
      setError(requestError.message || "Could not load reviews.");
      setPending([]);
      setGiven([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rating =
    profile && Number(profile.averageRating) > 0
      ? Number(profile.averageRating).toFixed(1)
      : "—";
  const received = profile ? profile.reviewCount : 0;

  return (
    <>
      <div className="container bb-page-head">
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div>
            <span className="eyebrow">
              <i className="bi bi-star" /> Trust &amp; feedback
            </span>
            <h1 className="mt-3 mb-1">Reviews</h1>
            <p className="text-muted-2 mb-0">
              Reviews unlock after an item has been returned. Your feedback helps everyone borrow
              with confidence.
            </p>
          </div>
          <Link className="btn btn-bb-outline" to="/history">
            <i className="bi bi-clock-history me-1" />
            Borrowing history
          </Link>
        </div>
      </div>

      <div className="container pb-5">
        <div className="row g-3 mb-4">
          {loading ? (
            [0, 1, 2, 3].map((index) => (
              <div className="col-6 col-lg-3" key={index}>
                <div className="skeleton" style={{ height: 104 }} />
              </div>
            ))
          ) : (
            <>
              <StatCard
                icon="bi-hourglass-split"
                value={pending.length}
                label="Awaiting your review"
                tone="amber"
              />
              <StatCard
                icon="bi-send-check"
                value={given.length}
                label="Reviews you've given"
                tone="teal"
              />
              <StatCard icon="bi-star" value={rating} label="Your average rating" tone="rose" />
              <StatCard
                icon="bi-chat-square-heart"
                value={received}
                label="Reviews received"
              />
            </>
          )}
        </div>

        <ul className="nav nav-pills gap-2 mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={"nav-link" + (tab === "pending" ? " active" : "")}
              type="button"
              role="tab"
              aria-selected={tab === "pending"}
              onClick={() => setTab("pending")}
            >
              <i className="bi bi-hourglass-split me-1" />
              Awaiting your review
              <span className="badge rounded-pill text-bg-light ms-1">{pending.length}</span>
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={"nav-link" + (tab === "given" ? " active" : "")}
              type="button"
              role="tab"
              aria-selected={tab === "given"}
              onClick={() => setTab("given")}
            >
              <i className="bi bi-send-check me-1" />
              Reviews you've given
              <span className="badge rounded-pill text-bg-light ms-1">{given.length}</span>
            </button>
          </li>
        </ul>

        {loading && <LoadingBlock message="Loading reviews…" />}

        {!loading && error && (
          <EmptyState icon="bi-wifi-off" title="Could not load reviews" text={error} />
        )}

        {!loading && !error && tab === "pending" && (
          <>
            {pending.length === 0 ? (
              <EmptyState
                icon="bi-check2-circle"
                title="You're all caught up"
                text="You have no completed borrows waiting for a review. Reviews unlock after an item is returned."
                action={
                  <Link className="btn btn-bb-outline btn-sm" to="/history">
                    View borrowing history
                  </Link>
                }
              />
            ) : (
              pending.map((transaction) => (
                <PendingCard
                  key={transaction.id}
                  transaction={transaction}
                  currentUser={user}
                  onSubmitted={load}
                />
              ))
            )}
          </>
        )}

        {!loading && !error && tab === "given" && (
          <>
            {given.length === 0 ? (
              <EmptyState
                icon="bi-star"
                title="No reviews given yet"
                text="After you return an item (or receive one back), you can leave a review for the other student."
              />
            ) : (
              given.map((review) => <GivenCard key={review.id} review={review} />)
            )}
          </>
        )}
      </div>
    </>
  );
}
