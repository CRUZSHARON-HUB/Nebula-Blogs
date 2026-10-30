import { useCallback, useRef } from "react";

export function useTilt(options = {}) {
  const { max = 7, lift = 0 } = options;
  const ref = useRef(null);
  const frame = useRef(0);

  const onPointerMove = useCallback(
    (event) => {
      if (event.pointerType === "touch") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${((0.5 - py) * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--ry", `${((px - 0.5) * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--tz", `${lift}px`);
        el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        el.classList.add("is-tilting");
      });
    },
    [lift, max]
  );

  const onPointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.classList.remove("is-tilting");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--tz", "0px");
  }, []);

  return { ref, tiltProps: { onPointerMove, onPointerLeave } };
}
