/**
 * Build-Time Prerendering for KuttyStory Public Routes
 * 
 * Solves the SPA client-side rendering limitation:
 * In a pure client-side SPA, crawlers without full JS execution may only see an empty <div id="root"></div>.
 * This script prerenders every public route into static HTML with:
 * - Exact title, meta description, canonical, robots
 * - Open Graph & Twitter Card tags
 * - Validated JSON-LD structured data (Organization, WebSite, Breadcrumbs, FAQPage, Product+Offer)
 * - Semantic prerendered HTML (<header>, <h1>, <h2>, first 100+ words, internal links, visible FAQs)
 * 
 * Works across both static hosts (Nginx, Netlify, Vercel, S3) and local servers.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

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
const robotsContent = !isIndexable || siteUrl.includes("demo.") ? "noindex, nofollow" : "index, follow";

if (!fs.existsSync(distDir)) {
  console.error("Error: dist/ directory does not exist. Run vite build first.");
  process.exit(1);
}

const templatePath = path.join(distDir, "index.html");
if (!fs.existsSync(templatePath)) {
  console.error("Error: dist/index.html template not found.");
  process.exit(1);
}

const rawTemplate = fs.readFileSync(templatePath, "utf-8");

// Sanitize template so repeated prerender runs always start from a clean baseline
const baseTemplate = rawTemplate
  .replace(/<title>.*?<\/title>/i, "")
  .replace(/<meta\s+name=["']description["'][^>]*>/gi, "")
  .replace(/<meta\s+name=["']robots["'][^>]*>/gi, "")
  .replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "")
  .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "")
  .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "")
  .replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi, "")
  .replace(/<div id="root">[\s\S]*?<\/div>/i, '<div id="root"></div>');

// Base schemas
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "KuttyStory",
  "url": siteUrl,
  "logo": `${siteUrl}/unicorn_cover.png`,
  "description": "Personalised children's storybooks made in India with child name and photo.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Tiruchirappalli",
    "addressRegion": "Tamil Nadu",
    "addressCountry": "IN"
  }
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "KuttyStory",
  "url": siteUrl,
  "inLanguage": "en-IN"
};

// Route definitions for prerendering
const routes = [
  {
    path: "/",
    title: "Personalised Story Books for Kids in India | KuttyStory",
    description: "Make your child the hero of a personalised story book. Explore stories made with their name and photo and find a thoughtful birthday gift for kids.",
    canonical: siteUrl,
    h1: "Personalised Story Books for Kids — Your Child Is the Hero",
    h2: "A Story With One Very Special Hero",
    introCopy: "Imagine opening a storybook and discovering your own child inside the pages. At KuttyStory, we turn everyday story time into an unforgettable adventure. By personalising each book with your child's name, photo and character likeness, we help young readers see themselves as brave, kind and curious explorers.",
    links: [
      { text: "Explore Story Books", href: "/stories" },
      { text: "How It Works", href: "/how-it-works" },
      { text: "Birthday Gifts for Kids", href: "/stories#birthday-gifts" }
    ],
    faqs: [
      { q: "What is a personalised story book?", a: "A personalised story book is a custom-created children's book where your child is the star of the narrative, featuring their name, character likeness, and custom illustrations." },
      { q: "How do you personalise the book with my child's photo?", a: "Parents upload a clear front-facing photo with guardian consent. Our creative studio transforms the photo into storybook illustrations matching the narrative style." },
      { q: "What age range are KuttyStory books suitable for?", a: "Our current catalog is crafted for children aged 3 to 8 years, with early-learning adventures suitable from age 2." }
    ],
    breadcrumbs: []
  },
  {
    path: "/stories",
    title: "Personalised Kids Story Books Online | KuttyStory",
    description: "Explore personalised story books for children. Choose an age-appropriate adventure, add your child's name and photo, and make story time truly theirs.",
    canonical: `${siteUrl}/stories`,
    h1: "Explore Personalised Story Books for Kids",
    h2: "Illustrated Adventures Made for Every Young Reader",
    introCopy: "Discover our growing library of personalised story books for kids in India. Each adventure is thoughtfully written, beautifully illustrated, and personalised with your child's name and likeness.",
    links: [
      { text: "The Girl and the Magical Unicorn", href: "/personalize/unicorn-story" },
      { text: "Birthday Gifts Collection", href: "/stories#birthday-gifts" },
      { text: "Birthday Return Gifts in Bulk", href: "/collections#birthday-return-gifts" }
    ],
    faqs: [
      { q: "Can I buy a personalised story book as a birthday gift for another child?", a: "Yes. Simply enter the birthday child's name, select their age and gender, and upload a clear photo with the guardian's permission." },
      { q: "How long does delivery take for a birthday gift book?", a: "Digital editions are ready immediately after order confirmation. Printed hardcover keepsakes are printed and dispatched within 3 to 5 business days across India." },
      { q: "What age groups are these birthday story books designed for?", a: "Our storybooks are designed for ages 3 to 8, with simple text and rich illustrations that appeal to toddlers (ages 2-3), preschoolers (ages 3-5), and early readers (ages 6-8)." }
    ],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "Stories", item: `${siteUrl}/stories` }
    ]
  },
  {
    path: "/how-it-works",
    title: "How Personalised Story Books Work | KuttyStory",
    description: "See how KuttyStory turns a child's name and photo into an illustrated adventure. Learn how to choose a story, check the preview and place an order.",
    canonical: `${siteUrl}/how-it-works`,
    h1: "How to Create Your Child's Personalised Story Book",
    h2: "Simple 5-Step Atelier Process",
    introCopy: "Creating a custom illustrated keepsake for your child takes only a few minutes. Follow our guided process to pick a story, provide details, review the flipbook preview, and order.",
    links: [
      { text: "Browse Stories", href: "/stories" },
      { text: "Personalize Unicorn Story", href: "/personalize/unicorn-story" },
      { text: "Privacy Policy", href: "/privacy" }
    ],
    faqs: [
      { q: "Can I preview the complete story book before making a payment?", a: "Yes! You can preview key opening pages in our interactive 3D flipbook reader before deciding to order." },
      { q: "What photo guidelines should I follow for best illustration results?", a: "Use a well-lit, front-facing portrait where your child's eyes, hair, and face are clearly visible." },
      { q: "Are my child's photos and personal details safe?", a: "Yes. Privacy and child safety are our highest priorities. Photos are used solely to render the personalized illustrations." }
    ],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "How It Works", item: `${siteUrl}/how-it-works` }
    ]
  },
  {
    path: "/about",
    title: "About KuttyStory | Personalised Books for Kids",
    description: "Meet KuttyStory, the personalised children's book brand that helps kids become the heroes of their own illustrated adventures.",
    canonical: `${siteUrl}/about`,
    h1: "About KuttyStory",
    h2: "Inspiring a Lifelong Love for Reading",
    introCopy: "Based in Tiruchirappalli, Tamil Nadu, KuttyStory was founded with a singular mission: to make children fall in love with reading by seeing themselves as the heroes of their own stories.",
    links: [
      { text: "Explore Books", href: "/stories" },
      { text: "How It Works", href: "/how-it-works" },
      { text: "Contact Details", href: "/about#contact" }
    ],
    faqs: [
      { q: "Where is KuttyStory based?", a: "KuttyStory is based in Tiruchirappalli, Tamil Nadu, India." },
      { q: "Are KuttyStory books available in regional languages?", a: "Our books are primarily written in English with Tamil language edition support." }
    ],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "About Us", item: `${siteUrl}/about` }
    ]
  },
  {
    path: "/collections",
    title: "Curated Book Collections & Gift Sets | KuttyStory",
    description: "Browse curated personalised book collections, keepsake gift sets, and custom birthday return gifts for children by KuttyStory.",
    canonical: `${siteUrl}/collections`,
    h1: "Curated Children's Book Collections & Gift Sets",
    h2: "Keepsake Gift Boxes & Birthday Return Gifts",
    introCopy: "Explore curated gift sets and custom birthday return gifts for kids. Give young guests an unforgettable keepsake featuring custom illustrations.",
    links: [
      { text: "View Stories", href: "/stories" },
      { text: "Birthday Return Gifts Concierge", href: "/collections#birthday-return-gifts" }
    ],
    faqs: [
      { q: "Can I order personalised story books as birthday return gifts for party guests?", a: "Yes! We coordinate bulk orders for birthday return gifts and celebrations." }
    ],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "Collections", item: `${siteUrl}/collections` }
    ]
  },
  {
    path: "/kuttys-story",
    title: "Kutty's Story — The Vision Behind KuttyStory | KuttyStory",
    description: "Discover the founding inspiration behind KuttyStory: empowering young minds across India through imaginative, personalised storytelling.",
    canonical: `${siteUrl}/kuttys-story`,
    h1: "Kutty's Story — Why Every Child Deserves Their Own Adventure",
    h2: "The Story Behind Our Name",
    introCopy: "In Tamil, 'Kutty' means little one — a term of pure affection used by parents and grandparents across South India. KuttyStory was created to celebrate the wonder of childhood.",
    links: [
      { text: "Read About Us", href: "/about" },
      { text: "Explore Books", href: "/stories" }
    ],
    faqs: [],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "Kutty's Story", item: `${siteUrl}/kuttys-story` }
    ]
  },
  {
    path: "/footsteps",
    title: "FootSteps — Celebrating Childhood Milestones | KuttyStory",
    description: "Follow the milestones and creative journey of KuttyStory as we craft personalized keepsakes for children across India.",
    canonical: `${siteUrl}/footsteps`,
    h1: "FootSteps — Celebrating Childhood Milestones",
    h2: "Every Step of the Journey",
    introCopy: "Childhood passes in a blink. FootSteps chronicles the milestones, early reading habits, and cherished moments that shape young minds.",
    links: [
      { text: "Explore Stories", href: "/stories" },
      { text: "Home", href: "/" }
    ],
    faqs: [],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "FootSteps", item: `${siteUrl}/footsteps` }
    ]
  },
  {
    path: "/journal",
    title: "Little Authors Journal & Reader Stories | KuttyStory",
    description: "Read real stories, creative journeys, and family experiences from young readers who became heroes in their own KuttyStory books.",
    canonical: `${siteUrl}/journal`,
    h1: "Little Authors Journal — Stories from Our Young Readers",
    h2: "Showcasing Young Imaginations",
    introCopy: "The Little Authors Journal celebrates our young readers and the joy of bedtime reading across families in India.",
    links: [
      { text: "Explore Story Books", href: "/stories" },
      { text: "Personalize a Book", href: "/stories" }
    ],
    faqs: [],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "Journal", item: `${siteUrl}/journal` }
    ]
  },
  {
    path: "/privacy",
    title: "Privacy Policy & Child Safety | KuttyStory",
    description: "Read our commitment to parental consent, photo deletion rights, and child data protection under DPDP Act at KuttyStory.",
    canonical: `${siteUrl}/privacy`,
    h1: "Privacy Policy & Child Data Protection",
    h2: "Parental Consent & Photo Security",
    introCopy: "At KuttyStory, protecting your child's privacy and photos is our highest priority. We comply with Indian data protection laws and uphold strict ethical AI guidelines.",
    links: [
      { text: "Terms of Service", href: "/terms" },
      { text: "Home", href: "/" }
    ],
    faqs: [],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "Privacy Policy", item: `${siteUrl}/privacy` }
    ]
  },
  {
    path: "/terms",
    title: "Terms & Conditions & Refund Policy | KuttyStory",
    description: "Review KuttyStory terms of service, custom book order terms, reprint guarantees, and refund guidelines.",
    canonical: `${siteUrl}/terms`,
    h1: "Terms & Conditions of Service",
    h2: "Custom Orders & Reprint Guarantees",
    introCopy: "Welcome to KuttyStory. These terms govern your orders of personalized storybooks, digital downloads, and keepsake hardcovers.",
    links: [
      { text: "Reprint & Cancellation Policy", href: "/terms#refund-policy" },
      { text: "Privacy Policy", href: "/privacy" }
    ],
    faqs: [],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "Terms of Service", item: `${siteUrl}/terms` }
    ]
  },
  {
    path: "/personalize/unicorn-story",
    title: "Personalised Fairytale & Adventure Story Book for Kids | KuttyStory",
    description: "Personalise 'The Girl and the Magical Unicorn' with your child's name and photo. An enchanting illustrated story for kids aged 3-8.",
    canonical: `${siteUrl}/personalize/unicorn-story`,
    h1: "The Girl and the Magical Unicorn — Personalised Story Book for Kids",
    h2: "About This Personalised Story",
    introCopy: "Join an enchanting personalized adventure with a gentle white unicorn, exploring secret meadows, helping a fledgling bird, and discovering the courage of true friendship.",
    isProduct: true,
    product: {
      name: "The Girl and the Magical Unicorn",
      slug: "unicorn-story",
      description: "Join an enchanting personalized adventure with a gentle white unicorn, exploring secret meadows, helping a fledgling bird, and discovering the courage of true friendship.",
      image: `${siteUrl}/unicorn_cover.png`,
      pricePrint: 1399,
      priceDigital: 799,
      category: "Fairytale & Adventure",
      ageRange: "Ages 3-8"
    },
    links: [
      { text: "Browse All Stories", href: "/stories" },
      { text: "How Personalisation Works", href: "/how-it-works" },
      { text: "Birthday Gifts for Kids", href: "/stories#birthday-gifts" }
    ],
    faqs: [
      { q: "What age range is 'The Girl and the Magical Unicorn' best suited for?", a: "This fairytale is crafted for children aged 3 to 8 years, with engaging dialogue and vibrant illustrations." },
      { q: "Can I preview the book with my child's name before purchasing?", a: "Yes! Enter your child's name and upload their photo to preview the opening pages in our 3D flipbook." },
      { q: "What is included with the Hardcover edition?", a: "The Hardcover Keepsake includes an archival 8×8 inch matte-laminated book, free doorstep delivery across India, and instant access to the digital PDF edition." }
    ],
    breadcrumbs: [
      { name: "Home", item: `${siteUrl}/` },
      { name: "Stories", item: `${siteUrl}/stories` },
      { name: "The Girl and the Magical Unicorn", item: `${siteUrl}/personalize/unicorn-story` }
    ]
  }
];

function buildLdJsonScript(obj) {
  return `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2)}\n</script>`;
}

console.log(`[Prerender] Starting build-time prerendering for ${routes.length} public routes...`);
console.log(`[Prerender] Target URL: ${siteUrl} | Indexable: ${isIndexable}`);

for (const r of routes) {
  let html = baseTemplate;

  // 1. Insert <title>
  html = html.replace("<head>", `<head>\n  <title>${r.title}</title>`);

  // 2. Prepare head tags
  const canonicalTag = isIndexable && !siteUrl.includes("demo.")
    ? `<link rel="canonical" href="${r.canonical}" />`
    : "";

  const metaTags = `
    <meta name="description" content="${r.description}" />
    <meta name="robots" content="${robotsContent}" />
    ${canonicalTag}
    <meta property="og:title" content="${r.title}" />
    <meta property="og:description" content="${r.description}" />
    <meta property="og:url" content="${r.canonical}" />
    <meta property="og:image" content="${siteUrl}/unicorn_cover.png" />
    <meta property="og:type" content="${r.isProduct ? 'product' : 'website'}" />
    <meta property="og:site_name" content="KuttyStory" />
    <meta property="og:locale" content="en_IN" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${r.title}" />
    <meta name="twitter:description" content="${r.description}" />
    <meta name="twitter:image" content="${siteUrl}/unicorn_cover.png" />
  `;

  // 3. Assemble JSON-LD Schemas
  const schemas = [organizationSchema, webSiteSchema];

  if (r.breadcrumbs && r.breadcrumbs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": r.breadcrumbs.map((b, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": b.name,
        "item": b.item
      }))
    });
  }

  if (r.faqs && r.faqs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": r.faqs.map((f) => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a
        }
      }))
    });
  }

  if (r.isProduct && r.product) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Product",
      "name": r.product.name,
      "image": r.product.image,
      "description": r.product.description,
      "category": r.product.category,
      "brand": {
        "@type": "Brand",
        "name": "KuttyStory"
      },
      "offers": [
        {
          "@type": "Offer",
          "name": "Digital Illustrated Edition (PDF)",
          "price": String(r.product.priceDigital),
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
          "url": `${siteUrl}/personalize/${r.product.slug}`
        },
        {
          "@type": "Offer",
          "name": "Premium Hardcover Keepsake",
          "price": String(r.product.pricePrint),
          "priceCurrency": "INR",
          "availability": "https://schema.org/InStock",
          "url": `${siteUrl}/personalize/${r.product.slug}`
        }
      ]
    });
  }

  const schemaHtml = schemas.map(buildLdJsonScript).join("\n");

  // Inject meta and schemas right before </head>
  html = html.replace("</head>", `${metaTags}\n${schemaHtml}\n</head>`);

  // 4. Construct Pre-rendered Semantic HTML for <div id="root">
  const linksHtml = r.links
    .map((l) => `<li><a href="${l.href}" class="text-[#C98A84] hover:underline">${l.text}</a></li>`)
    .join("\n");

  const faqsHtml = (r.faqs || [])
    .map(
      (f) => `
        <article class="faq-item py-4 border-b border-[#EBE3D9]">
          <h3 class="font-bold text-lg text-[#2D222A]">${f.q}</h3>
          <p class="mt-2 text-sm text-[#4E424B] leading-relaxed">${f.a}</p>
        </article>
      `
    )
    .join("\n");

  const prerenderedBody = `
    <main class="prerendered-content max-w-5xl mx-auto px-4 py-8">
      <header class="mb-8">
        <h1 class="text-3xl sm:text-4xl font-bold text-[#2D222A] mb-4">${r.h1}</h1>
        <h2 class="text-xl sm:text-2xl font-semibold text-[#695B64]">${r.h2}</h2>
      </header>
      <section class="prose max-w-none text-base text-[#4E424B] leading-relaxed mb-8">
        <p>${r.introCopy}</p>
      </section>
      ${
        r.isProduct && r.product
          ? `
        <section class="product-summary p-6 bg-[#FAF7F2] rounded-2xl border border-[#EBE3D9] mb-8">
          <h2 class="text-xl font-bold text-[#2D222A] mb-2">${r.product.name}</h2>
          <p class="text-sm text-[#695B64] mb-4">${r.product.description}</p>
          <div class="flex flex-wrap gap-4 text-sm font-semibold">
            <span class="px-3 py-1 bg-white rounded-lg border border-[#EBE3D9]">Digital Edition: ₹${r.product.priceDigital}</span>
            <span class="px-3 py-1 bg-[#C98A84] text-white rounded-lg">Hardcover Keepsake: ₹${r.product.pricePrint}</span>
            <span class="px-3 py-1 bg-white rounded-lg border border-[#EBE3D9]">${r.product.ageRange}</span>
          </div>
        </section>
      `
          : ""
      }
      <nav aria-label="Explore Related Pages" class="my-6">
        <h3 class="font-bold text-sm uppercase tracking-wider text-[#695B64] mb-3">Quick Navigation</h3>
        <ul class="flex flex-wrap gap-4 text-sm">
          ${linksHtml}
        </ul>
      </nav>
      ${
        r.faqs && r.faqs.length > 0
          ? `
        <section class="faq-section mt-12 pt-8 border-t border-[#EBE3D9]">
          <h2 class="text-2xl font-bold text-[#2D222A] mb-6">Frequently Asked Questions</h2>
          <div class="space-y-4">
            ${faqsHtml}
          </div>
        </section>
      `
          : ""
      }
    </main>
  `;

  // Inject into #root
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${prerenderedBody}</div>`
  );

  // 5. Determine destination path
  let targetFile;
  if (r.path === "/") {
    targetFile = path.join(distDir, "index.html");
  } else {
    const routeSubDir = path.join(distDir, r.path.replace(/^\//, ""));
    if (!fs.existsSync(routeSubDir)) {
      fs.mkdirSync(routeSubDir, { recursive: true });
    }
    targetFile = path.join(routeSubDir, "index.html");
  }

  fs.writeFileSync(targetFile, html, "utf-8");
  console.log(`✓ Prerendered ${r.path} -> ${path.relative(rootDir, targetFile)}`);
}

console.log("✓ Build-time prerendering completed successfully!");
