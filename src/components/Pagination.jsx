export default function Pagination({ pageData, onPage }) {
  if (!pageData || pageData.totalPages <= 1) return null;
  const total = pageData.totalPages;
  const current = pageData.page;
  let start = Math.max(0, current - 2);
  const end = Math.min(total, start + 5);
  if (end - start < 5) start = Math.max(0, end - 5);
  const pages = [];
  for (let index = start; index < end; index += 1) pages.push(index);

  return (
    <nav className="mt-4 d-flex justify-content-center" aria-label="Item pages">
      <ul className="pagination">
        <li className={`page-item ${current === 0 ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onPage(current - 1)} aria-label="Previous page">
            <i className="bi bi-chevron-left" />
          </button>
        </li>
        {pages.map((page) => (
          <li className={`page-item ${page === current ? "active" : ""}`} key={page}>
            <button className="page-link" onClick={() => onPage(page)}>
              {page + 1}
            </button>
          </li>
        ))}
        <li className={`page-item ${pageData.last ? "disabled" : ""}`}>
          <button className="page-link" onClick={() => onPage(current + 1)} aria-label="Next page">
            <i className="bi bi-chevron-right" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
