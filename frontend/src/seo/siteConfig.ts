/**
 * Site configuration and SEO environment resolution
 */

// In Vite, env vars are under import.meta.env
// In Node.js (scripts), env vars are under process.env
const envSiteUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_SITE_URL) ||
  "https://kuttystory.co.in";

const envIndexable =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_INDEXABLE) ||
  (typeof process !== "undefined" && process.env?.VITE_INDEXABLE) ||
  "false";

export const SITE_URL = envSiteUrl.trim().replace(/\/+$/, "");
export const IS_INDEXABLE = envIndexable === "true";

export const SITE_NAME = "KuttyStory";
export const LOCALE = "en_IN";
export const DEFAULT_OG_IMAGE = "/unicorn_cover.png";

export const GSC_VERIFICATION =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_GSC_VERIFICATION) ||
    (typeof process !== "undefined" && process.env?.VITE_GSC_VERIFICATION) ||
    "").trim();

export const BING_VERIFICATION =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_BING_VERIFICATION) ||
    (typeof process !== "undefined" && process.env?.VITE_BING_VERIFICATION) ||
    "").trim();

export const GA_MEASUREMENT_ID =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_GA_MEASUREMENT_ID) ||
    (typeof process !== "undefined" && process.env?.VITE_GA_MEASUREMENT_ID) ||
    "").trim();

export const SUPPORT_EMAIL =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPPORT_EMAIL) ||
    (typeof process !== "undefined" && process.env?.VITE_SUPPORT_EMAIL) ||
    "info@kuttystory.co.in").trim();

export const SUPPORT_PHONE =
  ((typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPPORT_PHONE) ||
    (typeof process !== "undefined" && process.env?.VITE_SUPPORT_PHONE) ||
    "+91 90031 69615").trim();

