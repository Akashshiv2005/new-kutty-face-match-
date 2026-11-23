import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "@/lib/analytics";

/**
 * ScrollToTop ensures every route change, page redirect, or navigation
 * scrolls the window to the very top (y: 0) instantly so users never land
 * at the bottom or middle of a newly loaded page.
 * Also triggers privacy-safe route-change tracking.
 */
export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (hash) {
      const elementId = hash.replace("#", "");
      const timer = setTimeout(() => {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Scroll window to top
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });

      // Also reset root container scroll if any wrapper is scrollable
      const rootEl = document.getElementById("root");
      if (rootEl) {
        rootEl.scrollTop = 0;
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }
    }

    // Trigger anonymous page view
    trackPageView(pathname);
  }, [pathname, search, hash]);

  return null;
}

