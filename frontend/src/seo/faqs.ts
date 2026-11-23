import { FaqItem } from "./schema";

export const ALL_VERIFIED_FAQS: FaqItem[] = [
  {
    question: "How does KuttyStory personalise a book with my child's name and photo?",
    answer:
      "You enter your child's name, choose their age, and upload a single clear photo with guardian consent. Our character-consistent generative pipeline weaves your child's features into an illustrated storybook adventure, creating a timeless keepsake."
  },
  {
    question: "What kind of photo should I upload for the best result?",
    answer:
      "A simple, well-lit smartphone photo taken at eye level works best. Ensure your child's face is clearly visible without heavy shadows, sunglasses, hats, or other individuals in the frame."
  },
  {
    question: "Is my child's photograph safe and private?",
    answer:
      "Yes, child privacy is our highest priority. Uploaded photos are stored in secure encrypted storage, used exclusively to render your ordered storybook, and never shared, sold, or used to train public AI models."
  },
  {
    question: "What age range are KuttyStory books suitable for?",
    answer:
      "Our stories are tailored primarily for children aged 3 to 8 years old, featuring engaging storytelling, age-appropriate themes, and vibrant illustrations suitable for both bedtime reading and early readers."
  },
  {
    question: "Can I preview the full story before paying?",
    answer:
      "Yes! Once your child's likeness is generated, you can inspect the story spreads in our interactive 3D virtual flipbook before proceeding to payment."
  },
  {
    question: "What formats are available for the storybooks?",
    answer:
      "We offer two formats: a high-resolution, print-ready Digital PDF edition for instant download, and a premium 8×8 inch hardbound physical keepsake printed on 170gsm silk paper."
  },
  {
    question: "How much do the personalised storybooks cost?",
    answer:
      "We offer two formats: an instant digital PDF download and a premium 8×8 inch hardbound keepsake. Pricing is based on the updated rates set by admin in our catalog, with no hidden setup fees."
  },
  {
    question: "How long does delivery take for physical hardcover books?",
    answer:
      "Digital PDFs are delivered immediately for instant download upon generation. Physical hardcover editions are custom printed and delivered in 10 to 15 days across all over India, depending on the delivery partner."
  },
  {
    question: "Can I order personalised storybooks in Tamil?",
    answer:
      "KuttyStory is proudly rooted in Tiruchirappalli, Tamil Nadu. Our primary catalog is currently published in English, with Tamil language editions currently in active development for select titles."
  },
  {
    question: "Can I order personalised books as birthday return gifts in bulk?",
    answer:
      "Yes! Personalised storybooks make memorable, meaningful birthday return gifts. For bulk celebration orders and group party requests, please reach out via our contact page or WhatsApp for custom coordination."
  },
  {
    question: "Can I include a personal dedication in the book?",
    answer:
      "Yes. You can write a personal dedication message from parents, grandparents, or family members that is permanently printed in the book."
  },
  {
    question: "What is your reprint or cancellation policy?",
    answer:
      "Because each storybook is custom-crafted for an individual child, orders cannot be cancelled once digital rendering begins. However, if your book arrives with any printing defect or shipping damage, we provide a free replacement reprint."
  },
  {
    question: "Who writes the stories and creates the artwork?",
    answer:
      "Our narratives are crafted by children's authors and developmental educators, paired with our proprietary illustration engine to produce gentle, classical watercolor aesthetics without uncanny cutouts."
  },
  {
    question: "Can I create a book featuring two siblings together?",
    answer:
      "Currently, each storybook is structured around one hero child to ensure strong character consistency and narrative focus. We recommend creating an individual adventure for each child."
  },
  {
    question: "How do I make payment on KuttyStory?",
    answer:
      "We accept all major Indian payment methods through our secure Razorpay gateway, including UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and net banking."
  }
];

// Subsets for specific pages
export const HOMEPAGE_FAQS: FaqItem[] = [
  ALL_VERIFIED_FAQS[0], // How it works
  ALL_VERIFIED_FAQS[2], // Privacy
  ALL_VERIFIED_FAQS[3], // Age range
  ALL_VERIFIED_FAQS[4], // Preview flipbook
  ALL_VERIFIED_FAQS[5], // Formats
  ALL_VERIFIED_FAQS[9]  // Return gifts
];

export const STORIES_BIRTHDAY_FAQS: FaqItem[] = [
  {
    question: "Why does a personalised storybook make a great birthday gift?",
    answer:
      "Unlike generic toys that are quickly outgrown, a personalised storybook makes the child the brave hero of their own adventure. It builds reading excitement and serves as a lasting keepsake that families treasure for years."
  },
  {
    question: "Can I add a custom birthday dedication message?",
    answer:
      "Yes! You can include a heartfelt birthday message from parents, grandparents, aunt, or uncle that is printed right inside the book."
  },
  {
    question: "How far in advance should I order for a birthday?",
    answer:
      "For instant digital PDF gifts, generation takes only minutes. For our physical hardcover keepsake, we recommend ordering at least 7 to 10 days before the celebration to allow for custom printing and tracked courier transit."
  }
];

export const HOW_IT_WORKS_FAQS: FaqItem[] = [
  ALL_VERIFIED_FAQS[0], // How it works
  ALL_VERIFIED_FAQS[1], // Photo tips
  ALL_VERIFIED_FAQS[2], // Privacy
  ALL_VERIFIED_FAQS[4], // Preview
  ALL_VERIFIED_FAQS[11] // Reprint policy
];

export const PRODUCT_PAGE_FAQS: FaqItem[] = [
  ALL_VERIFIED_FAQS[1], // Photo guidelines
  ALL_VERIFIED_FAQS[4], // Preview flipbook
  ALL_VERIFIED_FAQS[5], // Formats
  ALL_VERIFIED_FAQS[11] // Reprint policy
];

