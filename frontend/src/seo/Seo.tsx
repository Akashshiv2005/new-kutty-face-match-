import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SeoRouteConfig } from "./routes";
import {
  SITE_URL,
  IS_INDEXABLE,
  SITE_NAME,
  LOCALE,
  DEFAULT_OG_IMAGE,
  GSC_VERIFICATION,
  BING_VERIFICATION
} from "./siteConfig";

export { SITE_URL, IS_INDEXABLE, SITE_NAME, LOCALE, DEFAULT_OG_IMAGE, GSC_VERIFICATION, BING_VERIFICATION };

export interface SeoProps {
  config?: SeoRouteConfig;
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "book" | "product";
  noindex?: boolean;
  schemas?: object[];
}

export default function Seo({
  config,
  title: propTitle,
  description: propDescription,
  canonicalPath: propCanonicalPath,
  ogImage: propOgImage,
  ogType: propOgType,
  noindex: propNoindex,
  schemas = []
}: SeoProps) {
  const location = useLocation();

  const title = propTitle || config?.title || "Personalised Story Books for Kids | KuttyStory";
  const description =
    propDescription ||
    config?.description ||
    "Make your child the hero of a personalised story book. Explore stories made with their name and photo.";
  const canonicalPath = propCanonicalPath || config?.canonicalPath || location.pathname;
  const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "" : canonicalPath}`;
  const rawOgImage = propOgImage || config?.ogImage || DEFAULT_OG_IMAGE;
  const ogImageUrl = rawOgImage.startsWith("http") ? rawOgImage : `${SITE_URL}${rawOgImage}`;
  const ogType = propOgType || config?.ogType || "website";

  // Strict Demo vs Production Gate
  // When IS_INDEXABLE is false, EVERY page gets noindex, nofollow and canonicals pointing to demo are blocked
  const forceNoIndex = !IS_INDEXABLE || Boolean(propNoindex || config?.noindex);
  const robotsContent = forceNoIndex ? "noindex, nofollow" : "index, follow";

  // Sync with document head directly for SPA transitions
  useEffect(() => {
    document.title = title;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    setMeta("robots", robotsContent);

    // Open Graph
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:image", ogImageUrl, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:type", ogType, true);
    setMeta("og:site_name", SITE_NAME, true);
    setMeta("og:locale", LOCALE, true);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", ogImageUrl);

    // Canonical link tag (ONLY when indexable and not pointing to demo host)
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (IS_INDEXABLE && !SITE_URL.includes("demo.")) {
      if (!linkCanonical) {
        linkCanonical = document.createElement("link");
        linkCanonical.setAttribute("rel", "canonical");
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute("href", canonicalUrl);
    } else if (linkCanonical) {
      linkCanonical.remove();
    }

    // Search Console & Bing Verification
    if (IS_INDEXABLE && !SITE_URL.includes("demo.")) {
      if (GSC_VERIFICATION) setMeta("google-site-verification", GSC_VERIFICATION);
      if (BING_VERIFICATION) setMeta("msvalidate.01", BING_VERIFICATION);
    }
  }, [title, description, canonicalUrl, ogImageUrl, ogType, robotsContent]);

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robotsContent} />

      {/* Self-referencing canonical URL: Production Only, Never point at demo */}
      {IS_INDEXABLE && !SITE_URL.includes("demo.") && (
        <link rel="canonical" href={canonicalUrl} />
      )}

      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={LOCALE} />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {/* Search Engine Verification (Production Only) */}
      {IS_INDEXABLE && !SITE_URL.includes("demo.") && GSC_VERIFICATION && (
        <meta name="google-site-verification" content={GSC_VERIFICATION} />
      )}
      {IS_INDEXABLE && !SITE_URL.includes("demo.") && BING_VERIFICATION && (
        <meta name="msvalidate.01" content={BING_VERIFICATION} />
      )}

      {/* JSON-LD Schemas */}
      {schemas.map((schema, idx) => (
        <script
          key={`ld-json-${idx}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
