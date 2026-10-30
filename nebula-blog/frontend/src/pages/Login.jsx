import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthShell } from "../components/AuthShell";
import { Icon } from "../components/Icons";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/useToast";

export function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (user) return <Navigate to={from} replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      setError("Enter your username (or email) and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const account = await login(identifier.trim(), password);
      toast.push(`Welcome back, ${account.username}.`, "success");
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const useDemo = () => {
    setIdentifier("demo");
    setPassword("demo1234");
    setError("");
  };

  return (
    <AuthShell>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__head">
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in to Nebula</h1>
          <p>Pick up where you left off. Your drafts are exactly where you hid them.</p>
        </div>

        {error && (
          <p className="form-error" role="alert">
            <Icon name="bolt" size={15} /> {error}
          </p>
        )}

        <label className="field">
          <span>Username or email</span>
          <input
            ref={inputRef}
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="demo"
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <span className="field__password">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="field__toggle"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <Icon name="eye" size={17} />
            </button>
          </span>
        </label>

        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? "Opening the airlock…" : "Sign in"}
          {!busy && <Icon name="arrow" size={18} />}
        </button>

        <button type="button" className="demo-ticket" onClick={useDemo}>
          <span className="demo-ticket__badge">Demo</span>
          <span>
            Use the seeded account
            <small>demo / demo1234 — full write access</small>
          </span>
          <Icon name="arrow" size={16} />
        </button>

        <p className="auth-card__foot">
          New here?{" "}
          <Link to="/register" state={{ from }}>
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
