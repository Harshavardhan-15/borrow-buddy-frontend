import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { useUI } from "../context/UIContext.jsx";
import StatusPill from "../components/StatusPill.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingBlock from "../components/LoadingBlock.jsx";
import { formatDate, handleImageError, imageUrl, money, timeAgo } from "../utils/format.js";

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"];

const ACTION_CONFIG = {
  approve: {
    title: "Approve request",
    message:
      "Approve this request? A handover QR will be created for the borrower. Conflicting pending requests will be automatically declined.",
    confirmText: "Approve request",
    success: "Request approved. You can show the handover QR from your history page."
  },
  reject: {
    title: "Decline request",
    message: "Decline this request? The borrower will be notified.",
    confirmText: "Decline request",
    success: "Request declined.",
    danger: true
  },
  cancel: {
    title: "Cancel request",
    message:
      "Cancel your borrow request? You can send a new one later if the item is still available.",
    confirmText: "Cancel request",
    success: "Request cancelled.",
    danger: true
  }
};

function RequestCard({ request, direction, onAction }) {
  const isReceived = direction === "received";
  const counterpart = isReceived ? request.borrower : request.owner;
  const pending = request.status === "PENDING";

  return (
    <div className="bb-card mb-3 request-card">
      <div className="bb-card-body">
        <div className="d-flex flex-wrap gap-3">
          <img
            src={imageUrl(request.item.imageUrl)}
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
                  <Link className="text-reset" to={`/items/${request.item.id}`}>
                    {request.item.itemName}
                  </Link>
                </div>
                <div className="small text-muted-2">
                  <i className={`bi ${isReceived ? "bi-person-down" : "bi-person-up"} me-1`} />
                  {isReceived ? "From " : "To "}
                  {counterpart.name}
                </div>
              </div>
              <StatusPill status={request.status} />
            </div>
            <div className="d-flex flex-wrap gap-3 small text-muted-2 mt-2">
              <span>
                <i className="bi bi-calendar3 me-1" />
                {formatDate(request.startDate)} → {formatDate(request.returnDate)}
              </span>
              <span>
                <i className="bi bi-tag me-1" />
                {Number(request.item.pricePerDay || 0) > 0
                  ? money(request.item.pricePerDay) + "/day"
                  : "Free"}
              </span>
              <span>
                <i className="bi bi-clock me-1" />
                Requested {timeAgo(request.createdAt)}
              </span>
            </div>
            {request.message && (
              <div
                className="rounded-3 p-2 mt-2"
                style={{ background: "#f8fbff", fontSize: ".83rem", color: "#475569" }}
              >
                <i className="bi bi-chat-left-text me-1 text-muted-2" />
                {request.message}
              </div>
            )}
            <div className="d-flex flex-wrap gap-2 mt-3">
              {isReceived && pending && (
                <>
                  <button
                    className="btn btn-bb-primary btn-sm"
                    type="button"
                    onClick={() => onAction("approve", request)}
                  >
                    <i className="bi bi-check2 me-1" />
                    Approve
                  </button>
                  <button
                    className="btn btn-bb-danger-soft btn-sm"
                    type="button"
                    onClick={() => onAction("reject", request)}
                  >
                    <i className="bi bi-x me-1" />
                    Decline
                  </button>
                </>
              )}
              {!isReceived && pending && (
                <button
                  className="btn btn-bb-danger-soft btn-sm"
                  type="button"
                  onClick={() => onAction("cancel", request)}
                >
                  <i className="bi bi-x-circle me-1" />
                  Cancel request
                </button>
              )}
              {!isReceived && request.status === "APPROVED" && (
                <Link className="btn btn-bb-teal btn-sm" to="/history">
                  <i className="bi bi-qr-code-scan me-1" />
                  Handover
                </Link>
              )}
              {request.transactionId && (
                <Link className="btn btn-bb-outline btn-sm" to="/history">
                  <i className="bi bi-clock-history me-1" />
                  View transaction
                </Link>
              )}
              <Link className="btn btn-bb-ghost btn-sm" to={`/items/${request.item.id}`}>
                View item
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const { toast } = useToast();
  const { confirm } = useUI();
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [tab, setTab] = useState("received");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [receivedData, sentData] = await Promise.all([
        api.get("/api/borrow-requests/received"),
        api.get("/api/borrow-requests/sent")
      ]);
      setReceived(receivedData || []);
      setSent(sentData || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(action, request) {
    const config = ACTION_CONFIG[action];
    if (!config) return;
    const confirmed = await confirm({
      title: config.title,
      message: config.message,
      confirmText: config.confirmText,
      danger: config.danger
    });
    if (!confirmed) return;

    setBusyId(request.id);
    try {
      await api.put(`/api/borrow-requests/${request.id}/${action}`);
      toast(config.success, "success");
      await load();
    } catch (requestError) {
      toast(requestError.message || "Could not complete that action.", "danger");
    } finally {
      setBusyId(null);
    }
  }

  function visible(list) {
    return filter === "ALL" ? list : list.filter((request) => request.status === filter);
  }

  const pendingReceived = received.filter((request) => request.status === "PENDING").length;
  const pendingSent = sent.filter((request) => request.status === "PENDING").length;
  const activeList = tab === "received" ? received : sent;
  const list = visible(activeList);

  return (
    <>
      <div className="container bb-page-head">
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div>
            <span className="eyebrow">
              <i className="bi bi-arrow-left-right" /> Requests
            </span>
            <h1 className="mt-3 mb-1">Borrow requests</h1>
            <p className="text-muted-2 mb-0">
              Approve or decline incoming requests, and track the ones you've sent.
            </p>
          </div>
          <Link className="btn btn-bb-outline" to="/browse">
            <i className="bi bi-search me-1" />
            Browse items
          </Link>
        </div>
      </div>

      <div className="container pb-5">
        <ul className="nav nav-pills gap-2 mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={"nav-link" + (tab === "received" ? " active" : "")}
              type="button"
              role="tab"
              onClick={() => setTab("received")}
            >
              <i className="bi bi-inbox me-1" />
              Received{" "}
              <span className="badge rounded-pill text-bg-light ms-1">{pendingReceived}</span>
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button
              className={"nav-link" + (tab === "sent" ? " active" : "")}
              type="button"
              role="tab"
              onClick={() => setTab("sent")}
            >
              <i className="bi bi-send me-1" />
              Sent <span className="badge rounded-pill text-bg-light ms-1">{pendingSent}</span>
            </button>
          </li>
        </ul>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="chip-row">
            {STATUS_FILTERS.map((status) => (
              <button
                type="button"
                className={"chip" + (filter === status ? " active" : "")}
                key={status}
                onClick={() => setFilter(status)}
              >
                {status === "ALL"
                  ? "All"
                  : status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <button className="btn btn-bb-ghost btn-sm" type="button" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1" />
            Refresh
          </button>
        </div>

        {loading && <LoadingBlock message="Loading requests…" />}

        {!loading && error && (
          <EmptyState icon="bi-wifi-off" title="Could not load requests" text={error} />
        )}

        {!loading && !error && list.length === 0 && (
          <EmptyState
            icon={tab === "received" ? "bi-inbox" : "bi-send"}
            title={tab === "received" ? "No incoming requests" : "No requests sent yet"}
            text={
              tab === "received"
                ? "When someone asks to borrow one of your items, it will appear here."
                : "Find something you need and send your first borrow request."
            }
            action={
              <Link className="btn btn-bb-outline btn-sm" to="/browse">
                Browse items
              </Link>
            }
          />
        )}

        {!loading &&
          !error &&
          list.map((request) => (
            <div key={request.id} style={{ opacity: busyId === request.id ? 0.6 : 1 }}>
              <RequestCard
                request={request}
                direction={tab}
                onAction={handleAction}
              />
            </div>
          ))}
      </div>
    </>
  );
}
