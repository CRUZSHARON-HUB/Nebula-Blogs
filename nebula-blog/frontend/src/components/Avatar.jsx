import { initials } from "../lib/format";

export function Avatar({ user, size = 36, className = "" }) {
  const name = user?.username || "unknown";
  const color = user?.avatar_color || "#7c5cff";
  return (
    <span
      className={`avatar ${className}`}
      style={{
        "--avatar-size": `${size}px`,
        "--avatar-color": color,
      }}
      title={name}
    >
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt="" loading="lazy" />
      ) : (
        <span className="avatar__initials">{initials(name)}</span>
      )}
    </span>
  );
}
