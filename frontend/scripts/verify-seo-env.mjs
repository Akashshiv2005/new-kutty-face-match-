/**
 * Build-time SEO & Environment Gate Validator
 * 
 * Ensures demo environments and unindexed builds cannot accidentally deploy
 * to production, and ensures production builds never ship with noindex or demo canonicals.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Load .env if present
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

const siteUrl = process.env.VITE_SITE_URL || envVars.VITE_SITE_URL || "https://kuttystory.co.in";
const isIndexable = (process.env.VITE_INDEXABLE || envVars.VITE_INDEXABLE || "false").toLowerCase() === "true";
const isProductionTarget =
  process.env.BUILD_TARGET === "production" ||
  process.env.NODE_ENV === "production" ||
  process.env.VERIFY_PRODUCTION === "true";

console.log("\n==================================================");
console.log(" KuttyStory SEO Gate Verification");
console.log("==================================================");
console.log(` Target Site URL: ${siteUrl}`);
console.log(` Indexable Mode:  ${isIndexable ? "ENABLED (Production)" : "QUARANTINED (noindex, nofollow)"}`);
console.log(` Build Mode:      ${isProductionTarget ? "Production Target" : "Standard / Demo"}`);

// Check 1: Demo domains must NEVER be indexable
if (siteUrl.includes("demo.") && isIndexable) {
  console.error("\n❌ FATAL SEO ERROR: A demo domain cannot be configured as indexable!");
  console.error("   demo.kuttystory.co.in must NEVER compete with production kuttystory.co.in in search engines.");
  console.error("   Set VITE_INDEXABLE=false for demo environments.\n");
  process.exit(1);
}

// Check 2: Production builds must have valid canonical host and indexable true
if (process.env.VERIFY_PRODUCTION === "true" || process.env.BUILD_TARGET === "production") {
  if (!isIndexable) {
    console.error("\n❌ FATAL PRODUCTION BUILD ERROR: Production build requested but VITE_INDEXABLE is false!");
    console.error("   Production search engines would receive 'noindex, nofollow' tags.");
    console.error("   Set VITE_INDEXABLE=true before running a production build.\n");
    process.exit(1);
  }

  if (siteUrl !== "https://kuttystory.co.in") {
    console.error(`\n❌ FATAL PRODUCTION BUILD ERROR: Production canonical host mismatch!`);
    console.error(`   Expected: https://kuttystory.co.in`);
    console.error(`   Found:    ${siteUrl}\n`);
    process.exit(1);
  }
}

console.log("✓ SEO Gate Verification passed successfully.\n");

