import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingBlock from "../components/LoadingBlock.jsx";
import { resolveLink, timeAgo } from "../utils/format.js";

const PAGE_SIZE = 20;

const ICONS = {
  BORROW_REQUEST: { icon: "bi-inbox", tone: "" },
  REQUEST_APPROVED: { icon: "bi-check-circle", tone: "teal" },
  REQUEST_REJECTED: { icon: "bi-x-circle", tone: "rose" },
  REQUEST_CANCELLED: { icon: "bi-slash-circle", tone: "" },
  RETURN_REMINDER: { icon: "bi-alarm", tone: "amber" },
  OVERDUE: { icon: "bi-exclamation-triangle", tone: "rose" },
  HANDOVER_COMPLETED: { icon: "bi-qr-code", tone: "teal" },
  ITEM_RETURNED: { icon: "bi-box-arrow-in-left", tone: "teal" },
  REVIEW_RECEIVED: { icon: "bi-star", tone: "amber" },
  REPORT_RECEIVED: { icon: "bi-flag", tone: "rose" },
  SYSTEM: { icon: "bi-info-circle", tone: "" }
};

export default function NotificationsPage() {
  const { refreshUnread } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(true);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(
    async (reset) => {
      if (reset) {
        setLoading(true);
        setError("");
      } else {
        setLoadingMore(true);
      }
      const targetPage = reset ? 0 : page;
      try {
        const data = await api.get(
          "/api/notifications" + api.qs({ page: targetPage, size: PAGE_SIZE })
        );
        setItems((current) => (reset ? data.content || [] : current.concat(data.content || [])));
        setLastPage(Boolean(data.last));
        setPage((data.page ?? targetPage) + 1);
        refreshUnread();
      } catch (requestError) {
        if (reset) {
          setError(requestError.message || "Could not load notifications.");
          setItems([]);
        } else {
          toast(requestError.message || "Could not load more notifications.", "danger");
        }
        setLastPage(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [page, refreshUnread, toast]
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unread = items.filter((item) => !item.read).length;
  const visible = filter === "unread" ? items.filter((item) => !item.read) : items;

  async function markRead(id) {
    try {
      await api.put("/api/notifications/" + id + "/read");
      setItems((current) =>
        current.map((item) => (String(item.id) === String(id) ? { ...item, read: true } : item))
      );
      refreshUnread();
    } catch (requestError) {
      toast(requestError.message || "Could not mark the notification as read.", "danger");
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.put("/api/notifications/read-all");
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      refreshUnread();
      toast("All notifications marked as read.", "success");
    } catch (requestError) {
      toast(requestError.message || "Could not mark all as read.", "danger");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <>
      <div className="container bb-page-head">
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div>
            <span className="eyebrow">
              <i className="bi bi-bell" /> Inbox
            </span>
            <h1 className="mt-3 mb-1">Notifications</h1>
            <p className="text-muted-2 mb-0">
              Requests, approvals, reminders and reviews — all in one feed.
            </p>
          </div>
          <button
            className="btn btn-bb-outline"
            type="button"
            onClick={markAllRead}
            disabled={markingAll || unread === 0}
          >
            {markingAll ? (
              <span className="spinner-border spinner-border-sm me-2" />
            ) : (
              <i className="bi bi-check2-all me-1" />
            )}
            Mark all as read
          </button>
        </div>
      </div>

      <div className="container pb-5">
        <div className="row g-4">
          <div className="col-lg-8">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
              <div className="chip-row">
                <button
                  className={"chip" + (filter === "all" ? " active" : "")}
                  type="button"
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
                <button
                  className={"chip" + (filter === "unread" ? " active" : "")}
                  type="button"
                  onClick={() => setFilter("unread")}
                >
                  Unread <span>{unread}</span>
                </button>
              </div>
              <span className="small text-muted-2">
                {visible.length} notification{visible.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="bb-card">
              <div className="bb-card-body p-0">
                {loading && <LoadingBlock message="Loading notifications…" />}

                {!loading && error && (
                  <EmptyState
                    icon="bi-wifi-off"
                    title="Could not load notifications"
                    text={error}
                  />
                )}

                {!loading && !error && visible.length === 0 && (
                  <EmptyState
                    icon={filter === "unread" ? "bi-check2-all" : "bi-bell-slash"}
                    title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
                    text={
                      filter === "unread"
                        ? "You have no unread notifications."
                        : "Activity will appear here as requests and handovers happen."
                    }
                  />
                )}

                {!loading &&
                  !error &&
                  visible.map((notification) => {
                    const meta = ICONS[notification.type] || ICONS.SYSTEM;
                    return (
                      <div
                        className="d-flex gap-3 p-3 notification-row"
                        key={notification.id}
                        style={{
                          borderBottom: "1px solid #f1f5fa",
                          background: notification.read ? undefined : "#f8fbff",
                          cursor: notification.read ? "default" : "pointer"
                        }}
                        onClick={() => {
                          if (!notification.read) markRead(notification.id);
                        }}
                      >
                        <div className={"icon-tile " + meta.tone}>
                          <i className={`bi ${meta.icon}`} />
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex align-items-start justify-content-between gap-2">
                            <div className="activity-text">{notification.message}</div>
                            {!notification.read && <span className="pill pill-info">New</span>}
                          </div>
                          <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                            <span className="activity-time">
                              {timeAgo(notification.createdAt)}
                            </span>
                            {notification.link && (
                              <Link
                                className="small fw-bold"
                                to={resolveLink(notification.link, "/notifications")}
                                onClick={(event) => event.stopPropagation()}
                              >
                                Open <i className="bi bi-arrow-right" />
                              </Link>
                            )}
                            {!notification.read && (
                              <button
                                className="btn btn-bb-ghost btn-sm py-0"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  markRead(notification.id);
                                }}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {!loading && !error && !lastPage && (
              <div className="text-center mt-3">
                <button
                  className="btn btn-bb-outline"
                  type="button"
                  onClick={() => load(false)}
                  disabled={loadingMore}
                >
                  {loadingMore && <span className="spinner-border spinner-border-sm me-2" />}
                  Load more
                </button>
              </div>
            )}
          </div>

          <div className="col-lg-4">
            <div className="bb-card mb-4">
              <div className="bb-card-body">
                <h2 className="h6 fw-bold mb-3">
                  <i className="bi bi-sliders me-1" /> Notification settings
                </h2>
                <p className="text-muted-2" style={{ fontSize: ".86rem" }}>
                  In-app notifications are always on. Email delivery depends on the server's SMTP
                  configuration.
                </p>
                <div
                  className="d-flex align-items-center justify-content-between py-2 border-top"
                  style={{ borderColor: "#eef2f8" }}
                >
                  <span className="small fw-semibold">Borrow requests</span>
                  <span className="pill pill-success">On</span>
                </div>
                <div
                  className="d-flex align-items-center justify-content-between py-2 border-top"
                  style={{ borderColor: "#eef2f8" }}
                >
                  <span className="small fw-semibold">Return reminders</span>
                  <span className="pill pill-success">On</span>
                </div>
                <div
                  className="d-flex align-items-center justify-content-between py-2 border-top"
                  style={{ borderColor: "#eef2f8" }}
                >
                  <span className="small fw-semibold">Reviews received</span>
                  <span className="pill pill-success">On</span>
                </div>
              </div>
            </div>

            <div className="bb-card">
              <div className="bb-card-body">
                <h2 className="h6 fw-bold mb-2">
                  <i className="bi bi-lightbulb me-1 text-warning" /> Stay responsive
                </h2>
                <p className="text-muted-2 mb-0" style={{ fontSize: ".86rem" }}>
                  Replying to borrow requests quickly keeps your trust score high and helps
                  classmates plan ahead.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
