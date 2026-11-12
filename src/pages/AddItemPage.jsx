import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import LoadingBlock from "../components/LoadingBlock.jsx";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CATEGORIES = ["Electronics", "Books", "Lab Equipment", "Sports", "Stationery"];
const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" }
];
const PLACEHOLDER = "/assets/item-placeholder.svg";

const EMPTY_FORM = {
  itemName: "",
  category: "",
  customCategory: "",
  description: "",
  itemCondition: "",
  availabilityStatus: "AVAILABLE",
  pricePerDay: "0",
  securityDeposit: "0",
  contactPhone: "",
  imageUrl: ""
};

export default function AddItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const editing = Boolean(id);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [preview, setPreview] = useState(PLACEHOLDER);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!editing) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get("/api/items/" + id)
      .then((item) => {
        if (cancelled) return;
        if (!item.ownedByMe && (!user || item.owner.id !== user.id)) {
          toast("You can only edit your own listings.", "danger");
          navigate(`/items/${id}`, { replace: true });
          return;
        }
        const knownCategory = CATEGORIES.includes(item.category);
        setForm({
          itemName: item.itemName || "",
          category: knownCategory ? item.category : item.category ? "__other" : "",
          customCategory: knownCategory ? "" : item.category || "",
          description: item.description || "",
          itemCondition: item.itemCondition || "",
          availabilityStatus: item.availabilityStatus || "AVAILABLE",
          pricePerDay: String(Number(item.pricePerDay || 0)),
          securityDeposit: String(Number(item.securityDeposit || 0)),
          contactPhone: item.contactPhone || "",
          imageUrl: item.imageUrl && !item.imageUrl.startsWith("/uploads/") ? item.imageUrl : ""
        });
        setUploadedUrl(item.imageUrl || "");
        setPreview(item.imageUrl || PLACEHOLDER);
      })
      .catch((error) => {
        toast(error.message || "Could not load this listing.", "danger");
        window.setTimeout(() => navigate("/profile", { replace: true }), 1200);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, id]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setFormError("");
  }

  async function uploadImage(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setUploadError("");
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError("That image is larger than 5 MB. Please choose a smaller file.");
      event.target.value = "";
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);
    try {
      const result = await api.upload(file);
      setUploadedUrl(result.url);
      setForm((current) => ({ ...current, imageUrl: "" }));
      setPreview(result.url);
      toast("Image uploaded.", "success");
    } catch (error) {
      setUploadError(error.message || "Could not upload the image.");
      setPreview(uploadedUrl || form.imageUrl || PLACEHOLDER);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(localPreview);
      event.target.value = "";
    }
  }

  function updateImageUrl(value) {
    setUploadedUrl("");
    update("imageUrl", value);
    setPreview(value.trim() || PLACEHOLDER);
  }

  function categoryValue() {
    return form.category === "__other" ? form.customCategory.trim() : form.category;
  }

  function validate(payload) {
    const errors = {};
    if (!payload.itemName || payload.itemName.length < 3) {
      errors.itemName = "Give your item a clear name (at least 3 characters).";
    }
    if (!payload.category) {
      errors[form.category === "__other" ? "customCategory" : "category"] =
        "Choose or enter a category.";
    }
    if (!payload.description || payload.description.length < 15) {
      errors.description = "Add a description of at least 15 characters.";
    }
    if (!payload.itemCondition) errors.itemCondition = "Choose the item's condition.";
    if (!Number.isFinite(payload.pricePerDay) || payload.pricePerDay < 0) {
      errors.pricePerDay = "Enter a daily price of 0 or more.";
    }
    if (!Number.isFinite(payload.securityDeposit) || payload.securityDeposit < 0) {
      errors.securityDeposit = "Enter a deposit of 0 or more.";
    }
    if (
      payload.contactPhone &&
      !/^[+]?[0-9][0-9 ()\-]{6,19}$/.test(payload.contactPhone)
    ) {
      errors.contactPhone = "Enter a valid phone number, for example +91 98765 43210.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    setFieldErrors({});
    setFormError("");

    const payload = {
      itemName: form.itemName.trim(),
      category: categoryValue(),
      description: form.description.trim(),
      itemCondition: form.itemCondition,
      availabilityStatus: form.availabilityStatus,
      pricePerDay: form.pricePerDay.trim() === "" ? 0 : Number(form.pricePerDay),
      securityDeposit: form.securityDeposit.trim() === "" ? 0 : Number(form.securityDeposit),
      contactPhone: form.contactPhone.trim() || null,
      imageUrl: uploadedUrl || form.imageUrl.trim() || null
    };

    if (!validate(payload)) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setBusy(true);
    try {
      const saved = editing
        ? await api.put("/api/items/" + id, payload)
        : await api.post("/api/items", payload);
      toast(editing ? "Listing updated." : "Listing published!", "success");
      window.setTimeout(() => navigate(`/items/${saved.id}`), 700);
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFormError(error.message || "Could not save the listing.");
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="container pb-5">
        <LoadingBlock message="Loading your listing…" />
      </div>
    );
  }

  return (
    <>
      <div className="container bb-page-head">
        <span className="eyebrow">
          <i className="bi bi-plus-circle" /> {editing ? "Edit listing" : "New listing"}
        </span>
        <h1 className="mt-3 mb-1">{editing ? "Edit your listing" : "List an item to lend"}</h1>
        <p className="text-muted-2 mb-0">
          Add clear details and a photo so classmates know exactly what they're borrowing.
        </p>
      </div>

      <div className="container pb-5">
        <form onSubmit={submit} noValidate>
          <div className="row g-4">
            <div className="col-lg-7">
              <div className="bb-card">
                <div className="bb-card-body">
                  <h2 className="h5 fw-bold mb-3">Item details</h2>

                  <div className="mb-3">
                    <label className="form-label" htmlFor="itemName">
                      Item name
                    </label>
                    <input
                      className={"form-control" + (fieldErrors.itemName ? " is-invalid" : "")}
                      id="itemName"
                      name="itemName"
                      type="text"
                      maxLength={150}
                      placeholder="e.g. Casio FX-991EX Scientific Calculator"
                      value={form.itemName}
                      onChange={(event) => update("itemName", event.target.value)}
                      required
                    />
                    <div className="invalid-feedback">{fieldErrors.itemName}</div>
                  </div>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="category">
                        Category
                      </label>
                      <select
                        className={"form-select" + (fieldErrors.category ? " is-invalid" : "")}
                        id="category"
                        name="category"
                        value={form.category}
                        onChange={(event) => update("category", event.target.value)}
                        required
                      >
                        <option value="">Choose a category</option>
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                        <option value="__other">Other…</option>
                      </select>
                      <div className="invalid-feedback">{fieldErrors.category}</div>
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label" htmlFor="itemCondition">
                        Condition
                      </label>
                      <select
                        className={
                          "form-select" + (fieldErrors.itemCondition ? " is-invalid" : "")
                        }
                        id="itemCondition"
                        name="itemCondition"
                        value={form.itemCondition}
                        onChange={(event) => update("itemCondition", event.target.value)}
                        required
                      >
                        <option value="">Choose condition</option>
                        {CONDITIONS.map((condition) => (
                          <option key={condition.value} value={condition.value}>
                            {condition.label}
                          </option>
                        ))}
                      </select>
                      <div className="invalid-feedback">{fieldErrors.itemCondition}</div>
                    </div>
                  </div>

                  {form.category === "__other" && (
                    <div className="mt-3">
                      <label className="form-label" htmlFor="customCategory">
                        Custom category
                      </label>
                      <input
                        className={
                          "form-control" + (fieldErrors.customCategory ? " is-invalid" : "")
                        }
                        id="customCategory"
                        type="text"
                        maxLength={60}
                        placeholder="e.g. Musical Instruments"
                        value={form.customCategory}
                        onChange={(event) => update("customCategory", event.target.value)}
                      />
                      <div className="invalid-feedback">{fieldErrors.customCategory}</div>
                    </div>
                  )}

                  <div className="mt-3">
                    <label className="form-label" htmlFor="description">
                      Description
                    </label>
                    <textarea
                      className={
                        "form-control" + (fieldErrors.description ? " is-invalid" : "")
                      }
                      id="description"
                      name="description"
                      rows={5}
                      maxLength={2000}
                      placeholder="What's included? Any wear, rules or accessories the borrower should know about?"
                      value={form.description}
                      onChange={(event) => update("description", event.target.value)}
                      required
                    />
                    <div className="d-flex justify-content-between">
                      <div className="invalid-feedback">{fieldErrors.description}</div>
                      <div className="form-text ms-auto">
                        {form.description.length}/2000
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="form-label" htmlFor="contactPhone">
                      Contact phone <span className="text-muted-2 fw-normal">(optional)</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-telephone" />
                      </span>
                      <input
                        className={
                          "form-control" + (fieldErrors.contactPhone ? " is-invalid" : "")
                        }
                        id="contactPhone"
                        name="contactPhone"
                        type="tel"
                        maxLength={20}
                        placeholder="+91 98765 43210"
                        autoComplete="tel"
                        value={form.contactPhone}
                        onChange={(event) => update("contactPhone", event.target.value)}
                      />
                    </div>
                    <div className="form-text">
                      Shown to signed-in students so they can coordinate pickup. Leave blank to
                      hide it.
                    </div>
                    <div className="invalid-feedback">{fieldErrors.contactPhone}</div>
                  </div>

                  <div className="mt-3">
                    <label className="form-label d-block">Pricing</label>
                    <div className="row g-3">
                      <div className="col-sm-6">
                        <label className="form-label small text-muted-2" htmlFor="pricePerDay">
                          Rental price per day (₹)
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">₹</span>
                          <input
                            className={
                              "form-control" + (fieldErrors.pricePerDay ? " is-invalid" : "")
                            }
                            id="pricePerDay"
                            name="pricePerDay"
                            type="number"
                            min="0"
                            max="99999999"
                            step="0.01"
                            inputMode="decimal"
                            value={form.pricePerDay}
                            onChange={(event) => update("pricePerDay", event.target.value)}
                          />
                        </div>
                        <div className="form-text">Set 0 to lend for free.</div>
                        <div className="invalid-feedback">{fieldErrors.pricePerDay}</div>
                      </div>
                      <div className="col-sm-6">
                        <label
                          className="form-label small text-muted-2"
                          htmlFor="securityDeposit"
                        >
                          Refundable deposit (₹)
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">₹</span>
                          <input
                            className={
                              "form-control" +
                              (fieldErrors.securityDeposit ? " is-invalid" : "")
                            }
                            id="securityDeposit"
                            name="securityDeposit"
                            type="number"
                            min="0"
                            max="99999999"
                            step="0.01"
                            inputMode="decimal"
                            value={form.securityDeposit}
                            onChange={(event) => update("securityDeposit", event.target.value)}
                          />
                        </div>
                        <div className="form-text">Returned after a successful handback.</div>
                        <div className="invalid-feedback">{fieldErrors.securityDeposit}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="form-label d-block">Availability</label>
                    <div className="d-flex flex-wrap gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="availabilityStatus"
                          id="availYes"
                          value="AVAILABLE"
                          checked={form.availabilityStatus === "AVAILABLE"}
                          onChange={(event) => update("availabilityStatus", event.target.value)}
                        />
                        <label className="form-check-label" htmlFor="availYes">
                          <span className="pill pill-success">
                            <i className="bi bi-check-circle" /> Available to borrow
                          </span>
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="availabilityStatus"
                          id="availNo"
                          value="UNAVAILABLE"
                          checked={form.availabilityStatus === "UNAVAILABLE"}
                          onChange={(event) => update("availabilityStatus", event.target.value)}
                        />
                        <label className="form-check-label" htmlFor="availNo">
                          <span className="pill pill-muted">
                            <i className="bi bi-pause-circle" /> Paused
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="form-text mt-1">
                      Paused items stay listed but can't receive new requests.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="bb-card mb-4">
                <div className="bb-card-body">
                  <h2 className="h5 fw-bold mb-3">Photo</h2>
                  <div
                    className="rounded-3 overflow-hidden mb-3"
                    style={{
                      aspectRatio: "4/3",
                      background: "linear-gradient(135deg,#eef4ff,#e6fbfa)"
                    }}
                  >
                    <img
                      src={preview}
                      alt="Item preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <label className="form-label" htmlFor="imageFile">
                    Upload from your device
                  </label>
                  <input
                    className="form-control mb-2"
                    id="imageFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={uploadImage}
                    disabled={uploading}
                  />
                  <div className="form-text mb-3">
                    {uploading ? "Uploading image…" : "JPG, PNG, WEBP or GIF · up to 5 MB."}
                  </div>
                  <label className="form-label" htmlFor="imageUrl">
                    …or paste an image URL
                  </label>
                  <input
                    className={"form-control" + (fieldErrors.imageUrl ? " is-invalid" : "")}
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    maxLength={500}
                    placeholder="https://…"
                    value={form.imageUrl}
                    onChange={(event) => updateImageUrl(event.target.value)}
                  />
                  <div className="invalid-feedback">{fieldErrors.imageUrl}</div>
                  {uploadError && (
                    <div className="alert alert-danger py-2 mt-2 mb-0" role="alert">
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>

              <div className="bb-card">
                <div className="bb-card-body">
                  <h2 className="h6 fw-bold mb-2">
                    <i className="bi bi-lightbulb me-1 text-warning" /> Tips for a great listing
                  </h2>
                  <ul
                    className="small text-muted-2 ps-3 mb-3"
                    style={{ lineHeight: 1.9 }}
                  >
                    <li>Use a clear photo in good lighting.</li>
                    <li>Mention any scratches or missing parts.</li>
                    <li>List accessories that are included.</li>
                    <li>Respond to requests quickly.</li>
                  </ul>
                  {formError && (
                    <div className="alert alert-danger py-2 mb-0" role="alert">
                      {formError}
                    </div>
                  )}
                  <button
                    className="btn btn-bb-primary w-100 mt-3"
                    type="submit"
                    disabled={busy || uploading}
                  >
                    {(busy || uploading) && (
                      <span className="spinner-border spinner-border-sm me-2" />
                    )}
                    {busy
                      ? editing
                        ? "Saving…"
                        : "Publishing…"
                      : editing
                        ? "Save changes"
                        : "Publish listing"}
                  </button>
                  <Link className="btn btn-bb-ghost w-100 mt-2" to="/profile">
                    Cancel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
