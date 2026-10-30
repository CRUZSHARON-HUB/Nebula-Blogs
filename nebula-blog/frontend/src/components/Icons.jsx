const paths = {
  heart: "M12 20.5 4.6 13.4A5.1 5.1 0 0 1 12 6.2a5.1 5.1 0 0 1 7.4 7.2L12 20.5Z",
  comment: "M20 12a8 8 0 0 1-11.7 7.1L4 20.5l1.4-4.2A8 8 0 1 1 20 12Z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3.2 2",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  arrowLeft: "M19 12H5 M11 18l-6-6 6-6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3",
  edit: "M4 20h4L20 8l-4-4L4 16v4Z M14.5 5.5l4 4",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v5 M14 11v5",
  share: "M12 3v12 M8 7l4-4 4 4 M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  plus: "M12 5v14 M5 12h14",
  check: "M4.5 12.5l5 5L20 6.5",
  close: "M6 6l12 12 M18 6 6 18",
  bolt: "M13 2 4.5 13H11l-1 9 8.5-11H12l1-9Z",
  layers: "M12 3 3 8l9 5 9-5-9-5Z M3 13l9 5 9-5 M3 17.5l9 5 9-5",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4 M10 16l-4-4 4-4 M6 12h9",
  spark: "M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.6 5.6l2.8 2.8 M15.6 15.6l2.8 2.8 M18.4 5.6l-2.8 2.8 M8.4 15.6l-2.8 2.8",
};

export function Icon({ name, size = 18, className = "", strokeWidth = 1.7 }) {
  const path = paths[name];
  if (!path) return null;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path.split(" M").map((segment, index) => (
        <path key={index} d={index === 0 ? segment : `M${segment}`} />
      ))}
    </svg>
  );
}
