import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { AuthShell } from "../components/AuthShell";
import { Icon } from "../components/Icons";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/useToast";

const USERNAME_RULE = /^[a-zA-Z0-9_]{3,20}$/;

export function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";
  const [form, setForm] = useState({
    username: "",
    email: "",
    headline: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!USERNAME_RULE.test(form.username.trim())) {
      next.username = "3–20 characters, letters, numbers or underscores.";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = "That email doesn't look right.";
    }
    if (form.password.length < 8) {
      next.password = "At least 8 characters, please.";
    }
    if (form.confirm !== form.password) {
      next.confirm = "The passwords don't match.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!validate()) return;
    setBusy(true);
    try {
      const account = await register({
        username: form.username.trim(),
        email: form.email.trim(),
        headline: form.headline.trim(),
        password: form.password,
      });
      toast.push(`Welcome to Nebula, ${account.username}.`, "success");
      navigate("/write", { replace: true });
    } catch (err) {
      const data = err.data && typeof err.data === "object" ? err.data : {};
      const fieldErrors = {};
      ["username", "email", "password"].forEach((key) => {
        if (data[key]) fieldErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key];
      });
      setErrors(fieldErrors);
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const passwordChecks = [
    { label: "8+ characters", pass: form.password.length >= 8 },
    { label: "A number", pass: /\d/.test(form.password) },
    { label: "Not too common", pass: form.password.length > 0 && !/^(password|12345678|qwerty)/i.test(form.password) },
  ];

  return (
    <AuthShell>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-card__head">
          <span className="eyebrow">Join the journal</span>
          <h1>Create your account</h1>
          <p>Publish 3D-native stories, keep private drafts and join the conversation.</p>
        </div>

        {formError && (
          <p className="form-error" role="alert">
            <Icon name="bolt" size={15} /> {formError}
          </p>
        )}

        <div className="field-row">
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={form.username}
              onChange={update("username")}
              placeholder="ada_lovelace"
              autoComplete="username"
              aria-invalid={Boolean(errors.username)}
              required
            />
            {errors.username && <small className="field__error">{errors.username}</small>}
          </label>
          <label className="field">
            <span>
              Email <em>(optional)</em>
            </span>
            <input
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <small className="field__error">{errors.email}</small>}
          </label>
        </div>

        <label className="field">
          <span>
            Headline <em>(optional)</em>
          </span>
          <input
            type="text"
            value={form.headline}
            onChange={update("headline")}
            placeholder="Design-minded developer"
            maxLength={120}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Password</span>
            <span className="field__password">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
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
            {errors.password && <small className="field__error">{errors.password}</small>}
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input
              type={showPassword ? "text" : "password"}
              value={form.confirm}
              onChange={update("confirm")}
              placeholder="One more time"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirm)}
              required
            />
            {errors.confirm && <small className="field__error">{errors.confirm}</small>}
          </label>
        </div>

        <ul className="password-meter">
          {passwordChecks.map((check) => (
            <li key={check.label} className={check.pass ? "is-pass" : ""}>
              <span className="password-meter__dot" />
              {check.label}
            </li>
          ))}
        </ul>

        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? "Launching…" : "Create account"}
          {!busy && <Icon name="arrow" size={18} />}
        </button>

        <p className="auth-card__foot">
          Already have an account?{" "}
          <Link to="/login" state={{ from }}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
