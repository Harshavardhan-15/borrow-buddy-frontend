import { api } from "../api/client.js";

const STATUS_LABELS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  AWAITING_HANDOVER: "Awaiting handover",
  BORROWED: "Borrowed",
  OVERDUE: "Overdue",
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  OPEN: "Open",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed"
};

const STATUS_CLASSES = {
  PENDING: "pill-warning",
  APPROVED: "pill-success",
  REJECTED: "pill-danger",
  CANCELLED: "pill-muted",
  COMPLETED: "pill-info",
  AWAITING_HANDOVER: "pill-warning",
  BORROWED: "pill-info",
  OVERDUE: "pill-danger",
  AVAILABLE: "pill-success",
  UNAVAILABLE: "pill-muted",
  OPEN: "pill-warning",
  RESOLVED: "pill-success",
  DISMISSED: "pill-muted"
};

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function money(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "₹0";
  return (
    "₹" +
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  );
}

export function priceLabel(value) {
  const amount = Number(value || 0);
  return amount > 0 ? money(amount) + "/day" : "Free to borrow";
}

export function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + "d ago";
  return formatDate(value);
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || (status || "").replace(/_/g, " ");
}

export function statusClass(status) {
  return STATUS_CLASSES[status] || "pill-muted";
}

export function conditionLabel(condition) {
  if (!condition) return "—";
  return condition
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export const PLACEHOLDER_IMAGE = "/assets/item-placeholder.svg";

/**
 * Resolves a stored image path for the current deployment.
 * Uploaded images are served by the backend, so when the React app is hosted
 * on a different origin (Vercel/Netlify) their relative `/uploads/...` paths
 * must be prefixed with the API origin. Absolute URLs pass through unchanged.
 */
export function imageUrl(url) {
  if (!url) return PLACEHOLDER_IMAGE;
  if (url.startsWith("/uploads/")) return api.base + url;
  return url;
}

// Swaps a broken upload for the bundled placeholder. The data flag prevents an
// infinite loop if the placeholder itself cannot be loaded.
export function handleImageError(event) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === "true") return;
  image.dataset.fallbackApplied = "true";
  image.src = PLACEHOLDER_IMAGE;
}

export function initials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function todayIso(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(startIso, endIso) {
  const start = String(startIso).split("-").map(Number);
  const end = String(endIso).split("-").map(Number);
  if (start.length !== 3 || end.length !== 3) return 0;
  const startUtc = Date.UTC(start[0], start[1] - 1, start[2]);
  const endUtc = Date.UTC(end[0], end[1] - 1, end[2]);
  return Math.round((endUtc - startUtc) / 86400000);
}

// Backend notifications still store legacy `.html` links. Map them to the
// React router so old notifications keep working.
export function resolveLink(link, fallback = "/notifications") {
  if (!link) return fallback;
  if (/^https?:\/\//i.test(link)) return link;
  const [pathPart, queryPart] = String(link).split("?");
  const query = queryPart ? "?" + queryPart : "";
  const map = {
    "index.html": "/",
    "browse-items.html": "/browse",
    "item-details.html": "/items",
    "add-item.html": "/items/new",
    "dashboard.html": "/dashboard",
    "borrow-requests.html": "/requests",
    "borrowing-history.html": "/history",
    "notifications.html": "/notifications",
    "profile.html": "/profile",
    "reviews.html": "/reviews",
    "login.html": "/login",
    "register.html": "/register"
  };
  if (map[pathPart]) {
    if (pathPart === "item-details.html" && query) return "/items/" + new URLSearchParams(query).get("id");
    if (pathPart === "add-item.html" && query) {
      const id = new URLSearchParams(query).get("id");
      return id ? "/items/" + id + "/edit" : "/items/new";
    }
    if (pathPart === "profile.html" && query) {
      const id = new URLSearchParams(query).get("id");
      return id ? "/students/" + id : "/profile";
    }
    return map[pathPart];
  }
  if (pathPart.startsWith("/")) return link;
  return fallback;
}
