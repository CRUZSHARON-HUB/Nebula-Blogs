import { LogoMark } from "./LogoMark";

export function AuthShell({ children }) {
  return (
    <section className="auth">
      <aside className="auth__aside">
        <div className="auth__stage" aria-hidden="true">
          <div className="auth__halo" />
          <div className="auth__cube">
            <span className="auth__face auth__face--front" />
            <span className="auth__face auth__face--back" />
            <span className="auth__face auth__face--right" />
            <span className="auth__face auth__face--left" />
            <span className="auth__face auth__face--top" />
            <span className="auth__face auth__face--bottom" />
          </div>
          <span className="auth__ring auth__ring--a" />
          <span className="auth__ring auth__ring--b" />
          <span className="auth__satellite" />
        </div>
        <div className="auth__quote">
          <span className="eyebrow">
            <LogoMark size={22} /> Nebula Journal
          </span>
          <h2>
            Stories worth
            <br />
            <em>turning over.</em>
          </h2>
          <p>
            A small corner of the internet for interface nerds, backend romantics and anyone who
            has ever argued about line height at 1am.
          </p>
          <ul className="auth__points">
            <li>Read 3D-native stories about building the web.</li>
            <li>Write and publish in a real Django + React app.</li>
            <li>Comment, like and keep drafts private.</li>
          </ul>
        </div>
      </aside>
      <div className="auth__panel">{children}</div>
    </section>
  );
}
