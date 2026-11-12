import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ItemCard from "../components/ItemCard.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Pagination from "../components/Pagination.jsx";
import { api } from "../api/client.js";

const PAGE_SIZE = 12;
const CATEGORIES = ["Electronics", "Books", "Lab Equipment", "Sports", "Stationery"];
const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like new" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" }
];
const SORTS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "price:asc", label: "Price: low to high" },
  { value: "price:desc", label: "Price: high to low" },
  { value: "itemName:asc", label: "Name: A–Z" }
];

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftQuery, setDraftQuery] = useState(searchParams.get("q") || "");

  const filters = useMemo(() => {
    const sort = searchParams.get("sort") || "createdAt:desc";
    return {
      q: searchParams.get("q") || "",
      category: searchParams.get("category") || "",
      condition: searchParams.get("condition") || "",
      sort,
      availableOnly: searchParams.get("availableOnly") === "true",
      page: Math.max(parseInt(searchParams.get("page") || "0", 10) || 0, 0)
    };
  }, [searchParams]);

  useEffect(() => {
    setDraftQuery(filters.q);
  }, [filters.q]);

  const key = searchParams.toString();

  useEffect(() => {
    let cancelled = false;
    const [sortField, dir] = filters.sort.split(":");
    setLoading(true);
    setError("");

    api
      .get(
        "/api/items" +
          api.qs({
            q: filters.q,
            category: filters.category,
            condition: filters.condition,
            availableOnly: filters.availableOnly ? "true" : "",
            page: filters.page,
            size: PAGE_SIZE,
            sort: sortField,
            dir
          })
      )
      .then((data) => {
        if (!cancelled) setPageData(data);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || "Could not load items.");
          setPageData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function updateParams(changes) {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([name, value]) => {
      if (value === "" || value === false || value === null || value === undefined) {
        next.delete(name);
      } else {
        next.set(name, String(value));
      }
    });
    if (!Object.prototype.hasOwnProperty.call(changes, "page")) next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function submitFilters(event) {
    event.preventDefault();
    updateParams({
      q: draftQuery.trim(),
      category: filters.category,
      condition: filters.condition,
      sort: filters.sort === "createdAt:desc" ? "" : filters.sort,
      availableOnly: filters.availableOnly,
      page: ""
    });
  }

  function resetFilters() {
    setDraftQuery("");
    setSearchParams({}, { replace: true });
  }

  const content = pageData?.content || [];
  const total = pageData?.totalElements || 0;
  const from = pageData && content.length > 0 ? pageData.page * pageData.size + 1 : 0;
  const to = pageData ? Math.min(total, from + content.length - 1) : 0;

  return (
    <>
      <div className="container bb-page-head">
        <span className="eyebrow">
          <i className="bi bi-search" /> Campus marketplace
        </span>
        <h1 className="mt-3 mb-1">Browse items</h1>
        <p className="text-muted-2 mb-0">
          Find what you need from students on your campus. Filter by category, condition or
          availability.
        </p>
      </div>

      <div className="container pb-5">
        <div className="filter-bar mb-4">
          <form onSubmit={submitFilters}>
            <div className="row g-2 align-items-end">
              <div className="col-lg-4">
                <label className="form-label" htmlFor="q">
                  Search
                </label>
                <div className="input-icon">
                  <i className="bi bi-search" />
                  <input
                    className="form-control"
                    id="q"
                    type="search"
                    placeholder="Search items…"
                    value={draftQuery}
                    onChange={(event) => setDraftQuery(event.target.value)}
                  />
                </div>
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="category">
                  Category
                </label>
                <select
                  className="form-select"
                  id="category"
                  value={filters.category}
                  onChange={(event) => updateParams({ category: event.target.value })}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-lg-2">
                <label className="form-label" htmlFor="condition">
                  Condition
                </label>
                <select
                  className="form-select"
                  id="condition"
                  value={filters.condition}
                  onChange={(event) => updateParams({ condition: event.target.value })}
                >
                  <option value="">Any condition</option>
                  {CONDITIONS.map((condition) => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-lg-2">
                <label className="form-label" htmlFor="sort">
                  Sort by
                </label>
                <select
                  className="form-select"
                  id="sort"
                  value={filters.sort}
                  onChange={(event) => updateParams({ sort: event.target.value })}
                >
                  {SORTS.map((sort) => (
                    <option key={sort.value} value={sort.value}>
                      {sort.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-lg-2 d-flex gap-2">
                <button className="btn btn-bb-primary flex-grow-1" type="submit">
                  <i className="bi bi-funnel me-1" /> Apply
                </button>
                <button
                  className="btn btn-bb-outline"
                  type="button"
                  id="resetFilters"
                  onClick={resetFilters}
                  aria-label="Clear filters"
                >
                  <i className="bi bi-arrow-counterclockwise" />
                </button>
              </div>
            </div>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
              <div className="chip-row">
                <button
                  type="button"
                  className={"chip" + (filters.category === "" ? " active" : "")}
                  onClick={() => updateParams({ category: "" })}
                >
                  All
                </button>
                {CATEGORIES.map((category) => (
                  <button
                    type="button"
                    className={"chip" + (filters.category === category ? " active" : "")}
                    key={category}
                    onClick={() => updateParams({ category })}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="availableOnly"
                  checked={filters.availableOnly}
                  onChange={(event) => updateParams({ availableOnly: event.target.checked })}
                />
                <label className="form-check-label small fw-semibold" htmlFor="availableOnly">
                  Available now only
                </label>
              </div>
            </div>
          </form>
        </div>

        <div className="d-flex align-items-center justify-content-between mb-3">
          <span className="small text-muted-2" id="resultSummary">
            {loading
              ? "Loading items…"
              : error
                ? "Could not load items"
                : total === 0
                  ? "0 items found"
                  : `Showing ${from}–${to} of ${total} item${total === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className="row g-4" id="itemGrid">
          {loading &&
            Array.from({ length: 6 }).map((_, index) => (
              <div className="col-md-6 col-xl-4" key={index}>
                <div className="skeleton" style={{ height: 380, borderRadius: 20 }} />
              </div>
            ))}

          {!loading && error && (
            <div className="col-12">
              <EmptyState icon="bi-wifi-off" title="Could not load items" text={error} />
            </div>
          )}

          {!loading && !error && content.length === 0 && (
            <div className="col-12">
              <EmptyState
                icon="bi-search"
                title="No items match your filters"
                text="Try a different keyword or clear your filters to see everything on campus."
                action={
                  <button className="btn btn-bb-primary" type="button" onClick={resetFilters}>
                    Clear filters
                  </button>
                }
              />
            </div>
          )}

          {!loading &&
            !error &&
            content.map((item) => (
              <div className="col-md-6 col-xl-4" key={item.id}>
                <ItemCard item={item} />
              </div>
            ))}
        </div>

        <Pagination
          pageData={pageData}
          onPage={(page) => {
            updateParams({ page: page > 0 ? page : "" });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </>
  );
}
