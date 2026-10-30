export function CoverArt({ theme = "aurora", category, glyph, className = "", compact = false }) {
  const symbol = glyph || category?.name?.slice(0, 1) || "N";
  return (
    <div className={`cover cover--${theme} ${compact ? "cover--compact" : ""} ${className}`} aria-hidden="true">
      <div className="cover__nebula" />
      <div className="cover__grid" />
      <div className="cover__orbit cover__orbit--a" />
      <div className="cover__orbit cover__orbit--b" />
      <div className="cover__diamond">
        <span className="cover__diamond-inner" />
      </div>
      <span className="cover__glyph">{symbol}</span>
      {category && <span className="cover__badge">{category.name}</span>}
    </div>
  );
}
