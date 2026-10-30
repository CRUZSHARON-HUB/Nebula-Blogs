import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="not-found">
      <div className="not-found__scene" aria-hidden="true">
        <span className="not-found__code">404</span>
        <span className="not-found__ring" />
        <span className="not-found__ring not-found__ring--b" />
      </div>
      <span className="eyebrow">Signal lost</span>
      <h1>This story drifted out of orbit.</h1>
      <p>The page you were looking for does not exist — or it was unpublished, like a good draft should be.</p>
      <div className="not-found__actions">
        <Link to="/" className="btn btn--primary">
          Back to the journal
        </Link>
        <Link to="/write" className="btn btn--ghost">
          Write something new
        </Link>
      </div>
    </section>
  );
}
