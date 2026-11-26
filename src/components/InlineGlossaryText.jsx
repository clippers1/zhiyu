import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, X } from "lucide-react";
import { tokenizeGlossaryText } from "../services/glossary";
import { RouteLink } from "./RouteLink";
import "./reading-enhancements.css";

function GlossaryPopoverTerm({ term, item, currentArticleId, onOpenArticle }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const showArticleLink = item.articleId && item.articleId !== currentArticleId;

  return (
    <span className="glossary-inline-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`glossary-inline-trigger${open ? " active" : ""}`}
        aria-expanded={open}
        aria-label={`查看术语 ${item.code}（${item.zh}）白话解释`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {term}
      </button>
      {open && (
        <span
          className="glossary-inline-popover"
          role="dialog"
          aria-label={`${item.code} 术语释义`}
        >
          <span className="glossary-pop-head">
            <span className="glossary-pop-code">{item.code}</span>
            <button
              type="button"
              className="glossary-pop-close"
              aria-label="关闭术语释义"
              onClick={() => setOpen(false)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </span>
          <strong className="glossary-pop-zh">{item.zh}</strong>
          <span className="glossary-pop-en">{item.en}</span>
          <span className="glossary-pop-summary">{item.summary}</span>
          <span className="glossary-pop-actions">
            {showArticleLink && (
              <RouteLink
                page="article"
                id={item.articleId}
                className="glossary-pop-link primary"
                onNavigate={() => {
                  setOpen(false);
                  onOpenArticle?.(item.articleId);
                }}
              >
                看对应专题 <ArrowRight size={13} aria-hidden="true" />
              </RouteLink>
            )}
            <RouteLink
              page="glossary"
              className="glossary-pop-link"
              onNavigate={() => setOpen(false)}
            >
              <BookOpen size={13} aria-hidden="true" /> A–Z 缩写词典
            </RouteLink>
          </span>
        </span>
      )}
    </span>
  );
}

export default function InlineGlossaryText({
  text,
  seen,
  currentArticleId = "",
  onOpenArticle,
}) {
  const parts = tokenizeGlossaryText(text, seen);
  return parts.map((part, idx) => {
    if (typeof part === "string") {
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    }
    return (
      <GlossaryPopoverTerm
        key={`${part.item.code}-${idx}`}
        term={part.term}
        item={part.item}
        currentArticleId={currentArticleId}
        onOpenArticle={onOpenArticle}
      />
    );
  });
}
