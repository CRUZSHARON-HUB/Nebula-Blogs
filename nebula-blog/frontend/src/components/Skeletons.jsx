export function Skeleton({ className = "", as: Tag = "span" }) {
  return <Tag className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PostCardSkeleton() {
  return (
    <div className="post-card post-card--skeleton" aria-hidden="true">
      <Skeleton className="skeleton--cover" />
      <div className="post-card__body">
        <Skeleton className="skeleton--line skeleton--w40" />
        <Skeleton className="skeleton--line skeleton--w90" />
        <Skeleton className="skeleton--line skeleton--w70" />
        <div className="post-card__footer">
          <Skeleton className="skeleton--avatar" />
          <Skeleton className="skeleton--line skeleton--w30" />
        </div>
      </div>
    </div>
  );
}

export function PostGridSkeleton({ count = 6 }) {
  return (
    <div className="post-grid">
      {Array.from({ length: count }).map((_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function PageLoader({ label = "Aligning the stars" }) {
  return (
    <div className="page-loader" role="status">
      <div className="orb-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{label}…</p>
    </div>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state__orb" aria-hidden="true" />
      <h3>{title}</h3>
      <p>{message}</p>
      {action}
    </div>
  );
}
