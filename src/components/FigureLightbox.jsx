import React, { useEffect } from "react";
import { X } from "lucide-react";
import "./reading-enhancements.css";

// Accessible full-screen figure zoom overlay rendered outside `.article-figure`
// so inline figure DOM structure and counts stay unchanged.
export default function FigureLightbox({ figure, onClose }) {
  useEffect(() => {
    if (!figure) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [figure, onClose]);

  if (!figure) return null;

  return (
    <div
      className="figure-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={figure.caption || figure.alt || "查看大图"}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="figure-lightbox-sheet">
        <div className="figure-lightbox-bar">
          <span className="figure-lightbox-title">{figure.caption || "放大查看插图"}</span>
          <button
            type="button"
            className="figure-lightbox-close"
            aria-label="关闭大图预览"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
            <span>关闭</span>
          </button>
        </div>
        <div className="figure-lightbox-media">
          <img
            src={figure.src}
            alt={figure.alt || figure.caption || "科普插图大图预览"}
            decoding="async"
          />
        </div>
        {figure.credit && (
          <p className="figure-lightbox-credit">{figure.credit}</p>
        )}
      </div>
    </div>
  );
}
