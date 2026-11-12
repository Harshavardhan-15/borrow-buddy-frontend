import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useUI } from "../context/UIContext.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusPill from "../components/StatusPill.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingBlock from "../components/LoadingBlock.jsx";
import { formatDate, handleImageError, imageUrl } from "../utils/format.js";

const FILTERS = ["ALL", "AWAITING_HANDOVER", "BORROWED", "OVERDUE", "COMPLETED"];

const FILTER_LABELS = {
  ALL: "All",
  AWAITING_HANDOVER: "Awaiting handover",
  BORROWED: "Borrowed",
  OVERDUE: "Overdue",
  COMPLETED: "Completed"
};

function Timeline({ transaction }) {
  const steps = [
    { label: "Reserved", date: transaction.createdAt, done: true },
    { label: "Handed over", date: transaction.handoverDate, done: Boolean(transaction.handoverDate) },
    { label: "Returned", date: transaction.actualReturnDate, done: Boolean(transaction.actualReturnDate) }
  ];

  return (
    <div className="d-flex flex-wrap gap-3 mt-2">
      {steps.map((step, index) => (
        <div
          className="d-flex align-items-center gap-2"
          style={{ fontSize: ".76rem", color: step.done ? "#334155" : "#94a3b8" }}
          key={step.label}
        >
          <span
            className="d-grid place-items-center rounded-circle"
            style={{
              width: 22,
              height: 22,
              display: "grid",
              placeItems: "center",
              background: step.done ? "var(--bb-teal-050)" : "#f1f5f9",
              color: step.done ? "var(--bb-teal-600)" : "#94a3b8"
            }}
          >
            <i className={`bi ${step.done ? "bi-check-lg" : "bi-dot"}`} />
          </span>
          <span className="fw-semibold">{step.label}</span>
          {step.date && <span className="text-muted-2">{formatDate(step.date)}</span>}
          {index < steps.length - 1 && (
            <i className="bi bi-chevron-right text-muted-2" />
          )}
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { openQr, openScan, confirmReturn } = useUI();
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/transactions");
      setTransactions(data || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Could not load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener("bb:transactions-changed", onChange);
    return () => window.removeEventListener("bb:transactions-changed", onChange);
  }, [load]);

  function countByStatus(status) {
    return transactions.filter((transaction) => transaction.status === status).length;
  }

  const active = transactions.filter(
    (transaction) =>
      transaction.status === "BORROWED" ||
      transaction.status === "OVERDUE" ||
      transaction.status === "AWAITING_HANDOVER"
  ).length;

  const visible =
    filter === "ALL"
      ? transactions
      : transactions.filter((transaction) => transaction.status === filter);

  return (
    <>
      <div className="container bb-page-head">
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
          <div>
            <span className="eyebrow">
              <i className="bi bi-clock-history" /> Transactions
            </span>
            <h1 className="mt-3 mb-1">Borrowing history</h1>
            <p className="text-muted-2 mb-0">
              Every handover, return and completed borrow in one place.
            </p>
          </div>
          <button className="btn btn-bb-primary" type="button" onClick={openScan}>
            <i className="bi bi-qr-code-scan me-1" />
            Scan handover QR
          </button>
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
              <StatCard icon="bi-collection" value={transactions.length} label="Total transactions" />
              <StatCard
                icon="bi-arrow-left-right"
                value={active}
                label="Active now"
                tone="teal"
              />
              <StatCard
                icon="bi-exclamation-triangle"
                value={countByStatus("OVERDUE")}
                label="Overdue"
                tone="rose"
              />
              <StatCard
                icon="bi-check2-circle"
                value={countByStatus("COMPLETED")}
                label="Completed"
                tone="amber"
              />
            </>
          )}
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="chip-row">
            {FILTERS.map((status) => {
              const count = status === "ALL" ? transactions.length : countByStatus(status);
              return (
                <button
                  type="button"
                  className={"chip" + (filter === status ? " active" : "")}
                  key={status}
                  onClick={() => setFilter(status)}
                >
                  {FILTER_LABELS[status]}{" "}
                  <span className="opacity-75">{count}</span>
                </button>
              );
            })}
          </div>
          <button className="btn btn-bb-ghost btn-sm" type="button" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1" />
            Refresh
          </button>
        </div>

        {loading && <LoadingBlock message="Loading your transactions…" />}

        {!loading && error && (
          <EmptyState icon="bi-wifi-off" title="Could not load history" text={error} />
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState
            icon="bi-clock-history"
            title="Nothing here yet"
            text={
              filter === "ALL"
                ? "Once a borrow request is approved, its handover and return will show up here."
                : "No transactions with this status."
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
          visible.map((transaction) => {
            const isOwner = user && transaction.owner.id === user.id;
            const counterpart = isOwner ? transaction.borrower : transaction.owner;
            const roleLabel = isOwner ? "Lent to" : "Borrowed from";
            const due =
              transaction.status === "AWAITING_HANDOVER"
                ? `Pickup window: ${formatDate(transaction.startDate)} – ${formatDate(
                    transaction.returnDate
                  )}`
                : `Due back: ${formatDate(transaction.returnDate)}`;

            return (
              <div className="bb-card mb-3" key={transaction.id}>
                <div className="bb-card-body">
                  <div className="d-flex flex-wrap gap-3">
                    <img
                      src={imageUrl(transaction.item.imageUrl)}
                      alt=""
                      onError={handleImageError}
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: 16,
                        objectFit: "cover",
                        flex: "0 0 84px"
                      }}
                    />
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2">
                        <div className="min-w-0">
                          <div className="fw-bold">
                            <Link
                              className="text-reset"
                              to={`/items/${transaction.item.id}`}
                            >
                              {transaction.item.itemName}
                            </Link>
                          </div>
                          <div className="small text-muted-2">
                            <i
                              className={`bi ${
                                isOwner ? "bi-person-down" : "bi-person-up"
                              } me-1`}
                            />
                            {roleLabel} {counterpart.name} · {transaction.item.category}
                          </div>
                        </div>
                        <div className="d-flex gap-1">
                          <StatusPill status={transaction.status} />
                          {transaction.overdue && (
                            <span className="pill pill-danger">
                              <i className="bi bi-exclamation-triangle-fill" /> Overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="small text-muted-2 mt-2">
                        <i className="bi bi-calendar3 me-1" />
                        {due}
                      </div>
                      <Timeline transaction={transaction} />
                      {transaction.status === "AWAITING_HANDOVER" && (
                        <div
                          className="alert alert-warning py-2 mt-3 mb-0"
                          style={{ fontSize: ".8rem" }}
                        >
                          <i className="bi bi-info-circle me-1" />
                          {isOwner
                            ? "Show your single-use QR code to the borrower when you hand over the item."
                            : "Ask the owner to show their QR code, then scan it to confirm you received the item."}
                        </div>
                      )}
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        {transaction.qrAvailable && (
                          <button
                            className="btn btn-bb-teal btn-sm"
                            type="button"
                            onClick={() =>
                              openQr(transaction.id, transaction.item.itemName)
                            }
                          >
                            <i className="bi bi-qr-code me-1" />
                            Show handover QR
                          </button>
                        )}
                        {transaction.canConfirmHandover && !isOwner && (
                          <button
                            className="btn btn-bb-primary btn-sm"
                            type="button"
                            onClick={openScan}
                          >
                            <i className="bi bi-qr-code-scan me-1" />
                            Scan QR to confirm
                          </button>
                        )}
                        {transaction.canConfirmReturn && (
                          <button
                            className="btn btn-bb-primary btn-sm"
                            type="button"
                            onClick={() =>
                              confirmReturn(transaction.id, transaction.item.itemName, load)
                            }
                          >
                            <i className="bi bi-box-arrow-in-left me-1" />
                            Confirm return
                          </button>
                        )}
                        {transaction.canReview ? (
                          <Link className="btn btn-bb-outline btn-sm" to="/reviews">
                            <i className="bi bi-star me-1" />
                            Leave a review
                          </Link>
                        ) : transaction.reviewId ? (
                          <Link className="btn btn-bb-soft btn-sm" to="/reviews">
                            <i className="bi bi-star-fill me-1" />
                            Reviewed
                          </Link>
                        ) : null}
                        <Link
                          className="btn btn-bb-ghost btn-sm"
                          to={`/items/${transaction.item.id}`}
                        >
                          View item
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </>
  );
}
