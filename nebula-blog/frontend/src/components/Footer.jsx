import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <p className="footer__name">Nebula<span>.</span></p>
          <p className="footer__tag">A full-stack journal for people who build the web.</p>
          <p className="footer__stack">React · Django REST · JWT · SQL</p>
        </div>
        <div className="footer__col">
          <p className="footer__heading">Explore</p>
          <Link to="/">Stories</Link>
          <Link to="/write">Write</Link>
          <Link to="/register">Join</Link>
        </div>
        <div className="footer__col">
          <p className="footer__heading">Demo account</p>
          <p className="footer__muted">demo / demo1234</p>
          <p className="footer__muted">Seeded with 9 stories, comments and drafts.</p>
        </div>
      </div>
      <div className="footer__base">
        <span>© {new Date().getFullYear()} Nebula Journal</span>
        <span>Built in the space between design and engineering.</span>
      </div>
    </footer>
  );
}
