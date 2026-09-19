import React from "react";
import { routePath } from "../services/routes";
import { useReader } from "../reader-context";

// Real links work before hydration, without JavaScript and with open-in-new-tab.
// Only the offline Vite demo intercepts ordinary clicks for its lightweight router.
export function RouteLink({ page, id = "", onNavigate, children, ...props }) {
  const { runtime } = useReader();
  return <a {...props} href={routePath(page, id)} onClick={event => {
    if (!runtime.serverRendered && onNavigate && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault(); onNavigate();
    }
  }}>{children}</a>;
}
