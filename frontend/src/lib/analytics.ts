/**
 * Privacy-Conscious, White-Hat Analytics and Monitoring
 * 
 * Complies with strict privacy standards:
 * - Env-driven: GA_MEASUREMENT_ID (no hardcoded credentials)
 * - Public host only: disabled on demo/staging/localhost
 * - Zero PII: child names, photos, face analysis, phone numbers, or parent emails are NEVER transmitted
 */

import { IS_INDEXABLE, SITE_URL, GA_MEASUREMENT_ID } from "@/seo/siteConfig";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let isInitialized = false;

/**
 * Initializes GA4 script dynamically if on production indexable host with valid measurement ID
 */
export function initAnalytics(): void {
  if (typeof window === "undefined" || isInitialized) return;
  
  // Guard: strictly only initialize on production indexable host
  if (!IS_INDEXABLE || !GA_MEASUREMENT_ID || SITE_URL.includes("demo.")) {
    return;
  }

  // Prevent double loading
  const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`);
  if (!existingScript) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false, // Managed manually via React Router transitions
      anonymize_ip: true,
      cookie_flags: "SameSite=None;Secure",
    });

    isInitialized = true;
  }
}

/**
 * Safe dispatch wrapper for gtag
 */
function sendEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;

  // In development or quarantined mode, log clearly for verification without pinging external endpoints
  if (!IS_INDEXABLE || !GA_MEASUREMENT_ID || SITE_URL.includes("demo.")) {
    // Analytics inactive in quarantined mode
    return;
  }

  if (window.gtag) {
    window.gtag("event", eventName, params);
  }
}

// --------------------------------------------------------------------------
// Standard E-commerce & User Funnel SEO Events (Strictly Zero-PII)
// --------------------------------------------------------------------------

export function trackPageView(path: string, title?: string): void {
  sendEvent("page_view", {
    page_location: `${SITE_URL}${path}`,
    page_path: path,
    page_title: title || document.title,
  });
}

export function trackViewItemList(
  items: Array<{ item_id: string; item_name: string; price?: number; item_category?: string }>,
  itemListName = "Story Catalog"
): void {
  sendEvent("view_item_list", {
    item_list_name: itemListName,
    items: items.map((i, idx) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: i.price,
      item_category: i.item_category || "Personalised Storybook",
      index: idx + 1,
    })),
  });
}

export function trackSelectItem(item: {
  item_id: string;
  item_name: string;
  price?: number;
  item_category?: string;
}): void {
  sendEvent("select_item", {
    items: [
      {
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        item_category: item.item_category || "Personalised Storybook",
      },
    ],
  });
}

export function trackViewItem(item: {
  item_id: string;
  item_name: string;
  price: number;
  currency?: string;
  item_category?: string;
}): void {
  sendEvent("view_item", {
    currency: item.currency || "INR",
    value: item.price,
    items: [
      {
        item_id: item.item_id,
        item_name: item.item_name,
        price: item.price,
        currency: item.currency || "INR",
        item_category: item.item_category || "Personalised Storybook",
      },
    ],
  });
}

export function trackPersonaliseStart(storySlug: string, storyTitle?: string): void {
  sendEvent("personalise_start", {
    story_slug: storySlug,
    story_title: storyTitle || "Personalised Storybook",
    // NOTE: Child name, photo, and age are intentionally EXCLUDED to protect privacy
  });
}

export function trackPreviewView(storySlug: string, edition?: string): void {
  sendEvent("preview_view", {
    story_slug: storySlug,
    edition: edition || "digital_flipbook",
  });
}

export function trackBeginCheckout(params: {
  item_id: string;
  item_name: string;
  price: number;
  edition: "digital" | "print_hardcover";
  currency?: string;
  coupon?: string;
}): void {
  sendEvent("begin_checkout", {
    currency: params.currency || "INR",
    value: params.price,
    coupon: params.coupon || undefined,
    items: [
      {
        item_id: params.item_id,
        item_name: params.item_name,
        item_variant: params.edition,
        price: params.price,
        currency: params.currency || "INR",
        quantity: 1,
      },
    ],
  });
}

export function trackPurchase(params: {
  order_id: string;
  value: number;
  edition: string;
  currency?: string;
  coupon?: string;
}): void {
  sendEvent("purchase", {
    transaction_id: params.order_id,
    value: params.value,
    currency: params.currency || "INR",
    coupon: params.coupon || undefined,
    items: [
      {
        item_id: "storybook_order",
        item_name: "Personalised Children Story Book",
        item_variant: params.edition,
        price: params.value,
        currency: params.currency || "INR",
        quantity: 1,
      },
    ],
  });
}

