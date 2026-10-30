import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../lib/auth";
import { Avatar } from "./Avatar";
import { Wordmark } from "./LogoMark";

export function Navbar() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenu(false);
      }
    };
    document.addEventListener("pointerdown", onClick);
    return () => document.removeEventListener("pointerdown", onClick);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenu(false);
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="nav__inner">
        <Link to="/" className="nav__brand" onClick={() => setMenuOpen(false)} aria-label="Nebula home">
          <Wordmark />
        </Link>

        <nav className={`nav__links ${menuOpen ? "is-open" : ""}`} aria-label="Main">
          <NavLink to="/" end className="nav__link" onClick={() => setMenuOpen(false)}>
            Stories
          </NavLink>
          <NavLink to="/write" className="nav__link" onClick={() => setMenuOpen(false)}>
            Write
          </NavLink>
          {user && (
            <NavLink
              to={`/profile/${user.username}`}
              className="nav__link nav__link--mobile"
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </NavLink>
          )}
          <div className="nav__mobile-actions">
            {user ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
                Sign out
              </button>
            ) : (
              <>
                <Link to="/login" className="btn btn--ghost btn--sm" onClick={() => setMenuOpen(false)}>
                  Sign in
                </Link>
                <Link to="/register" className="btn btn--primary btn--sm" onClick={() => setMenuOpen(false)}>
                  Join Nebula
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="nav__actions">
          {user ? (
            <div className="nav__user" ref={menuRef}>
              <button
                type="button"
                className="nav__avatar-btn"
                onClick={() => setUserMenu((open) => !open)}
                aria-expanded={userMenu}
                aria-haspopup="true"
              >
                <Avatar user={user} size={34} />
                <span className="nav__user-name">{user.username}</span>
                <span className={`chevron ${userMenu ? "is-open" : ""}`} aria-hidden="true" />
              </button>
              {userMenu && (
                <div className="nav__dropdown">
                  <Link to={`/profile/${user.username}`} onClick={() => setUserMenu(false)}>
                    Your profile
                  </Link>
                  <Link to="/write" onClick={() => setUserMenu(false)}>
                    New story
                  </Link>
                  <button type="button" onClick={handleLogout}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav__auth">
              <Link to="/login" className="btn btn--ghost btn--sm">
                Sign in
              </Link>
              <Link to="/register" className="btn btn--primary btn--sm">
                Join Nebula
              </Link>
            </div>
          )}
          <button
            type="button"
            className={`nav__burger ${menuOpen ? "is-open" : ""}`}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
