import { useEffect, useRef } from "react";

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel, busy }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <button type="button" className="modal__scrim" aria-label="Close dialog" onClick={onCancel} />
      <div className="modal__card" ref={ref} tabIndex={-1}>
        <span className="modal__glyph" aria-hidden="true">!</span>
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
