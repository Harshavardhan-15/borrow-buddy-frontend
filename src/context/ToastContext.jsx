import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

const ICONS = {
  success: "bi-check-circle-fill",
  danger: "bi-exclamation-octagon-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill"
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "success") => {
      const id = ++nextId.current;
      setToasts((current) => [...current, { id, message, type }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container position-fixed bottom-0 end-0 p-3">
        {toasts.map((item) => (
          <div className="toast show align-items-center border-0 mb-2" role="alert" key={item.id}>
            <div className={`d-flex text-bg-${item.type}`}>
              <div className="toast-body d-flex align-items-center gap-2">
                <i className={`bi ${ICONS[item.type] || ICONS.info}`} />
                {item.message}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Close"
                onClick={() => remove(item.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
