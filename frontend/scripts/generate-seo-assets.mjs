/**
 * Build-time robots.txt & sitemap.xml generator
 * 
 * Strict white-hat implementation:
 * - When VITE_INDEXABLE !== "true":
 *     robots.txt Disallow: /
 *     sitemap.xml is removed or suppressed
 * - When VITE_INDEXABLE === "true":
 *     robots.txt allows public pages, disallows admin/API/storage
 *     sitemap.xml contains only public, canonical, 200 URLs with lastmod
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env
const envPath = path.join(rootDir, ".env");
let envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
      envVars[key] = val;
    }
  }
}

const siteUrl = (process.env.VITE_SITE_URL || envVars.VITE_SITE_URL || "https://kuttystory.co.in").trim().replace(/\/+$/, "");
const isIndexable = (process.env.VITE_INDEXABLE || envVars.VITE_INDEXABLE || "false").toLowerCase() === "true";

const publicDir = path.join(rootDir, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const robotsPath = path.join(publicDir, "robots.txt");
const sitemapPath = path.join(publicDir, "sitemap.xml");

// List of public canonical routes (strictly canonical, no duplicate alias routes like /home or /storybooks)
const canonicalRoutes = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/stories", priority: "0.9", changefreq: "daily" },
  { path: "/how-it-works", priority: "0.8", changefreq: "monthly" },
  { path: "/about", priority: "0.7", changefreq: "monthly" },
  { path: "/collections", priority: "0.8", changefreq: "weekly" },
  { path: "/kuttys-story", priority: "0.7", changefreq: "monthly" },
  { path: "/footsteps", priority: "0.7", changefreq: "monthly" },
  { path: "/journal", priority: "0.7", changefreq: "weekly" },
  { path: "/privacy", priority: "0.5", changefreq: "yearly" },
  { path: "/terms", priority: "0.5", changefreq: "yearly" },
  // Product pages (active stories)
  { path: "/personalize/unicorn-story", priority: "0.9", changefreq: "weekly" }
];

const today = new Date().toISOString().split("T")[0];

if (!isIndexable || siteUrl.includes("demo.")) {
  console.log(`[SEO Assets] Indexing QUARANTINED (isIndexable=${isIndexable}, siteUrl=${siteUrl})`);
  
  // Quarantined robots.txt: Disallow everything
  const robotsQuarantined = `# KuttyStory Staging / Demo Quarantine
User-agent: *
Disallow: /
`;
  fs.writeFileSync(robotsPath, robotsQuarantined, "utf-8");
  console.log("✓ Generated quarantined robots.txt (Disallow: /)");

  // Suppress / delete sitemap.xml in quarantined environments
  if (fs.existsSync(sitemapPath)) {
    fs.unlinkSync(sitemapPath);
    console.log("✓ Removed sitemap.xml from quarantined environment");
  }
} else {
  console.log(`[SEO Assets] Indexing ENABLED for ${siteUrl}`);

  // Production robots.txt
  const robotsProduction = `# KuttyStory Production Robots Policy
User-agent: *
Allow: /

# Private & Administrative Routes
Disallow: /admin*
Disallow: /admin_login
Disallow: /admin_dashboard
Disallow: /api/
Disallow: /storage/

# Search Engine Sitemap
Sitemap: ${siteUrl}/sitemap.xml
`;
  fs.writeFileSync(robotsPath, robotsProduction, "utf-8");
  console.log("✓ Generated production robots.txt");

  // Production sitemap.xml
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${canonicalRoutes
  .map(
    (r) => `  <url>
    <loc>${siteUrl}${r.path === "/" ? "" : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
  fs.writeFileSync(sitemapPath, sitemapXml, "utf-8");
  console.log(`✓ Generated sitemap.xml with ${canonicalRoutes.length} canonical URLs`);
}

