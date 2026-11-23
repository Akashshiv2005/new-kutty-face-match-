/**
 * Dynamic Razorpay Checkout SDK Loader
 * 
 * Performance Optimization: Loads the third-party Razorpay script (checkout.js)
 * ONLY when the customer explicitly reaches the checkout/payment step,
 * avoiding ~150KB of render-blocking script on initial page load.
 */

let razorpayLoadPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  
  if (typeof (window as any).Razorpay === "function") {
    return Promise.resolve(true);
  }

  if (razorpayLoadPromise) {
    return razorpayLoadPromise;
  }

  razorpayLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      if (typeof (window as any).Razorpay === "function") {
        resolve(true);
      } else {
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      resolve(typeof (window as any).Razorpay === "function");
    };
    script.onerror = () => {
      console.warn("Failed to dynamically load Razorpay checkout.js");
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return razorpayLoadPromise;
}

