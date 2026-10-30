import { createContext, useCallback, useState } from "react";

const ToastContext = createContext(null);
let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, type = "info") => {
      const id = ++counter;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      window.setTimeout(() => dismiss(id), 4400);
    },
    [dismiss]
  );

  const value = { push, dismiss };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            className={`toast toast--${toast.type}`}
            onClick={() => dismiss(toast.id)}
          >
            <span className="toast__dot" aria-hidden="true" />
            <span>{toast.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastContext };
