import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useUI } from "../context/UIContext.jsx";
import Avatar from "../components/Avatar.jsx";
import Stars from "../components/Stars.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingBlock from "../components/LoadingBlock.jsx";
import Modal from "../components/Modal.jsx";
import {
  conditionLabel,
  daysBetween,
  formatDate,
  handleImageError,
  imageUrl,
  money,
  timeAgo,
  todayIso
} from "../utils/format.js";

function addDaysIso(iso, days) {
  const date = new Date(iso + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ItemDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const { confirm } = useUI();

  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [startDate, setStartDate] = useState(todayIso(1));
  const [returnDate, setReturnDate] = useState(todayIso(3));
  const [message, setMessage] = useState("");
  const [borrowError, setBorrowError] = useState("");
  const [borrowing, setBorrowing] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportError, setReportError] = useState("");
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setItem(null);
    setReviews(null);

    api
      .get("/api/items/" + id)
      .then(async (data) => {
        if (cancelled) return;
        setItem(data);
        try {
          const ownerReviews = await api.get("/api/reviews/" + data.owner.id);
          if (!cancelled) setReviews(ownerReviews);
        } catch {
          if (!cancelled) setReviews(null);
        }
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (item) document.title = item.itemName + " · BorrowBuddy";
    return () => {
      document.title = "BorrowBuddy · Borrow smarter on campus";
    };
  }, [item]);

  const ownedByMe = useMemo(() => {
    if (!item) return false;
    return Boolean(item.ownedByMe) || (user && item.owner.id === user.id);
  }, [item, user]);

  const estimate = useMemo(() => {
    const days = Math.max(daysBetween(startDate, returnDate), 1);
    const rental = Number(item?.pricePerDay || 0) * days;
    const deposit = Number(item?.securityDeposit || 0);
    return { days, rental, deposit };
  }, [item, startDate, returnDate]);

  function changeStart(value) {
    setStartDate(value);
    if (value && returnDate <= value) setReturnDate(addDaysIso(value, 2));
  }

  async function submitBorrow(event) {
    event.preventDefault();
    setBorrowError("");
    if (!startDate || !returnDate) {
      setBorrowError("Choose both a start and return date.");
      return;
    }
    if (returnDate <= startDate) {
      setBorrowError("Return date must be after the start date.");
      return;
    }
    setBorrowing(true);
    try {
      await api.post("/api/borrow-requests", {
        itemId: Number(item.id),
        startDate,
        returnDate,
        message: message.trim()
      });
      toast("Borrow request sent to " + item.owner.name + ".", "success");
      window.setTimeout(() => navigate("/requests"), 900);
    } catch (error) {
      setBorrowError(error.message || "Could not send the request.");
      setBorrowing(false);
    }
  }

  async function deleteListing() {
    const confirmed = await confirm({
      title: "Delete listing",
      message: `Remove "${item.itemName}" from the marketplace? Borrowing history will be preserved.`,
      confirmText: "Delete listing",
      danger: true
    });
    if (!confirmed) return;
    try {
      await api.del("/api/items/" + item.id);
      toast("Listing removed.", "success");
      window.setTimeout(() => navigate("/profile"), 700);
    } catch (error) {
      toast(error.message || "Could not delete this listing.", "danger");
    }
  }

  async function submitReport() {
    setReportError("");
    if (reportReason.trim().length < 5) {
      setReportError("Please describe the problem (at least 5 characters).");
      return;
    }
    setReporting(true);
    try {
      await api.post("/api/reports", {
        targetType: "ITEM",
        targetId: Number(item.id),
        reason: reportReason.trim()
      });
      setReportOpen(false);
      setReportReason("");
      toast("Report submitted. Thank you.", "success");
    } catch (error) {
      setReportError(error.message || "Could not submit the report.");
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <div className="container pb-5 pt-4">
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="skeleton" style={{ height: 420 }} />
          </div>
          <div className="col-lg-5">
            <div className="skeleton" style={{ height: 420 }} />
          </div>
        </div>
        <LoadingBlock message="Loading item…" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="container pb-5 pt-4">
        <EmptyState
          icon="bi-box-seam"
          title="Item not found"
          text="This listing may have been removed."
          action={
            <Link className="btn btn-bb-primary" to="/browse">
              Browse other items
            </Link>
          }
        />
      </div>
    );
  }

  const availablePill = item.availableNow ? (
    <span className="pill pill-success pill-lg">
      <i className="bi bi-check-circle-fill" /> Available now
    </span>
  ) : item.reservedNow ? (
    <span className="pill pill-warning pill-lg">
      <i className="bi bi-clock-fill" /> Reserved until {formatDate(item.nextAvailableDate)}
    </span>
  ) : (
    <span className="pill pill-muted pill-lg">
      <i className="bi bi-pause-circle-fill" /> Unavailable
    </span>
  );

  const ownerReviews =
    reviews && reviews.reviews && reviews.reviews.length > 0 ? (
      <div className="bb-card mt-4">
        <div className="bb-card-body">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="h6 fw-bold mb-0">Reviews for {item.owner.name}</h2>
            <span className="small text-muted-2">
              <Stars rating={reviews.averageRating} /> {Number(reviews.averageRating).toFixed(1)} (
              {reviews.reviewCount})
            </span>
          </div>
          {reviews.reviews.slice(0, 3).map((review) => (
            <div className="activity-item" key={review.id}>
              <div className="activity-icon">
                <i className="bi bi-star-fill" />
              </div>
              <div className="min-w-0">
                <div className="d-flex align-items-center gap-2">
                  <span className="fw-bold" style={{ fontSize: ".84rem" }}>
                    {review.reviewer.name}
                  </span>
                  <Stars rating={review.rating} />
                </div>
                <div className="activity-text">{review.comment || "No comment left."}</div>
                <div className="activity-time">{timeAgo(review.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <>
      <div className="container pt-4 pb-2">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb small mb-0">
            <li className="breadcrumb-item">
              <Link to="/">Home</Link>
            </li>
            <li className="breadcrumb-item">
              <Link to="/browse">Browse items</Link>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              {item.itemName}
            </li>
          </ol>
        </nav>
      </div>

      <div className="container pb-5" id="detailRoot">
        <div className="row g-4">
          <div className="col-lg-7">
            <div className="bb-card overflow-hidden">
              <div
                style={{
                  aspectRatio: "16/11",
                  background: "linear-gradient(135deg,#eef4ff,#e6fbfa)"
                }}
              >
                <img
                  src={imageUrl(item.imageUrl)}
                  alt={item.itemName}
                  onError={handleImageError}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>

            <div className="bb-card mt-4">
              <div className="bb-card-body">
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <span className="pill pill-info">{item.category}</span>
                  <span className="pill pill-muted">{conditionLabel(item.itemCondition)}</span>
                  {availablePill}
                </div>
                <h1 className="h3 mb-2">{item.itemName}</h1>
                <p className="text-muted-2 mb-3" style={{ whiteSpace: "pre-line" }}>
                  {item.description}
                </p>
                <div className="divider" />
                <div className="d-flex flex-wrap gap-4 small text-muted-2">
                  <span>
                    <i className="bi bi-calendar3 me-1" />
                    Listed {formatDate(item.createdAt)}
                  </span>
                  <span>
                    <i className="bi bi-geo-alt me-1" />
                    Campus pickup
                  </span>
                  <span>
                    <i className="bi bi-shield-check me-1" />
                    QR-verified handover
                  </span>
                </div>
              </div>
            </div>

            {ownerReviews}
          </div>

          <div className="col-lg-5">
            <div className="bb-card">
              <div className="bb-card-body">
                <div className="small-caps mb-2">Lender</div>
                <div className="d-flex align-items-center gap-3">
                  <Avatar url={item.owner.profileImage} name={item.owner.name} />
                  <div className="min-w-0">
                    <div className="fw-bold">{item.owner.name}</div>
                    <div className="small text-muted-2">
                      <Stars rating={item.owner.averageRating} />{" "}
                      {Number(item.owner.reviewCount) > 0
                        ? `${Number(item.owner.averageRating).toFixed(1)} · ${item.owner.reviewCount} review${
                            item.owner.reviewCount === 1 ? "" : "s"
                          }`
                        : "No reviews yet"}
                    </div>
                  </div>
                </div>
                <div className="divider" />
                <div className="d-flex align-items-center justify-content-between small">
                  <span className="text-muted-2">Availability</span>
                  {availablePill}
                </div>
              </div>
            </div>

            {item.contactPhone && (
              <div className="bb-card mt-4">
                <div className="bb-card-body">
                  <h2 className="h6 fw-bold mb-2">
                    <i className="bi bi-telephone me-1" /> Contact
                  </h2>
                  <a
                    className="contact-phone"
                    href={"tel:" + String(item.contactPhone).replace(/[^+0-9]/g, "")}
                  >
                    <i className="bi bi-telephone-outbound me-2" />
                    {item.contactPhone}
                  </a>
                  <p className="form-text mb-0 mt-2">
                    Call or message the lender to coordinate pickup and handover.
                  </p>
                </div>
              </div>
            )}

            <div className="bb-card mt-4">
              <div className="bb-card-body">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <h2 className="h6 fw-bold mb-0">
                    <i className="bi bi-tag me-1" /> Pricing
                  </h2>
                  {Number(item.pricePerDay || 0) > 0 ? (
                    <span className="pill pill-info">{money(item.pricePerDay)} / day</span>
                  ) : (
                    <span className="pill pill-success">Free to borrow</span>
                  )}
                </div>
                <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                  <span className="text-muted-2 small">Rental</span>
                  <strong>
                    {Number(item.pricePerDay || 0) > 0
                      ? money(item.pricePerDay) + " per day"
                      : "Free"}
                  </strong>
                </div>
                <div className="d-flex justify-content-between align-items-center py-2">
                  <span className="text-muted-2 small">Security deposit</span>
                  <strong>
                    {Number(item.securityDeposit || 0) > 0 ? money(item.securityDeposit) : "None"}
                  </strong>
                </div>
                {Number(item.securityDeposit || 0) > 0 && (
                  <div className="form-text">
                    Refunded when the item is returned in the agreed condition.
                  </div>
                )}
                <div
                  className="rounded-3 p-2 mt-2"
                  style={{ background: "#f8fbff", fontSize: ".82rem", color: "#475569" }}
                >
                  {startDate && returnDate ? (
                    <>
                      Estimated rental: <strong>{money(estimate.rental)}</strong> for{" "}
                      {estimate.days} day{estimate.days === 1 ? "" : "s"}
                      {estimate.deposit > 0
                        ? ` + ${money(estimate.deposit)} refundable deposit`
                        : ""}
                      .
                    </>
                  ) : (
                    "Pick dates below to see the estimated rental total."
                  )}
                </div>
              </div>
            </div>

            {ownedByMe ? (
              <div className="bb-card mt-4">
                <div className="bb-card-body">
                  <h2 className="h6 fw-bold mb-2">
                    <i className="bi bi-sliders me-1" /> Manage your listing
                  </h2>
                  <p className="text-muted-2 mb-3" style={{ fontSize: ".86rem" }}>
                    This is your item. You can edit the details or remove the listing.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <Link className="btn btn-bb-primary btn-sm" to={`/items/${item.id}/edit`}>
                      <i className="bi bi-pencil me-1" /> Edit listing
                    </Link>
                    <button
                      className="btn btn-bb-danger-soft btn-sm"
                      type="button"
                      onClick={deleteListing}
                    >
                      <i className="bi bi-trash me-1" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : !isLoggedIn ? (
              <div className="bb-card mt-4">
                <div className="bb-card-body text-center">
                  <div className="empty-icon mx-auto">
                    <i className="bi bi-box-arrow-in-right" />
                  </div>
                  <h2 className="h6 fw-bold mb-2">Sign in to borrow</h2>
                  <p className="text-muted-2 mb-3" style={{ fontSize: ".88rem" }}>
                    Create a free account with your college email to send a borrow request.
                  </p>
                  <Link
                    className="btn btn-bb-primary"
                    to={"/login?next=" + encodeURIComponent(`/items/${item.id}`)}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bb-card mt-4" id="borrow">
                <div className="bb-card-body">
                  <h2 className="h6 fw-bold mb-1">
                    <i className="bi bi-hand-index-thumb me-1" /> Request to borrow
                  </h2>
                  <p className="text-muted-2 mb-3" style={{ fontSize: ".86rem" }}>
                    Choose your dates. The owner will approve or decline your request.
                  </p>
                  {!item.availableNow && (
                    <div className="alert alert-warning py-2 mb-3" style={{ fontSize: ".82rem" }}>
                      <i className="bi bi-info-circle me-1" />
                      This item isn't available right now. You can still request future dates — the
                      owner will review them.
                    </div>
                  )}
                  <form onSubmit={submitBorrow} noValidate>
                    <div className="row g-2">
                      <div className="col-sm-6">
                        <label className="form-label" htmlFor="startDate">
                          Start date
                        </label>
                        <input
                          className="form-control"
                          id="startDate"
                          type="date"
                          min={todayIso(0)}
                          value={startDate}
                          onChange={(event) => changeStart(event.target.value)}
                          required
                        />
                      </div>
                      <div className="col-sm-6">
                        <label className="form-label" htmlFor="returnDate">
                          Return date
                        </label>
                        <input
                          className="form-control"
                          id="returnDate"
                          type="date"
                          min={startDate || todayIso(1)}
                          value={returnDate}
                          onChange={(event) => setReturnDate(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="form-label" htmlFor="message">
                        Message to owner{" "}
                        <span className="text-muted-2 fw-normal">(optional)</span>
                      </label>
                      <textarea
                        className="form-control"
                        id="message"
                        rows={3}
                        maxLength={1000}
                        placeholder="Tell the owner why you need it and when you can pick it up."
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                      />
                    </div>
                    {borrowError && (
                      <div className="alert alert-danger py-2 mt-2" role="alert">
                        {borrowError}
                      </div>
                    )}
                    <button
                      className="btn btn-bb-primary w-100 mt-3"
                      type="submit"
                      disabled={borrowing || !item.availableNow}
                    >
                      {borrowing ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send me-1" /> Send borrow request
                        </>
                      )}
                    </button>
                    <p className="form-text text-center mt-2 mb-0">
                      {Number(item.pricePerDay || 0) > 0
                        ? "Rental and deposit are settled directly with the owner at handover."
                        : "This item is free to borrow. Return it by the agreed date."}
                    </p>
                  </form>
                </div>
              </div>
            )}

            <div className="text-center mt-3">
              <button
                className="btn btn-bb-ghost btn-sm"
                type="button"
                onClick={() => setReportOpen(true)}
              >
                <i className="bi bi-flag me-1" /> Report this listing
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        show={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report this listing"
        icon="bi-flag"
        footer={
          <>
            <button className="btn btn-bb-outline" type="button" onClick={() => setReportOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-bb-danger-soft"
              type="button"
              onClick={submitReport}
              disabled={reporting}
            >
              {reporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Submitting…
                </>
              ) : (
                "Submit report"
              )}
            </button>
          </>
        }
      >
        <p className="text-muted-2" style={{ fontSize: ".86rem" }}>
          Tell us what's wrong. Reports are reviewed by campus admins.
        </p>
        <label className="form-label" htmlFor="reportReason">
          Reason
        </label>
        <textarea
          className="form-control"
          id="reportReason"
          rows={4}
          maxLength={1000}
          placeholder="e.g. The item is prohibited, misleading or the owner is unresponsive."
          value={reportReason}
          onChange={(event) => {
            setReportReason(event.target.value);
            setReportError("");
          }}
        />
        {reportError && (
          <div className="alert alert-danger py-2 mt-2 mb-0" role="alert">
            {reportError}
          </div>
        )}
      </Modal>
    </>
  );
}
