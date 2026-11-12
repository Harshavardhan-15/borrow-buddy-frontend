import { Link } from "react-router-dom";
import Avatar from "./Avatar.jsx";
import { conditionLabel, handleImageError, imageUrl, money } from "../utils/format.js";

export default function ItemCard({ item, manageMode = false }) {
  const price = Number(item.pricePerDay || 0);
  const available = item.availableNow;
  const manage = manageMode || item.ownedByMe;
  const primaryTo = manageMode ? `/items/${item.id}/edit` : `/items/${item.id}#borrow`;
  const primaryLabel = manageMode ? "Edit" : manage ? "Manage" : "Borrow";
  const primaryIcon = manageMode ? "bi-pencil" : manage ? "bi-sliders" : "bi-hand-index-thumb";

  return (
    <article className="item-card">
      <div className="item-media">
        <img
          src={imageUrl(item.imageUrl)}
          alt={item.itemName}
          loading="lazy"
          onError={handleImageError}
        />
        <span className="item-cat">{item.category}</span>
        {available ? (
          <span className="pill pill-success item-avail">
            <i className="bi bi-check-circle-fill" /> Available
          </span>
        ) : item.reservedNow ? (
          <span className="pill pill-warning item-avail">
            <i className="bi bi-clock-fill" /> Reserved
          </span>
        ) : (
          <span className="pill pill-muted item-avail">
            <i className="bi bi-pause-circle-fill" /> Unavailable
          </span>
        )}
      </div>
      <div className="item-body">
        <h3 className="item-title">
          <Link className="text-reset" to={`/items/${item.id}`}>
            {item.itemName}
          </Link>
        </h3>
        <div className="item-price">
          {price > 0 ? (
            <>
              <strong>{money(price)}</strong>
              <span>/day</span>
            </>
          ) : (
            <span className="free">Free to borrow</span>
          )}
        </div>
        <p className="item-desc">{item.description}</p>
        <div className="d-flex align-items-center justify-content-between">
          <span className="pill pill-muted">{conditionLabel(item.itemCondition)}</span>
          <span className="small text-muted-2">
            <i className="bi bi-geo-alt" /> Campus
          </span>
        </div>
        <div className="item-meta">
          <div className="item-owner">
            <Avatar url={item.owner.profileImage} name={item.owner.name} sizeClass="bb-avatar-sm" />
            <span className="name">{item.owner.name}</span>
          </div>
          {item.owner.reviewCount > 0 && (
            <span className="small text-muted-2">
              <i className="bi bi-star-fill text-warning" /> {Number(item.owner.averageRating).toFixed(1)}
            </span>
          )}
        </div>
        <div className="item-actions">
          <Link className="btn btn-bb-outline btn-sm" to={`/items/${item.id}`}>
            View details
          </Link>
          <Link className="btn btn-bb-primary btn-sm" to={primaryTo}>
            <i className={`bi ${primaryIcon} me-1`} />
            {primaryLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
