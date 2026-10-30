export function LogoMark({ size = 34 }) {
  return (
    <span className="logo-mark" style={{ "--logo-size": `${size}px` }} aria-hidden="true">
      <span className="logo-cube">
        <span className="logo-face logo-face--front" />
        <span className="logo-face logo-face--back" />
        <span className="logo-face logo-face--right" />
        <span className="logo-face logo-face--left" />
        <span className="logo-face logo-face--top" />
        <span className="logo-face logo-face--bottom" />
      </span>
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <LogoMark size={30} />
      <span className="wordmark__text">
        Nebula<span className="wordmark__dot">.</span>
      </span>
    </span>
  );
}
