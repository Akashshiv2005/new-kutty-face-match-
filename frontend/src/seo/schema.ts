// Resolve canonical site URL across Vite (import.meta.env) and Node.js (process.env)
const rawSiteUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_SITE_URL) ||
  "https://kuttystory.co.in";

export const SITE_URL = rawSiteUrl.trim().replace(/\/+$/, "");

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface StoryProductInfo {
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  priceDigital?: number;
  pricePrint?: number;
  currency?: string;
  ageRange?: string;
  inStock?: boolean;
}

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "KuttyStory",
    "url": SITE_URL,
    "logo": `${SITE_URL}/logo.png`,
    "description": "Personalised children's storybooks in India, turning your child into the hero of an illustrated adventure.",
    "foundingLocation": {
      "@type": "Place",
      "name": "Tiruchirappalli, Tamil Nadu, India"
    },
    "sameAs": [
      "https://www.instagram.com/kuttystory.co",
      "https://www.facebook.com/people/KUTTY-STORY/61593938865227/"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "availableLanguage": ["English", "Tamil"]
    }
  };
}

export function getWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "KuttyStory",
    "url": SITE_URL,
    "inLanguage": "en-IN",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${SITE_URL}/stories?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

export function getBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${SITE_URL}${item.path === "/" ? "" : item.path}`
    }))
  };
}

export function getFaqPageSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

export function getProductSchema(product: StoryProductInfo) {
  const currency = product.currency || "INR";
  const digitalPrice = product.priceDigital || 799;
  const printPrice = product.pricePrint || 1399;
  const imageUrl = product.coverImageUrl
    ? (product.coverImageUrl.startsWith("http") ? product.coverImageUrl : `${SITE_URL}${product.coverImageUrl}`)
    : `${SITE_URL}/unicorn_cover.png`;

  const offers = [
    {
      "@type": "Offer",
      "name": "Digital Instant PDF Edition",
      "price": digitalPrice.toFixed(2),
      "priceCurrency": currency,
      "availability": "https://schema.org/InStock",
      "url": `${SITE_URL}/personalize/${product.slug}?format=digital`,
      "itemCondition": "https://schema.org/NewCondition"
    }
  ];

  if (printPrice) {
    offers.push({
      "@type": "Offer",
      "name": "Hardcover Heirloom Keepsake",
      "price": printPrice.toFixed(2),
      "priceCurrency": currency,
      "availability": "https://schema.org/InStock",
      "url": `${SITE_URL}/personalize/${product.slug}?format=hardcover`,
      "itemCondition": "https://schema.org/NewCondition"
    });
  }

  // NOTE: Strict adherence to white-hat SEO rules:
  // No AggregateRating or Review object is added unless verified, consented reviews exist in DB.
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${product.title} — Personalised Story Book for Kids`,
    "image": [imageUrl],
    "description": product.description || `Personalised story book where your child becomes the hero of ${product.title}.`,
    "sku": `KS-${product.slug.toUpperCase()}`,
    "brand": {
      "@type": "Brand",
      "name": "KuttyStory"
    },
    "audience": {
      "@type": "PeopleAudience",
      "suggestedMinAge": 3,
      "suggestedMaxAge": 8
    },
    "offers": offers
  };
}
