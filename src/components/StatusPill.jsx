import { statusClass, statusLabel } from "../utils/format.js";

export default function StatusPill({ status, extraClass = "" }) {
  return (
    <span className={`pill ${statusClass(status)} ${extraClass}`.trim()}>{statusLabel(status)}</span>
  );
}
