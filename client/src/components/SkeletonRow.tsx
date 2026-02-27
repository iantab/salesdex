import "./SkeletonRow.css";

export function SkeletonRow() {
  return (
    <div className="skeleton-row">
      <div className="skeleton skeleton-row__rank" />
      <div className="skeleton skeleton-row__cover" />
      <div className="skeleton skeleton-row__title" />
      <div className="skeleton skeleton-row__badge" />
    </div>
  );
}
