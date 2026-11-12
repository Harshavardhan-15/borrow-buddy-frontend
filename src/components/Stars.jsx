export default function Stars({ rating }) {
  const value = Number(rating) || 0;
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <i key={index} className={`bi ${value >= index - 0.25 ? "bi-star-fill" : "bi-star"}`} />
      ))}
    </span>
  );
}
