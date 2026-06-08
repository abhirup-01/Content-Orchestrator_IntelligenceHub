// Tiny built-in toast system — no external library.
//
// Usage:
//   1. Wrap the BrandIntelligence subtree in <ToastProvider>
//   2. Inside any component: const toast = useToast(); toast.success("Saved")
//
// Toasts auto-dismiss after 3.5 s. Stack vertically in the bottom-right.
// Three variants: success (green), error (red), info (neutral).
// Kept deliberately minimal so no dependencies are added to package.json.

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import "./IntelligenceCss/Toast.css";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (variant, message, ttl = 3500) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, variant, message }]);
      const handle = setTimeout(() => dismiss(id), ttl);
      timersRef.current.set(id, handle);
      return id;
    },
    [dismiss]
  );

  const api = {
    success: (msg, ttl) => push("success", msg, ttl),
    error:   (msg, ttl) => push("error",   msg, ttl),
    info:    (msg, ttl) => push("info",    msg, ttl),
    dismiss,
  };

  // Cleanup any in-flight timers on unmount.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((tm) => clearTimeout(tm));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.variant}`}
            onClick={() => dismiss(t.id)}
          >
            <span className="toast__icon" aria-hidden="true">
              {t.variant === "success" ? "✓" : t.variant === "error" ? "✕" : "ⓘ"}
            </span>
            <span className="toast__msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail safe: if no provider wraps us, fall back to console — never crash
    // a render because a toast wasn't wired up.
    return {
      success: (m) => console.log("[toast:success]", m),
      error:   (m) => console.warn("[toast:error]", m),
      info:    (m) => console.log("[toast:info]", m),
      dismiss: () => {},
    };
  }
  return ctx;
}
