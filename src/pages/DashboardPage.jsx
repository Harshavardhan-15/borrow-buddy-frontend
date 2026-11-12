import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useUI } from "../context/UIContext.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusPill from "../components/StatusPill.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingBlock from "../components/LoadingBlock.jsx";
import { formatDate, handleImageError, imageUrl, resolveLink, timeAgo } from "../utils/format.js";

const NOTIFICATION_ICONS = {
  BORROW_REQUEST: "bi-inbox",
  REQUEST_APPROVED: "bi-check-circle",
  REQUEST_REJECTED: "bi-x-circle",
  REQUEST_CANCELLED: "bi-slash-circle",
  RETURN_REMINDER: "bi-alarm",
  OVERDUE: "bi-exclamation-triangle",
  HANDOVER_COMPLETED: "bi-qr-code",
  ITEM_RETURNED: "bi-box-arrow-in-left",
  REVIEW_RECEIVED: "bi-star",
  REPORT_RECEIVED: "bi-flag",
  SYSTEM: "bi-info-circle"
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user, refreshUnread } = useAuth();
  const { openQr, openScan, confirmReturn } = useUI();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.get("/api/dashboard/stats");
      setStats(data);
      setError("");
      refreshUnread();
    } catch (requestError) {
      setError(requestError.message || "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [refreshUnread]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("bb:transactions-changed", onChange);
    return () => window.removeEventListener("bb:transactions-changed", onChange);
  }, [load]);

  const firstName = user?.name ? user.name.split(" ")[0] : "there";
  const pending = stats?.pendingLendingRequests || 0;

  return (
    <>
      <div className="container bb-page-head">
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div>
            <span className="eyebrow">
              <i className="bi bi-grid" /> Your dashboard
            </span>
            <h1 className="mt-3 mb-1">
              {greeting()}, {firstName}
            </h1>
            <p className="text-muted-2 mb-0">
              {pending > 0
                ? `You have ${pending} pending lending request${pending === 1 ? "" : "s"} waiting for your review.`
                : "Here's what's happening with your items and borrows."}
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-bb-outline" type="button" onClick={openScan}>
              <i className="bi bi-qr-code-scan me-1" /> Scan handover QR
            </button>
            <Link className="btn btn-bb-primary" to="/items/new">
              <i className="bi bi-plus-lg me-1" /> List an item
            </Link>
          </div>
        </div>
      </div>

      <div className="container pb-5">
        <div className="row g-3 mb-4">
          {loading &&
            [0, 1, 2, 3].map((index) => (
              <div className="col-6 col-lg-3" key={index}>
                <div className="skeleton" style={{ height: 132 }} />
              </div>
            ))}

          {!loading && error && (
            <div className="col-12">
              <EmptyState icon="bi-wifi-off" title="Could not load your dashboard" text={error} />
            </div>
          )}

          {!loading && !error && stats && (
            <>
              <StatCard
                icon="bi-box-seam"
                value={stats.listedItems}
                label="Items listed"
                to="/profile"
                linkLabel="Manage"
              />
              <StatCard
                icon="bi-inbox"
                value={stats.pendingLendingRequests}
                label="Pending lending requests"
                tone="amber"
                to="/requests"
                linkLabel="Review"
              />
              <StatCard
                icon="bi-arrow-left-right"
                value={stats.currentlyBorrowed}
                label="Currently borrowed"
                tone="teal"
                to="/history"
                linkLabel="History"
              />
              <StatCard
                icon="bi-star"
                value={
                  Number(stats.averageRating) > 0 ? Number(stats.averageRating).toFixed(1) : "—"
                }
                label="Your average rating"
                tone="rose"
                to="/reviews"
                linkLabel="Reviews"
              />
              <StatCard
                icon="bi-send"
                value={stats.activeBorrowRequests}
                label="Active borrow requests"
                to="/requests"
                linkLabel="Track"
              />
              <StatCard
                icon="bi-check2-circle"
                value={stats.completedBorrows}
                label="Completed borrows"
                tone="teal"
              />
              <StatCard
                icon="bi-bag-check"
                value={stats.completedLends}
                label="Completed lends"
                tone="teal"
              />
              <StatCard
                icon="bi-bell"
                value={stats.unreadNotifications}
                label="Unread notifications"
                tone="amber"
                to="/notifications"
                linkLabel="Open"
              />
            </>
          )}
        </div>

        <div className="row g-4">
          <div className="col-lg-7">
            <div className="bb-card h-100">
              <div className="bb-card-body">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <h2 className="h5 fw-bold mb-0">Upcoming &amp; active</h2>
                  <Link className="small fw-bold" to="/history">
                    View history <i className="bi bi-arrow-right" />
                  </Link>
                </div>
                <p className="text-muted-2 mb-3" style={{ fontSize: ".86rem" }}>
                  Handovers and returns that need your attention.
                </p>

                {loading && <LoadingBlock message="Loading activity…" />}

                {!loading &&
                  stats &&
                  (!stats.upcomingReturns || stats.upcomingReturns.length === 0) && (
                    <EmptyState
                      icon="bi-calendar2-week"
                      title="Nothing scheduled"
                      text="You have no active handovers or returns right now."
                      action={
                        <Link className="btn btn-bb-outline btn-sm" to="/browse">
                          Browse items
                        </Link>
                      }
                    />
                  )}

                {!loading &&
                  stats &&
                  stats.upcomingReturns?.map((transaction) => {
                    const isOwner = user && transaction.owner.id === user.id;
                    const counterpart = isOwner ? transaction.borrower : transaction.owner;
                    const roleLabel = isOwner ? "Lending to" : "Borrowing from";
                    const dateLabel =
                      transaction.status === "AWAITING_HANDOVER"
                        ? `Borrow window ${formatDate(transaction.startDate)} – ${formatDate(
                            transaction.returnDate
                          )}`
                        : `Due back ${formatDate(transaction.returnDate)}`;

                    return (
                      <div
                        className="d-flex gap-3 py-3 border-bottom"
                        style={{ borderColor: "#eef2f8" }}
                        key={transaction.id}
                      >
                        <img
                          src={imageUrl(transaction.item.imageUrl)}
                          alt=""
                          onError={handleImageError}
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 14,
                            objectFit: "cover",
                            flex: "0 0 64px"
                          }}
                        />
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <div className="min-w-0">
                              <div className="fw-bold text-truncate">
                                {transaction.item.itemName}
                              </div>
                              <div className="small text-muted-2">
                                {roleLabel} {counterpart.name}
                              </div>
                            </div>
                            <div className="d-flex flex-column align-items-end gap-1">
                              <StatusPill status={transaction.status} />
                              {transaction.overdue && (
                                <span className="pill pill-danger">
                                  <i className="bi bi-exclamation-triangle-fill" /> Overdue
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="small text-muted-2 mt-1">
                            <i className="bi bi-calendar3 me-1" />
                            {dateLabel}
                          </div>
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {transaction.qrAvailable && (
                              <button
                                className="btn btn-bb-teal btn-sm"
                                type="button"
                                onClick={() =>
                                  openQr(transaction.id, transaction.item.itemName)
                                }
                              >
                                <i className="bi bi-qr-code me-1" /> Show QR
                              </button>
                            )}
                            {transaction.canConfirmHandover && !isOwner && (
                              <button
                                className="btn btn-bb-primary btn-sm"
                                type="button"
                                onClick={openScan}
                              >
                                <i className="bi bi-qr-code-scan me-1" /> Scan to hand over
                              </button>
                            )}
                            {transaction.canConfirmReturn && (
                              <button
                                className="btn btn-bb-primary btn-sm"
                                type="button"
                                onClick={() =>
                                  confirmReturn(
                                    transaction.id,
                                    transaction.item.itemName,
                                    load
                                  )
                                }
                              >
                                <i className="bi bi-box-arrow-in-left me-1" /> Confirm return
                              </button>
                            )}
                            {transaction.canReview && (
                              <Link className="btn btn-bb-outline btn-sm" to="/reviews">
                                <i className="bi bi-star me-1" /> Leave review
                              </Link>
                            )}
                            {!transaction.qrAvailable &&
                              !(transaction.canConfirmHandover && !isOwner) &&
                              !transaction.canConfirmReturn &&
                              !transaction.canReview && (
                                <Link
                                  className="btn btn-bb-outline btn-sm"
                                  to={`/items/${transaction.item.id}`}
                                >
                                  View item
                                </Link>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="col-lg-5">
            <div className="bb-card mb-4">
              <div className="bb-card-body">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <h2 className="h5 fw-bold mb-0">Recent activity</h2>
                  <Link className="small fw-bold" to="/notifications">
                    All notifications
                  </Link>
                </div>
                <p className="text-muted-2 mb-2" style={{ fontSize: ".86rem" }}>
                  Requests, approvals and reminders.
                </p>

                {loading && <LoadingBlock message="Loading…" />}

                {!loading &&
                  (!stats?.recentActivity || stats.recentActivity.length === 0) && (
                    <div
                      className="text-center text-muted-2 py-4"
                      style={{ fontSize: ".86rem" }}
                    >
                      <i className="bi bi-bell-slash d-block fs-3 mb-2" />
                      No activity yet.
                    </div>
                  )}

                {!loading && stats?.recentActivity && stats.recentActivity.length > 0 && (
                  <div className="activity-list">
                    {stats.recentActivity.map((notification) => (
                      <Link
                        className="activity-item text-reset"
                        to={resolveLink(notification.link, "/notifications")}
                        key={notification.id}
                      >
                        <div className="activity-icon">
                          <i
                            className={`bi ${
                              NOTIFICATION_ICONS[notification.type] || "bi-info-circle"
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="activity-text">{notification.message}</div>
                          <div className="activity-time">
                            {timeAgo(notification.createdAt)}
                            {!notification.read && (
                              <>
                                {" · "}
                                <span className="text-primary fw-bold">New</span>
                              </>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bb-card">
              <div className="bb-card-body">
                <h2 className="h5 fw-bold mb-3">Quick actions</h2>
                <div className="d-grid gap-2">
                  <Link className="btn btn-bb-soft text-start" to="/browse">
                    <i className="bi bi-search me-2" />
                    Find something to borrow
                  </Link>
                  <Link className="btn btn-bb-soft text-start" to="/requests">
                    <i className="bi bi-inbox me-2" />
                    Review incoming requests
                  </Link>
                  <Link className="btn btn-bb-soft text-start" to="/reviews">
                    <i className="bi bi-star me-2" />
                    Leave a review
                  </Link>
                  <Link className="btn btn-bb-soft text-start" to="/profile">
                    <i className="bi bi-person-gear me-2" />
                    Edit your profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
