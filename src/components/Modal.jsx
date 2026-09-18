import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export default function Modal({ children, className = "", onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() =>
      dialogRef.current?.querySelector("input,button,a")?.focus(),
    );
    function key(event) {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const items = dialogRef.current?.querySelectorAll(
          'button:not([disabled]),a[href],input,[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = before;
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <button
          className="close-button icon-button"
          aria-label="关闭弹窗"
          onClick={onClose}
        >
          <X size={22} />
        </button>
        {children}
      </section>
    </div>
  );
}
