/**
 * KuttyStory SEO Route Configuration
 * 
 * Strict white-hat SEO specifications:
 * - Titles: <= 60 characters
 * - Meta descriptions: <= 155 characters
 * - Preferred canonical URLs for duplicates
 * - Open Graph & Twitter Card configurations
 * - Status tags: "verbatim" (prescribed by audit pack) or "derived" (crafted to match)
 */

export interface SeoRouteConfig {
  path: string;
  canonicalPath: string; // The preferred canonical path (e.g. /stories for /storybooks)
  title: string;
  description: string;
  h1: string;
  status: "verbatim" | "derived";
  keywords?: string[];
  ogType?: "website" | "article" | "book" | "product";
  ogImage?: string;
  noindex?: boolean;
}

export const DEFAULT_OG_IMAGE = "/logo.png";
export const SITE_NAME = "KuttyStory";
export const LOCALE = "en_IN";

export const SEO_ROUTES: Record<string, SeoRouteConfig> = {
  // 1. Homepage
  "/": {
    path: "/",
    canonicalPath: "/",
    title: "Personalised Story Books for Kids in India | KuttyStory",
    description: "Make your child the hero of a personalised story book. Explore stories made with their name and photo and find a thoughtful birthday gift for kids.",
    h1: "Personalised Story Books for Kids — Your Child Is the Hero",
    status: "verbatim",
    keywords: [
      "personalised story books for kids",
      "personalised books for kids",
      "personalised story books India",
      "birthday gifts for kids",
      "unique birthday gifts for kids"
    ],
    ogType: "website",
    ogImage: "/unicorn_cover.png"
  },
  "/home": {
    path: "/home",
    canonicalPath: "/",
    title: "Personalised Story Books for Kids in India | KuttyStory",
    description: "Make your child the hero of a personalised story book. Explore stories made with their name and photo and find a thoughtful birthday gift for kids.",
    h1: "Personalised Story Books for Kids — Your Child Is the Hero",
    status: "verbatim",
    ogType: "website"
  },

  // 2. Storybooks / Stories Catalog
  "/stories": {
    path: "/stories",
    canonicalPath: "/stories",
    title: "Personalised Kids Story Books Online | KuttyStory",
    description: "Explore personalised story books for children. Choose an age-appropriate adventure, add your child's name and photo, and make story time truly theirs.",
    h1: "Explore Personalised Story Books for Kids",
    status: "verbatim",
    keywords: [
      "personalised kids story books online",
      "custom story book for kids",
      "buy personalised story books online",
      "kids story books online",
      "children's story books online India"
    ],
    ogType: "website",
    ogImage: "/unicorn_cover.png"
  },
  "/storybooks": {
    path: "/storybooks",
    canonicalPath: "/stories",
    title: "Personalised Kids Story Books Online | KuttyStory",
    description: "Explore personalised story books for children. Choose an age-appropriate adventure, add your child's name and photo, and make story time truly theirs.",
    h1: "Explore Personalised Story Books for Kids",
    status: "verbatim",
    ogType: "website"
  },

  // 3. How It Works
  "/how-it-works": {
    path: "/how-it-works",
    canonicalPath: "/how-it-works",
    title: "How Personalised Story Books Work | KuttyStory",
    description: "See how KuttyStory turns a child's name and photo into an illustrated adventure. Learn how to choose a story, check the preview and place an order.",
    h1: "How to Create Your Child's Personalised Story Book",
    status: "verbatim",
    keywords: [
      "how personalised story books work",
      "storybook with child's name",
      "book with my child's picture",
      "personalised story book with name and photo",
      "create a kids book from a photo"
    ],
    ogType: "website",
    ogImage: "/card_step_1_transparent.png"
  },

  // 4. About Us
  "/about": {
    path: "/about",
    canonicalPath: "/about",
    title: "About KuttyStory | Personalised Books for Kids",
    description: "Meet KuttyStory, the personalised children's book brand that helps kids become the heroes of their own illustrated adventures.",
    h1: "About KuttyStory",
    status: "verbatim",
    keywords: [
      "about KuttyStory",
      "personalised books for kids",
      "personalised story books Tamil Nadu",
      "kids story books Tiruchirappalli"
    ],
    ogType: "website",
    ogImage: "/logo.png"
  },

  // 5. Collections & Gift Sets (Derived - Review Needed)
  "/collections": {
    path: "/collections",
    canonicalPath: "/collections",
    title: "Heirloom Book Collections & Gift Sets | KuttyStory",
    description: "Discover heirloom book collections, luxury keepsake box sets, and thoughtful birthday return gifts for children, crafted for lasting family memories.",
    h1: "Heirloom Collections & Birthday Return Gifts",
    status: "derived",
    keywords: [
      "birthday return gifts for kids",
      "personalised birthday return gifts",
      "bulk personalised kids books",
      "keepsake birthday gifts",
      "personalised story books Tamil Nadu"
    ],
    ogType: "website",
    ogImage: "/unicorn_cover.png"
  },

  // 6. Kutty's Story (Derived - Review Needed)
  "/kuttys-story": {
    path: "/kuttys-story",
    canonicalPath: "/kuttys-story",
    title: "The Story Behind KuttyStory | Children's Books",
    description: "Read how KuttyStory turns everyday childhood moments into cherished illustrated fairy tales, honoring every child's courage, wonder, and imagination.",
    h1: "The Story of KuttyStory — Celebrating Childhood",
    status: "derived",
    ogType: "website",
    ogImage: "/logo.png"
  },
  "/kuttysstory": {
    path: "/kuttysstory",
    canonicalPath: "/kuttys-story",
    title: "The Story Behind KuttyStory | Children's Books",
    description: "Read how KuttyStory turns everyday childhood moments into cherished illustrated fairy tales, honoring every child's courage, wonder, and imagination.",
    h1: "The Story of KuttyStory — Celebrating Childhood",
    status: "derived",
    ogType: "website"
  },

  // 7. FootSteps Milestones (Derived - Review Needed)
  "/footsteps": {
    path: "/footsteps",
    canonicalPath: "/footsteps",
    title: "FootSteps Milestone Books for Kids | KuttyStory",
    description: "Capture your child's magical milestones with custom keepsake books. Celebrate first steps, early words, and growing moments in an illustrated story.",
    h1: "FootSteps — Celebrating Childhood Milestones",
    status: "derived",
    keywords: [
      "1st birthday gift for baby",
      "story books for 2 year olds",
      "keepsake birthday gifts",
      "customised gifts for children"
    ],
    ogType: "website",
    ogImage: "/footsteps-hero-illustration.jpg"
  },
  "/foot-steps": {
    path: "/foot-steps",
    canonicalPath: "/footsteps",
    title: "FootSteps Milestone Books for Kids | KuttyStory",
    description: "Capture your child's magical milestones with custom keepsake books. Celebrate first steps, early words, and growing moments in an illustrated story.",
    h1: "FootSteps — Celebrating Childhood Milestones",
    status: "derived",
    ogType: "website"
  },

  // 8. Little Authors Journal (Derived - Review Needed)
  "/journal": {
    path: "/journal",
    canonicalPath: "/journal",
    title: "Little Authors Journal & Reader Stories | KuttyStory",
    description: "Explore real stories and creative moments from our little authors across India. See how children celebrate reading when they become the story hero.",
    h1: "Little Authors Showcase & Real Family Stories",
    status: "derived",
    ogType: "website",
    ogImage: "/logo.png"
  },

  // 9. Privacy Policy (Derived - Review Needed)
  "/privacy": {
    path: "/privacy",
    canonicalPath: "/privacy",
    title: "Privacy Policy & Child Safety Charter | KuttyStory",
    description: "Learn how KuttyStory protects your family's privacy. We treat children's photos as sacred, with strict zero-training policies and secure encrypted data.",
    h1: "Child Privacy Charter & Privacy Policy",
    status: "derived",
    ogType: "website"
  },
  "/privacy-policy": {
    path: "/privacy-policy",
    canonicalPath: "/privacy",
    title: "Privacy Policy & Child Safety Charter | KuttyStory",
    description: "Learn how KuttyStory protects your family's privacy. We treat children's photos as sacred, with strict zero-training policies and secure encrypted data.",
    h1: "Child Privacy Charter & Privacy Policy",
    status: "derived",
    ogType: "website"
  },

  // 10. Terms and Conditions (Derived - Review Needed)
  "/terms": {
    path: "/terms",
    canonicalPath: "/terms",
    title: "Terms of Service & Order Policy | KuttyStory",
    description: "Read the KuttyStory terms of service, ordering conditions, digital delivery guidelines, and print specifications for our personalized children's books.",
    h1: "Terms of Service & Order Guidelines",
    status: "derived",
    ogType: "website"
  },
  "/terms-and-conditions": {
    path: "/terms-and-conditions",
    canonicalPath: "/terms",
    title: "Terms of Service & Order Policy | KuttyStory",
    description: "Read the KuttyStory terms of service, ordering conditions, digital delivery guidelines, and print specifications for our personalized children's books.",
    h1: "Terms of Service & Order Guidelines",
    status: "derived",
    ogType: "website"
  },

  // 11. Personalize root redirect / fallthrough
  "/personalize": {
    path: "/personalize",
    canonicalPath: "/stories",
    title: "Personalise Your Child's Story Book | KuttyStory",
    description: "Choose a story and personalise it with your child's name and likeness for an unforgettable reading adventure.",
    h1: "Personalise Your Child's Story Book",
    status: "derived",
    ogType: "website"
  }
};

/**
 * Helper to build dynamic SEO config for product pages: /personalize/:slug
 */
export function getProductSeoConfig(story: {
  title: string;
  category?: string;
  description?: string;
  slug: string;
  cover_image_url?: string;
}): SeoRouteConfig {
  const theme = story.category ? story.category.split("&")[0].trim() : "Adventure";
  const title = `Personalised ${theme} Story Book for Kids | KuttyStory`.slice(0, 60);
  const h1 = `${story.title} — Personalised Story Book for Kids`;
  const description = (story.description
    ? `Make your child the hero of ${story.title}. Custom name, photo likeness, and enchanting storytelling. Order a print-ready or hardcover keepsake.`
    : `Personalise ${story.title} with your child's name and photo likeness for a magical keepsake storybook.`
  ).slice(0, 155);

  return {
    path: `/personalize/${story.slug}`,
    canonicalPath: `/personalize/${story.slug}`,
    title,
    description,
    h1,
    status: "verbatim",
    ogType: "product",
    ogImage: story.cover_image_url || "/unicorn_cover.png",
    keywords: [
      `personalised ${theme.toLowerCase()} story book`,
      `custom ${story.title.toLowerCase()}`,
      "personalised story book with name and photo",
      "buy personalised story books online"
    ]
  };
}

