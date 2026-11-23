/**
 * Automated JSON-LD Validator for KuttyStory
 * 
 * Verifies that all schema generators produce valid, parseable JSON-LD structures
 * matching Google's Structured Data guidelines.
 */

import {
  getOrganizationSchema,
  getWebSiteSchema,
  getBreadcrumbSchema,
  getFaqPageSchema,
  getProductSchema
} from "../src/seo/schema.ts";

function validate(name, obj) {
  try {
    const serialized = JSON.stringify(obj);
    const parsed = JSON.parse(serialized);

    if (!parsed["@context"] || parsed["@context"] !== "https://schema.org") {
      throw new Error(`Missing or invalid @context in ${name}`);
    }
    if (!parsed["@type"]) {
      throw new Error(`Missing @type in ${name}`);
    }

    // Specific structural checks
    if (parsed["@type"] === "BreadcrumbList") {
      if (!Array.isArray(parsed.itemListElement) || parsed.itemListElement.length === 0) {
        throw new Error(`BreadcrumbList has empty itemListElement`);
      }
    }

    if (parsed["@type"] === "FAQPage") {
      if (!Array.isArray(parsed.mainEntity) || parsed.mainEntity.length === 0) {
        throw new Error(`FAQPage has empty mainEntity`);
      }
    }

    if (parsed["@type"] === "Product") {
      if (!parsed.name || !parsed.offers || parsed.offers.length === 0) {
        throw new Error(`Product schema missing name or offers`);
      }
    }

    console.log(`✓ ${name}: Valid JSON-LD (${parsed["@type"]})`);
    return true;
  } catch (err) {
    console.error(`✗ ${name} FAILED:`, err.message);
    return false;
  }
}

let allPassed = true;

// Test Organization
allPassed = validate("Organization Schema", getOrganizationSchema()) && allPassed;

// Test WebSite
allPassed = validate("WebSite Schema", getWebSiteSchema()) && allPassed;

// Test BreadcrumbList
allPassed =
  validate(
    "BreadcrumbList Schema",
    getBreadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Stories", path: "/stories" }
    ])
  ) && allPassed;

// Test FAQPage
allPassed =
  validate(
    "FAQPage Schema",
    getFaqPageSchema([
      {
        question: "How does personalisation work?",
        answer: "You enter your child's name, upload a clear photo, and we craft an illustrated story."
      }
    ])
  ) && allPassed;

// Test Product
allPassed =
  validate(
    "Product Schema",
    getProductSchema({
      title: "The Girl and the Magical Unicorn",
      slug: "unicorn-story",
      description: "An enchanting personalized adventure.",
      coverImageUrl: "/unicorn_cover.png",
      priceDigital: 799,
      pricePrint: 1399,
      currency: "INR"
    })
  ) && allPassed;

if (!allPassed) {
  console.error("\nSome JSON-LD schemas failed validation!");
  process.exit(1);
} else {
  console.log("\nAll JSON-LD schemas parsed and validated successfully.");
}

