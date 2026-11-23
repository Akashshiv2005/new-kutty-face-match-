import { Link } from "react-router-dom";
import {
  Sparkles,
  BookOpen,
  Camera,
  Cpu,
  Eye,
  PackageCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Printer,
  Sparkle,
  Image as ImageIcon,
  Check,
  X
} from "lucide-react";
import Seo from "@/seo/Seo";
import { SEO_ROUTES } from "@/seo/routes";
import { getBreadcrumbSchema } from "@/seo/schema";
import FaqSection from "@/components/FaqSection";
import { HOW_IT_WORKS_FAQS } from "@/seo/faqs";

interface StepItem {
  number: string;
  title: string;
  tagline: string;
  description: string;
  icon: any;
  colorBg: string;
  colorText: string;
  details: string[];
}

const STEPS: StepItem[] = [
  {
    number: "01",
    title: "Select Story & Add Dedication",
    tagline: "Choose from our curated realm of fairy tales and adventures",
    description: "Browse our library of classical narrative arcs. Enter your child’s name, age, and write a heartfelt dedication letter that will be typeset on the last Page as a lifelong keepsake.",
    icon: BookOpen,
    colorBg: "bg-[#FAEEED]",
    colorText: "text-[#C98A84]",
    details: [
      "Select favorite theme: Fairytale, Dragon, Ocean, or Forest",
      "Typeset custom parent, grandparent, or godparent dedication",
      "Choose hardcover or digital instant PDF edition"
    ]
  },
  {
    number: "02",
    title: "Upload a Single Reference Photo",
    tagline: "One clear smartphone photo is all the atelier requires",
    description: "Simply snap or choose a well-lit photo of your child looking toward the camera. Our built-in guardian privacy validator ensures optimal angle, lighting, and composition.",
    icon: Camera,
    colorBg: "bg-[#F2EEF7]",
    colorText: "text-[#B8A9C9]",
    details: [
      "No studio shoot required — smartphone photos work beautifully",
      "Instant face validation check for sharp lighting and angles",
      "Encrypted in-memory processing with strict zero-training privacy"
    ]
  },
  {
    number: "03",
    title: "Character Consistency & Story Painting",
    tagline: "Transforming facial features into timeless art",
    description: "Our fine-tuned generative pipeline gently maps your child's distinctive eye shape, smile, and facial structure into the story's painterly illustration style across all 24 pages.",
    icon: Cpu,
    colorBg: "bg-[#EEF4ED]",
    colorText: "text-[#8F9E8B]",
    details: [
      "No uncanny cutouts: seamless watercolor painterly integration",
      "Consistent character likeness across close-ups and action scenes",
      "Adheres strictly to traditional children's book aesthetic guidelines"
    ]
  },
  {
    number: "04",
    title: "Interactive Flipbook Preview",
    tagline: "Turn the virtual pages before a single drop of ink is printed",
    description: "Review every spread of your child's book in our interactive 3D viewer. Read the poetry, inspect the illustrations, and verify every dedication detail with complete confidence.",
    icon: Eye,
    colorBg: "bg-[#FAF5E8]",
    colorText: "text-[#C5A059]",
    details: [
      "Instant full-bleed inspection of 5 illustrated pages"
    ]
  },
  {
    number: "05",
    title: "Archival Print & Delivery Across India",
    tagline: "Master bookbinding delivered to your family doorstep",
    description: "Your book is typeset using our deterministic ReportLab engine at 8×8 inch (203×203 mm), printed on archival 170gsm silk paper, bound in hardcover, and hand-wrapped in luxury presentation packaging.",
    icon: PackageCheck,
    colorBg: "bg-[#FAEEED]",
    colorText: "text-[#C98A84]",
    details: [
      "8×8 inch square hardcover with protective matte laminate",
      "Smyth-sewn lie-flat binding built to survive enthusiastic bedtime hands",
      "Delivered in a presentation box with tracked express shipping across India"
    ]
  }
];

export default function HowItWorksPage() {
  return (
    <div className="pb-24">
      {/* Search Engine Optimization & Structured Data */}
      <Seo
        config={SEO_ROUTES["/how-it-works"]}
        schemas={[
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "How It Works", path: "/how-it-works" }
          ])
        ]}
      />

      {/* 1. Header */}
      <section className="bg-gradient-to-b from-[#FAEEED]/40 via-[#FAF7F2] to-[#FAF7F2] pt-14 pb-18 px-4 sm:px-6 lg:px-8 border-b border-[#EBE3D9]">
        <div className="max-w-5xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#C98A84]/30 text-xs font-semibold text-[#C98A84] shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Atelier Process</span>
          </div>

          <h1 className="font-hero-heading text-3xl sm:text-5xl lg:text-6xl font-bold text-[#2D222A] tracking-tight">
            How to Create Your Child's Personalised Story Book
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#695B64] leading-relaxed">
            See how KuttyStory turns a child's name and photo into an illustrated adventure. Learn how to choose a story, check the preview and place an order. Discover how easily everyday smartphone photos become cherished hardcover keepsakes.
          </p>

          <div className="pt-2">
            <Link
              to="/stories"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <span>Explore Story Books</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Five Step Journey Walkthrough */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10">
        <div className="space-y-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="bg-white rounded-3xl p-6 sm:p-10 border border-[#EBE3D9] shadow-xs hover:border-[#C98A84]/40 transition-all grid grid-cols-1 md:grid-cols-12 gap-8 items-center"
              >
                {/* Step Number & Icon */}
                <div className="md:col-span-4 flex flex-col justify-between space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="font-editorial-serif text-4xl sm:text-5xl font-bold text-[#C98A84]/40">
                      {step.number}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl ${step.colorBg} flex items-center justify-center ${step.colorText}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-editorial-serif text-2xl font-bold text-[#2D222A]">
                      {step.title}
                    </h3>
                    <p className="text-xs text-[#C98A84] font-medium mt-1">
                      {step.tagline}
                    </p>
                  </div>
                </div>

                {/* Step Description & Checklist */}
                <div className="md:col-span-8 space-y-4 md:border-l md:border-[#EBE3D9] md:pl-8">
                  <p className="text-xs sm:text-sm text-[#695B64] leading-relaxed">
                    {step.description}
                  </p>

                  <div className="space-y-2 pt-2">
                    {step.details.map((detail, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs text-[#2D222A]">
                        <CheckCircle2 className="w-4 h-4 text-[#8F9E8B] shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Photo Guide Visual Tips */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-[#FAF7F2] rounded-3xl p-8 sm:p-12 border border-[#EBE3D9] space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C98A84]">
              Photography Guidance
            </span>
            <h3 className="font-editorial-serif text-3xl font-bold text-[#2D222A]">
              Taking the Perfect Reference Photo
            </h3>
            <p className="text-xs text-[#695B64]">
              You don’t need a professional photographer. Just keep these simple tips in mind!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What Works Great */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#EEF4ED] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4E7048]">
                <Check className="w-4 h-4 text-[#4E7048]" />
                <span>What Works Wonderfully</span>
              </div>
              <ul className="space-y-3 text-xs text-[#695B64]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                  <span>Bright, natural room daylight or gentle outdoor morning light.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                  <span>Face clearly visible, looking forward or slightly angled at eye-level.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                  <span>Happy or serene expression showing their everyday personality.</span>
                </li>
              </ul>
            </div>

            {/* What to Avoid */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#FAEEED] shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C98A84]">
                <X className="w-4 h-4 text-[#C98A84]" />
                <span>What to Avoid</span>
              </div>
              <ul className="space-y-3 text-xs text-[#695B64]">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-[#C98A84] shrink-0 mt-0.5" />
                  <span>Heavy shadows, strong flash glare, or dark room lighting.</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-[#C98A84] shrink-0 mt-0.5" />
                  <span>Accessories covering facial landmarks (sunglasses, large hats, pacifiers).</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-[#C98A84] shrink-0 mt-0.5" />
                  <span>Blurry, low-resolution screenshots from social media.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Frequently Asked Questions Accordion with FAQPage Schema */}
      <FaqSection
        id="how-it-works-faq"
        title="Frequently Asked Questions About Personalisation"
        subtitle="Everything you need to know about photo uploads, flipbook previews, and privacy."
        items={HOW_IT_WORKS_FAQS}
        className="mt-12"
      />

      {/* 5. Direct Call to Action */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-24">
        <div className="bg-gradient-to-r from-[#FAEEED] via-[#FAF7F2] to-[#EEF4ED] rounded-3xl p-8 sm:p-12 border border-[#EBE3D9] text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white text-xs font-semibold text-[#C98A84] shadow-xs">
            <Sparkle className="w-3.5 h-3.5" />
            <span>Ready in under 2 minutes</span>
          </div>

          <h3 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
            Begin Your Child’s Storybook Journey
          </h3>

          <p className="text-xs sm:text-sm text-[#695B64] max-w-xl mx-auto">
            Choose a story from our catalog, upload a photo, and watch their personalized book come to life.
          </p>

          <div>
            <Link
              to="/stories"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs sm:text-sm font-semibold shadow-md transition-all"
            >
              <span>Personalize A Storybook</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
