import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Avatar from "../components/Avatar.jsx";
import Stars from "../components/Stars.jsx";
import StatCard from "../components/StatCard.jsx";
import ItemCard from "../components/ItemCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import LoadingBlock from "../components/LoadingBlock.jsx";
import Modal from "../components/Modal.jsx";
import { formatDate, timeAgo } from "../utils/format.js";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const PLACEHOLDER = "/assets/item-placeholder.svg";

function ReviewList({ reviews }) {
  if (!reviews || !reviews.reviews || reviews.reviews.length === 0) {
    return (
      <div className="bb-card mt-4">
        <div className="bb-card-body">
          <h2 className="h5 fw-bold mb-2">Reviews</h2>
          <p className="text-muted-2 mb-0" style={{ fontSize: ".88rem" }}>
            No reviews yet. Reviews are unlocked after a completed borrow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bb-card mt-4">
      <div className="bb-card-body">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <h2 className="h5 fw-bold mb-0">Reviews</h2>
          <div className="d-flex align-items-center gap-2">
            <Stars rating={reviews.averageRating} />
            <span className="small text-muted-2">
              {Number(reviews.averageRating).toFixed(1)} · {reviews.reviewCount} review
              {reviews.reviewCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        {reviews.reviews.map((review) => (
          <div className="activity-item" key={review.id}>
            <div className="activity-icon">
              <i className="bi bi-star-fill" />
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                <span className="fw-bold" style={{ fontSize: ".86rem" }}>
                  {review.reviewer.name}
                </span>
                <span className="small text-muted-2">{timeAgo(review.createdAt)}</span>
              </div>
              <div className="d-flex align-items-center gap-2 mt-1">
                <Stars rating={review.rating} />
                <span className="small text-muted-2">for "{review.itemName}"</span>
              </div>
              <div className="activity-text mt-1">
                {review.comment || "No comment left."}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const { toast } = useToast();

  const isOwnProfile = useMemo(() => {
    if (!id) return true;
    return Boolean(user && String(user.id) === String(id));
  }, [id, user]);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", studentId: "", imageUrl: "" });
  const [editPreview, setEditPreview] = useState(PLACEHOLDER);
  const [editUploadedUrl, setEditUploadedUrl] = useState("");
  const [editErrors, setEditErrors] = useState({});
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = isOwnProfile
        ? await api.get("/api/students/profile")
        : await api.get("/api/students/" + id);
      try {
        data.reviews = await api.get("/api/reviews/" + data.user.id);
      } catch {
        data.reviews = null;
      }
      setProfile(data);
    } catch (requestError) {
      setError(requestError.message || "This student profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id, isOwnProfile]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (profile) {
      document.title = profile.user.name + " · BorrowBuddy";
    }
    return () => {
      document.title = "BorrowBuddy · Borrow smarter on campus";
    };
  }, [profile]);

  function openEdit() {
    const current = profile.user;
    setEditForm({
      name: current.name || "",
      studentId: current.studentId || "",
      imageUrl:
        current.profileImage && !current.profileImage.startsWith("/uploads/")
          ? current.profileImage
          : ""
    });
    setEditUploadedUrl(
      current.profileImage && current.profileImage.startsWith("/uploads/")
        ? current.profileImage
        : ""
    );
    setEditPreview(current.profileImage || PLACEHOLDER);
    setEditErrors({});
    setEditError("");
    setEditOpen(true);
  }

  async function uploadPhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setEditError("");
    if (file.size > MAX_IMAGE_BYTES) {
      setEditError("That image is larger than 5 MB.");
      event.target.value = "";
      return;
    }
    const local = URL.createObjectURL(file);
    setEditPreview(local);
    setUploading(true);
    try {
      const result = await api.upload(file);
      setEditUploadedUrl(result.url);
      setEditForm((current) => ({ ...current, imageUrl: "" }));
      setEditPreview(result.url);
      toast("Photo uploaded.", "success");
    } catch (requestError) {
      setEditError(requestError.message || "Could not upload the photo.");
      setEditPreview(profile.user.profileImage || PLACEHOLDER);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(local);
      event.target.value = "";
    }
  }

  function changeImageUrl(value) {
    setEditUploadedUrl("");
    setEditForm((current) => ({ ...current, imageUrl: value }));
    setEditPreview(value.trim() || PLACEHOLDER);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setEditErrors({});
    setEditError("");

    const errors = {};
    if (!editForm.name.trim()) errors.name = "Enter your name.";
    if (!editForm.studentId.trim()) errors.studentId = "Enter your student ID.";
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const result = await api.put("/api/students/profile", {
        name: editForm.name.trim(),
        studentId: editForm.studentId.trim(),
        profileImage: editUploadedUrl || editForm.imageUrl.trim() || null
      });
      updateUser(result.user);
      setEditOpen(false);
      toast("Profile updated.", "success");
      await load();
    } catch (requestError) {
      setEditErrors(requestError.fieldErrors || {});
      setEditError(requestError.message || "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <div className="container bb-page-head">
          <span className="eyebrow">
            <i className="bi bi-person" /> {isOwnProfile ? "Your profile" : "Student profile"}
          </span>
          <h1 className="mt-3 mb-1">{isOwnProfile ? "My profile" : "Profile"}</h1>
        </div>
        <div className="container pb-5">
          <div className="skeleton" style={{ height: 260, borderRadius: 20 }} />
          <LoadingBlock message="Loading profile…" />
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <div className="container pb-5">
        <EmptyState
          icon="bi-person-x"
          title="Profile not found"
          text={error || "This student profile could not be loaded."}
          action={
            <Link className="btn btn-bb-primary" to="/browse">
              Browse items
            </Link>
          }
        />
      </div>
    );
  }

  const profileUser = profile.user;
  const items = profile.items || [];

  return (
    <>
      <div className="container bb-page-head">
        <span className="eyebrow">
          <i className="bi bi-person" /> {isOwnProfile ? "Your profile" : "Student profile"}
        </span>
        <h1 className="mt-3 mb-1">{isOwnProfile ? "My profile" : profileUser.name}</h1>
        <p className="text-muted-2 mb-0">Your trust score, listings and borrowing record.</p>
      </div>

      <div className="container pb-5">
        <div className="bb-card overflow-hidden">
          <div className="profile-cover" />
          <div className="bb-card-body pt-0">
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
              <div className="d-flex align-items-end gap-3 profile-avatar-wrap">
                <Avatar
                  url={profileUser.profileImage}
                  name={profileUser.name}
                  className="profile-avatar"
                />
                <div className="pb-2">
                  <h2 className="h4 mb-1">{profileUser.name}</h2>
                  <div className="small text-muted-2">
                    <i className="bi bi-envelope me-1" />
                    {profileUser.collegeEmail} ·{" "}
                    <i className="bi bi-person-vcard me-1" />
                    {profileUser.studentId}
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <Stars rating={profile.averageRating} />
                    <span className="small text-muted-2">
                      {Number(profile.reviewCount) > 0
                        ? `${Number(profile.averageRating).toFixed(1)} (${profile.reviewCount} review${
                            profile.reviewCount === 1 ? "" : "s"
                          })`
                        : "No reviews yet"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2 pb-2">
                {isOwnProfile && (
                  <button className="btn btn-bb-primary" type="button" onClick={openEdit}>
                    <i className="bi bi-pencil me-1" />
                    Edit profile
                  </button>
                )}
                <span className="pill pill-muted">
                  <i className="bi bi-calendar3" /> Joined {formatDate(profileUser.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mt-1">
          <StatCard icon="bi-box-seam" value={profile.listedItems} label="Items listed" />
          <StatCard
            icon="bi-arrow-down-left"
            value={profile.totalBorrowed}
            label="Borrows approved"
            tone="teal"
          />
          <StatCard
            icon="bi-arrow-up-right"
            value={profile.totalLent}
            label="Lends approved"
            tone="teal"
          />
          <StatCard
            icon="bi-check2-circle"
            value={profile.completedBorrows + profile.completedLends}
            label="Completed exchanges"
            tone="amber"
          />
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 mt-4">
          <h2 className="h5 fw-bold mb-0">{isOwnProfile ? "My listings" : "Listings"}</h2>
          {isOwnProfile && (
            <Link className="btn btn-bb-primary btn-sm" to="/items/new">
              <i className="bi bi-plus-lg me-1" />
              List an item
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="bb-card">
            <div className="bb-card-body">
              <EmptyState
                icon="bi-box-seam"
                title={
                  isOwnProfile ? "You haven't listed anything yet" : "No items listed"
                }
                text={
                  isOwnProfile
                    ? "Turn things you rarely use into shared campus resources."
                    : "This student has no active listings right now."
                }
                action={
                  isOwnProfile ? (
                    <Link className="btn btn-bb-primary btn-sm" to="/items/new">
                      List your first item
                    </Link>
                  ) : null
                }
              />
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {items.map((item) => (
              <div className="col-md-6 col-xl-4" key={item.id}>
                <ItemCard item={item} manageMode={isOwnProfile} />
              </div>
            ))}
          </div>
        )}

        <ReviewList reviews={profile.reviews} />
      </div>

      <Modal
        show={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        icon="bi-person-gear"
        footer={
          <>
            <button className="btn btn-bb-outline" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-bb-primary"
              type="submit"
              form="editProfileForm"
              disabled={saving || uploading}
            >
              {saving && <span className="spinner-border spinner-border-sm me-2" />}
              Save changes
            </button>
          </>
        }
      >
        <form id="editProfileForm" onSubmit={saveProfile} noValidate>
          <div className="text-center mb-3">
            <img
              src={editPreview}
              alt="Profile preview"
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                objectFit: "cover",
                border: "3px solid #fff",
                boxShadow: "0 0 0 1px var(--bb-border)"
              }}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="editName">
              Full name
            </label>
            <input
              className={"form-control" + (editErrors.name ? " is-invalid" : "")}
              id="editName"
              type="text"
              maxLength={120}
              value={editForm.name}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, name: event.target.value }))
              }
              required
            />
            <div className="invalid-feedback">{editErrors.name}</div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="editStudentId">
              Student ID
            </label>
            <input
              className={"form-control" + (editErrors.studentId ? " is-invalid" : "")}
              id="editStudentId"
              type="text"
              maxLength={50}
              value={editForm.studentId}
              onChange={(event) =>
                setEditForm((current) => ({ ...current, studentId: event.target.value }))
              }
              required
            />
            <div className="invalid-feedback">{editErrors.studentId}</div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="editImageFile">
              Profile photo
            </label>
            <input
              className="form-control"
              id="editImageFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={uploadPhoto}
              disabled={uploading}
            />
            <div className="form-text">
              {uploading ? "Uploading photo…" : "JPG, PNG, WEBP or GIF · up to 5 MB."}
            </div>
          </div>
          <div className="mb-2">
            <label className="form-label" htmlFor="editImageUrl">
              …or paste an image URL
            </label>
            <input
              className={"form-control" + (editErrors.profileImage ? " is-invalid" : "")}
              id="editImageUrl"
              type="url"
              maxLength={500}
              placeholder="https://…"
              value={editForm.imageUrl}
              onChange={(event) => changeImageUrl(event.target.value)}
            />
            <div className="invalid-feedback">{editErrors.profileImage}</div>
          </div>
          {editError && (
            <div className="alert alert-danger py-2 mb-0" role="alert">
              {editError}
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
