import { useEffect, useState } from "react";
import { READING_SECTIONS, readingRevision } from "./services/reading";

export function useReadingPosition(reading, kind, id, content) {
  const revision = readingRevision(content);
  const { ready, enabled, record, savePosition } = reading;
  const [session, setSession] = useState(null);
  useEffect(() => {
    if (!ready || !enabled) { setSession(null); return; }
    const previous = reading.entries.find(item => item.kind === kind && item.id === id)?.position;
    const entry = record(kind, id, revision);
    if (!entry) return;
    const visit = entry.visit;
    setSession({ kind, id, visit, previous, dismissed: false });
    let timer;
    let pending;
    let lastSection;
    function flush() {
      clearTimeout(timer);
      if (!pending) return;
      savePosition(kind, id, visit, { section: pending, revision });
      lastSection = pending;
      pending = null;
    }
    function onScroll() {
      const sections = Object.keys(READING_SECTIONS[kind]).map(key => document.getElementById(key)).filter(Boolean);
      // Only save after real movement or an explicit section link, not on mount.
      const section = sections.filter(node => node.getBoundingClientRect().top <= 160).at(-1)?.id;
      if (!section) return;
      if (section === lastSection) { pending = null; clearTimeout(timer); return; }
      pending = section;
      clearTimeout(timer);
      timer = setTimeout(flush, 400);
    }
    function onVisibility() { if (document.visibilityState === "hidden") flush(); }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    // Explicit source links must keep working even if native anchor scrolling
    // happened before hydration. They never trigger automatic history restore.
    if (Object.hasOwn(READING_SECTIONS[kind], window.location.hash.slice(1))) onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
    // entries intentionally excluded: scrolling must not create another visit.
  }, [ready, enabled, kind, id, revision, record, savePosition]);
  const active = ready && enabled && session?.kind === kind && session.id === id
    && reading.entries.some(item => item.kind === kind && item.id === id && item.visit === session.visit);
  const previous = active && !session.dismissed ? session.previous : null;
  const changed = previous && previous.revision !== revision;
  function dismiss() { setSession(current => current ? { ...current, dismissed: true } : current); }
  function resume() {
    if (!previous || changed) return;
    const node = document.getElementById(previous.section);
    if (!node) { dismiss(); return; }
    dismiss();
    requestAnimationFrame(() => {
      if (!node.isConnected) return;
      node.scrollIntoView({ block: "start", behavior: "instant" });
      node.setAttribute("tabindex", "-1");
      node.focus({ preventScroll: true });
      savePosition(kind, id, session.visit, previous);
    });
  }
  return { previous, changed, resume, dismiss };
}
