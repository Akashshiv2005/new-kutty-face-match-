import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Search,
  Filter,
  BookOpen,
  ArrowRight,
  Gift,
  CheckCircle,
  Eye,
  X,
  Heart,
  SlidersHorizontal,
  ChevronDown,
  UserCheck,
  Star
} from "lucide-react";
import { api, StoryTemplate, isLogoStory } from "@/lib/api";
import { HardcoverBook } from "@/components/HardcoverBook";
import { StoryReaderModal } from "@/components/StoryReaderModal";
import Seo from "@/seo/Seo";
import { SEO_ROUTES } from "@/seo/routes";
import { getBreadcrumbSchema } from "@/seo/schema";
import FaqSection from "@/components/FaqSection";
import { STORIES_BIRTHDAY_FAQS } from "@/seo/faqs";
import { trackViewItemList, trackSelectItem } from "@/lib/analytics";

interface StoryCatalogItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  age_range: string;
  min_age: number;
  max_age: number;
  target_gender: string;
  page_count: number;
  price_digital: number;
  price_print: number;
  description: string;
  cover_image_url: string;
  rating: number;
  review_count: number;
  tag?: string | null;
  is_live: boolean;
  sample_spreads: {
    page: number;
    title: string;
    text: string;
    scene: string;
  }[];
  rawTemplate: StoryTemplate;
}

function formatCategory(cat?: string): string {
  if (!cat) return "Adventure";
  if (cat === cat.toUpperCase()) {
    return cat.charAt(0) + cat.slice(1).toLowerCase();
  }
  return cat;
}

function parseAgeRange(ageRange?: string, minAge?: number, maxAge?: number) {
  let min = minAge || 3;
  let max = maxAge || 7;
  if (ageRange) {
    const matches = ageRange.match(/(\d+)\s*[-–to]\s*(\d+)/i);
    if (matches) {
      min = parseInt(matches[1], 10);
      max = parseInt(matches[2], 10);
    }
  }
  return { min, max };
}

const DEFAULT_TAGS = ["Personalised", "Fairytale", "Adventure", "Keepsake", "Bedtime"];

function mapTemplateToCatalogItem(template: StoryTemplate, index: number): StoryCatalogItem {
  let sampleSpreads: StoryCatalogItem["sample_spreads"] = [];
  if (template.pages && template.pages.length > 0) {
    const textPages = template.pages.filter(
      (p) => p.page_type !== "cover" && (p.story_text || p.extracted_text)
    );
    const selected = textPages.length >= 2 ? textPages.slice(0, 3) : template.pages.slice(0, 3);
    if (selected.length > 0) {
      sampleSpreads = selected.map((p) => ({
        page: p.page_number,
        title: `Page ${p.page_number} Spread`,
        text: (p.story_text || p.extracted_text || `Scene illustration for ${template.title}`).replace(
          /\[Name\]|\{name\}|\[child_name\]|\{child_name\}/g,
          "your child"
        ),
        scene: p.scene_description || `Illustrated personalized story scene from ${template.title}.`
      }));
    }
  }

  if (sampleSpreads.length === 0) {
    sampleSpreads = [
      {
        page: 1,
        title: "The Adventure Begins",
        text: `One beautiful morning, your child steps into the magical realm of ${template.title}.`,
        scene: `Opening story spread illustration for ${template.title}.`
      },
      {
        page: Math.floor((template.page_count || 24) / 2),
        title: "The Heart of the Journey",
        text: "With curiosity and wonder, an extraordinary discovery awaits along the golden path.",
        scene: "A breathtaking full-bleed illustration celebrating courage and friendship."
      }
    ];
  }

  const { min, max } = parseAgeRange(template.age_range, template.min_age, template.max_age);

  return {
    id: template.id,
    slug: template.slug,
    title: template.title,
    category: formatCategory(template.category),
    age_range: template.age_range || `Ages ${min}–${max}`,
    min_age: min,
    max_age: max,
    target_gender: template.target_gender || "both",
    page_count: template.page_count || 24,
    price_digital: template.price_digital || 799,
    price_print: template.price_print || 1399,
    description: template.description || `An enchanting personalized storybook where your child becomes the hero of ${template.title}.`,
    cover_image_url: template.cover_image_url || "/unicorn_cover.png",
    rating: (template as any).rating || 0,
    review_count: (template as any).review_count || 0,
    tag: template.highlight === "best_seller"
      ? "Bestseller"
      : template.highlight === "latest"
        ? "New Release"
        : template.highlight === "popular"
          ? "Popular"
          : template.highlight
            ? template.highlight
            : null,
    is_live: true,
    sample_spreads: sampleSpreads,
    rawTemplate: template
  };
}

const AGE_FILTERS = [
  { label: "All Ages", min: 0, max: 99 },
  { label: "2 - 4 Years", min: 2, max: 4 },
  { label: "4 - 6 Years", min: 4, max: 6 },
  { label: "6 - 8 Years", min: 6, max: 8 },
  { label: "8+ Years", min: 8, max: 99 }
];

export default function StoryBooksPage() {
  const [stories, setStories] = useState<StoryCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Stories");
  const [selectedAge, setSelectedAge] = useState("All Ages");
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<"All" | "Boys" | "Girls">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [readingStory, setReadingStory] = useState<StoryTemplate | null>(null);
  const [defaultPdfPrice, setDefaultPdfPrice] = useState<number>(799);
  const [defaultHardcoverPrice, setDefaultHardcoverPrice] = useState<number>(1399);

  useEffect(() => {
    setLoading(true);
    api.getAnnouncement().then((ann) => {
      if (ann?.default_pdf_price) {
        setDefaultPdfPrice(Number(ann.default_pdf_price));
      }
      if (ann?.default_hardcover_price) {
        setDefaultHardcoverPrice(Number(ann.default_hardcover_price));
      }
    }).catch(() => { });

    api.getStories()
      .then((apiStories: StoryTemplate[]) => {
        if (apiStories && apiStories.length > 0) {
          const bookTemplates = apiStories.filter((s) => !isLogoStory(s));
          const mapped = bookTemplates.map((template, idx) => mapTemplateToCatalogItem(template, idx));
          setStories(mapped);
          trackViewItemList(
            mapped.map((s) => ({
              item_id: s.slug,
              item_name: s.title,
              price: s.price_print || defaultHardcoverPrice,
              item_category: s.category,
            }))
          );
        } else {
          setStories([]);
        }
      })
      .catch((err) => {
        console.error("Error loading stories:", err);
        setStories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    "All Stories",
    ...Array.from(new Set(stories.map((s) => s.category).filter(Boolean)))
  ];

  const filteredStories = stories.filter((story) => {
    const matchesCat =
      selectedCategory === "All Stories" ||
      story.category?.toLowerCase() === selectedCategory.toLowerCase();
    const ageFilter = AGE_FILTERS.find((a) => a.label === selectedAge);
    const matchesAge =
      !ageFilter ||
      selectedAge === "All Ages" ||
      (story.min_age <= ageFilter.max && story.max_age >= ageFilter.min);

    const rawGender = (story.target_gender || "both").toLowerCase().trim();
    const isGirlTarget = rawGender === "girl" || rawGender === "girls" || rawGender === "female";
    const isBoyTarget = rawGender === "boy" || rawGender === "boys" || rawGender === "male";

    // Keyword detection as fallback if story target_gender was left as default "both"
    const titleLower = (story.title || "").toLowerCase();
    const descLower = (story.description || "").toLowerCase();
    const catLower = (story.category || "").toLowerCase();
    const combinedText = `${titleLower} ${descLower} ${catLower}`;

    const hasGirlKeyword = /\b(girl|girls|princess|ballerina|fairy|fairies|unicorn)\b/i.test(combinedText);
    const hasBoyKeyword = /\b(boy|boys|superhero|superheroes|pirate|pirates|prince)\b/i.test(combinedText);

    const matchesGender =
      selectedGenderFilter === "All" ||
      (selectedGenderFilter === "Boys" && (isBoyTarget || (!isGirlTarget && hasBoyKeyword))) ||
      (selectedGenderFilter === "Girls" && (isGirlTarget || (!isBoyTarget && hasGirlKeyword)));

    const matchesSearch =
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesAge && matchesGender && matchesSearch;
  });

  return (
    <div className="pb-24">
      {/* Search Engine Optimization & Structured Data */}
      <Seo
        config={SEO_ROUTES["/stories"]}
        schemas={[
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Stories", path: "/stories" }
          ])
        ]}
      />

      {/* 1. Atelier Header & Introduction */}
      <section className="bg-gradient-to-b from-[#FAEEED]/40 via-[#FAF7F2] to-[#FAF7F2] pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-[#EBE3D9]">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C98A84]/30 text-xs font-medium text-[#C98A84] shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Heirloom Library</span>
          </div>

          <h1 className="font-hero-heading text-3xl sm:text-5xl lg:text-6xl font-bold text-[#2D222A] tracking-tight">
            Explore Personalised Story Books for Kids
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#695B64] leading-relaxed">
            Explore personalised story books for children. Choose an age-appropriate adventure, add your child's name and photo, and make story time truly theirs. Discover personalised books for kids across India, perfect for bedtime reading and memorable birthday gifts.
          </p>

          {/* Quick Anchor Navigation Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 text-xs">
            <a
              href="#birthday-gifts"
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#EBE3D9] hover:border-[#C98A84] text-[#2D222A] hover:text-[#C98A84] transition-colors"
            >
              Birthday Gifts for Kids ↓
            </a>
            <a
              href="#by-age"
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#EBE3D9] hover:border-[#C98A84] text-[#2D222A] hover:text-[#C98A84] transition-colors"
            >
              Story Books by Age ↓
            </a>
            <a
              href="#personalised-gifts"
              className="px-3.5 py-1.5 rounded-full bg-white border border-[#EBE3D9] hover:border-[#C98A84] text-[#2D222A] hover:text-[#C98A84] transition-colors"
            >
              Gifts by Occasion & Family ↓
            </a>
          </div>

          {/* Quick Specifications Strip */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#695B64]">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#8F9E8B]" />
              <span>8 × 8 inch Archival Hardcover</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#8F9E8B]" />
              <span>Heavyweight 170gsm Silk Paper</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#8F9E8B]" />
              <span>Smyth-Sewn Lie-Flat Binding</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#8F9E8B]" />
              <span>Deterministic PDF Proofing</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Search & Filters Bar */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-[#EBE3D9] shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#695B64]" />
              <input
                type="text"
                placeholder="Search by title, theme, or magical creature..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#FAF7F2] border border-[#EBE3D9] text-xs text-[#2D222A] focus:outline-hidden focus:border-[#C98A84] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#695B64] hover:text-[#2D222A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Age Filter Dropdown / Pills */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-xs font-medium text-[#695B64] flex items-center gap-1 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C98A84]" />
                <span>Age:</span>
              </span>
              {AGE_FILTERS.map((age) => (
                <button
                  key={age.label}
                  onClick={() => setSelectedAge(age.label)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${selectedAge === age.label
                    ? "bg-[#2D222A] text-white shadow-xs"
                    : "bg-[#FAF7F2] text-[#695B64] hover:bg-[#F2EEF7]"
                    }`}
                >
                  {age.label}
                </button>
              ))}
            </div>

            {/* Gender Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto shrink-0">
              <span className="text-xs font-medium text-[#695B64] shrink-0">For:</span>
              {(["All", "Boys", "Girls"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGenderFilter((prev) => (prev === g ? "All" : g))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${selectedGenderFilter === g
                    ? "bg-[#C98A84] text-white shadow-xs"
                    : "bg-[#FAF7F2] text-[#695B64] hover:bg-[#F2EEF7]"
                    }`}
                >
                  {g === "All" ? "All Genders" : g === "Boys" ? "👦 Boys" : "👧 Girls"}
                </button>
              ))}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-t border-[#EBE3D9] pt-4 scrollbar-none">
            <span className="text-xs font-medium text-[#695B64] flex items-center gap-1 shrink-0 mr-2">
              <Filter className="w-3.5 h-3.5 text-[#8F9E8B]" />
              <span>Theme:</span>
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${selectedCategory === cat
                  ? "bg-[#C98A84] text-white shadow-xs"
                  : "bg-[#FAF7F2] text-[#695B64] hover:bg-[#FAEEED] hover:text-[#C98A84]"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Catalog Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-editorial-serif text-2xl sm:text-3xl font-bold text-[#2D222A]">
              {selectedCategory}
            </h2>
            <p className="text-xs text-[#695B64] mt-0.5">
              Showing {filteredStories.length} curated master storybook templates
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="editorial-card p-6 bg-white border border-[#EBE3D9] animate-pulse space-y-4">
                <div className="aspect-square bg-[#FAF7F2] rounded-2xl flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-[#EBE3D9]" />
                </div>
                <div className="h-4 bg-[#FAF7F2] rounded w-3/4" />
                <div className="h-3 bg-[#FAF7F2] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#EBE3D9] p-8 space-y-4">
            <BookOpen className="w-12 h-12 text-[#C98A84]/60 mx-auto" />
            <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A]">
              No Storybooks Matched Your Search
            </h3>
            <p className="text-xs text-[#695B64] max-w-md mx-auto">
              Try adjusting your theme filters, age range, or search keywords to explore other magical storybooks in our atelier.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("All Stories");
                setSelectedAge("All Ages");
                setSelectedGenderFilter("All");
                setSearchQuery("");
              }}
              className="px-5 py-2 rounded-full bg-[#C98A84] text-white text-xs font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStories.map((story) => (
              <div
                key={story.id}
                className="editorial-card group flex flex-col justify-between overflow-hidden bg-white border border-[#EBE3D9] hover:border-[#C98A84]/50 transition-all duration-300"
              >
                {/* Book Cover Container — Realistic 3D Hardcover Book Showcase */}
                <div>
                  <div className="relative aspect-square p-5 sm:p-6 bg-gradient-to-b from-[#FDFCFB] via-[#F8F5EE] to-[#EFE8DD] flex items-center justify-center overflow-hidden border-b border-[#EBE3D9]/70">
                    <div className="w-[82%] sm:w-[86%] max-w-[320px] aspect-square flex items-center justify-center mx-auto">
                      <HardcoverBook
                        coverUrl={story.cover_image_url}
                        title={story.title}
                        aspectRatio="square"
                        fallbackSrc="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
                        onClick={() => {
                          setReadingStory(story.rawTemplate);
                        }}
                      >
                        {/* Quick Look Inside Button — matching user reference */}
                        <div className="absolute inset-0 bg-[#2D222A]/20 sm:bg-[#2D222A]/30 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 rounded-r-[7px] rounded-l-[4px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReadingStory(story.rawTemplate);
                            }}
                            className="px-4 py-2.5 rounded-full bg-white text-[#2D222A] hover:text-[#C98A84] text-xs font-semibold shadow-lg transition-transform transform translate-y-1 sm:translate-y-2 group-hover:translate-y-0 group-hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer border border-[#E8DEC8]"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C98A84]" />
                            <span>Read the Full Story</span>
                          </button>
                        </div>
                      </HardcoverBook>
                    </div>

                    {/* Ribbon Tag */}
                    {story.tag && (
                      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#EBE3D9] text-[11px] font-semibold text-[#2D222A] shadow-xs">
                        {story.tag === "Bestseller" ? (
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-[#C98A84]" />
                        )}
                        <span>{story.tag}</span>
                      </div>
                    )}

                    {/* Gender & Age Range Badges */}
                    <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
                      {(story.target_gender || "").toLowerCase().trim() === "boy" && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-600/90 backdrop-blur-md text-[10px] font-bold text-white shadow-xs">
                          👦 Boy Only
                        </span>
                      )}
                      {(story.target_gender || "").toLowerCase().trim() === "girl" && (
                        <span className="px-2.5 py-1 rounded-full bg-pink-600/90 backdrop-blur-md text-[10px] font-bold text-white shadow-xs">
                          👧 Girl Only
                        </span>
                      )}
                      <div className="px-3 py-1 rounded-full bg-[#2D222A]/85 backdrop-blur-md text-[11px] font-medium text-white shadow-xs">
                        {story.age_range}
                      </div>
                    </div>
                  </div>

                  {/* Book Card Content */}
                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#C98A84] font-semibold uppercase tracking-wider">
                        {story.category}
                      </span>
                      <span className="text-[#695B64] flex items-center gap-1 font-medium">
                        <BookOpen className="w-3.5 h-3.5 text-[#C98A84]" />
                        <span>{story.page_count} Pages</span>
                      </span>
                    </div>

                    <h3 className="font-editorial-serif text-2xl font-bold text-[#2D222A] group-hover:text-[#C98A84] transition-colors leading-snug">
                      {story.title}
                    </h3>

                    <p className="text-xs text-[#695B64] leading-relaxed line-clamp-3">
                      {story.description}
                    </p>

                    <div className="text-[11px] text-[#8F9E8B] flex items-center gap-1.5 pt-1">
                      <CheckCircle className="w-3.5 h-3.5 text-[#8F9E8B]" />
                      <span>{story.page_count} Full-Bleed Pages • 8×8 inch Archival Hardcover</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-6 pt-0">
                  <div className="pt-4 border-t border-[#EBE3D9] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[#695B64]">
                        Starting from
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-editorial-serif text-xl font-bold text-[#2D222A]">
                          ₹{story.price_digital ? Number(story.price_digital).toLocaleString("en-IN") : defaultPdfPrice}
                        </span>
                        <span className="text-[11px] text-[#695B64]">Digital</span>
                        <span className="text-[#C98A84] font-medium text-xs">•</span>
                        <span className="text-xs font-medium text-[#695B64]">
                          ₹{story.price_print ? Number(story.price_print).toLocaleString("en-IN") : defaultHardcoverPrice.toLocaleString("en-IN")} Print
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/personalize/${story.slug}`}
                      onClick={() => {
                        trackSelectItem({
                          item_id: story.slug,
                          item_name: story.title,
                          price: story.price_print || defaultHardcoverPrice,
                          item_category: story.category,
                        });
                      }}
                      className="px-4 py-2.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold shadow-xs hover:shadow transition-all flex items-center gap-1.5"
                    >
                      <span>Personalize</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Anchored Section: Birthday & Gifting Intent (#birthday-gifts) */}
      <section id="birthday-gifts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-gradient-to-r from-[#FAEEED]/60 via-[#FAF7F2] to-[#FAF5E8]/60 rounded-3xl p-8 sm:p-14 border border-[#EBE3D9] space-y-10">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#C98A84]/30 text-xs font-semibold text-[#C98A84]">
              <Gift className="w-3.5 h-3.5" />
              <span>Birthday & Keepsake Gifting</span>
            </div>
            <h2 className="font-editorial-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2D222A] tracking-tight">
              Personalised Birthday Gifts for Kids
            </h2>
            <p className="text-sm sm:text-base text-[#695B64] leading-relaxed">
              Searching for meaningful, unique birthday gifts for kids that stand the test of time? Unlike plastic toys that lose their charm in weeks, a personalised birthday story book puts the celebrating child directly into an enchanting illustrated journey. They see their own name, face, and courage save the day.
            </p>
          </div>

          {/* Birthday Ideas by Age */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] shadow-xs space-y-3">
              <div className="text-xs uppercase tracking-widest text-[#C98A84] font-bold">1st & 2nd Birthdays</div>
              <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A]">
                1st Birthday Gift for Baby
              </h3>
              <p className="text-xs text-[#695B64] leading-relaxed">
                A treasured keepsake marking the magical transition from infant to toddler. Gentle rhymes and soothing bedtime pacing meant to be read together in rocking chairs.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] shadow-xs space-y-3">
              <div className="text-xs uppercase tracking-widest text-[#B8A9C9] font-bold">3rd & 4th Birthdays</div>
              <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A]">
                3rd Birthday Gifts for Kids
              </h3>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Picture books for preschoolers entering their prime imaginative years. Vibrant fairytale creatures, wonder-filled landscapes, and early word recognition.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] shadow-xs space-y-3">
              <div className="text-xs uppercase tracking-widest text-[#8F9E8B] font-bold">5th to 8th Birthdays</div>
              <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A]">
                Birthday Gift for 5 Year Old Girl & Boy
              </h3>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Empowering narrative adventures designed for emerging independent readers. Lessons in resilience, kindness, and discovering inner strength.
              </p>
            </div>
          </div>

          {/* Dedicated Birthday FAQs & Party Link */}
          <div className="pt-6 border-t border-[#EBE3D9]">
            <FaqSection
              id="birthday-faqs"
              title="Birthday Gifting Questions"
              subtitle="Common questions about ordering birthday storybooks, custom dedications, and delivery timing."
              items={STORIES_BIRTHDAY_FAQS}
              className="py-0 px-0 sm:px-0"
              includeSchema={false}
            />


          </div>
        </div>
      </section>

      {/* 5. Anchored Section: Books by Age & Milestones (#by-age) */}
      <section id="by-age" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="text-xs uppercase tracking-widest text-[#C98A84] font-semibold">Developmental Growth</div>
          <h2 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
            Personalised Story Books by Age
          </h2>
          <p className="text-xs sm:text-sm text-[#695B64]">
            Carefully paced stories adapted to your child's developmental reading stage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-[#EBE3D9] shadow-xs space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAEEED] text-xs font-bold text-[#C98A84]">
              Ages 2 to 4 Years
            </div>
            <h3 className="font-editorial-serif text-2xl font-bold text-[#2D222A]">
              Picture Books for Preschoolers & Toddlers
            </h3>
            <p className="text-xs sm:text-sm text-[#695B64] leading-relaxed">
              Designed specifically as story books for 2 year olds and preschoolers. Features rich, full-bleed visual spreads with large text, simple rhythmic refrains, and familiar everyday comforting routines. Perfect for interactive bedtime reading where toddlers point to their own picture on every spread.
            </p>
            <div className="pt-2 text-xs font-medium text-[#C98A84] flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#8F9E8B]" />
              <span>Calming bedtime rhythms • High-contrast painterly visuals</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-[#EBE3D9] shadow-xs space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F2EEF7] text-xs font-bold text-[#B8A9C9]">
              Ages 5 to 8 Years
            </div>
            <h3 className="font-editorial-serif text-2xl font-bold text-[#2D222A]">
              Illustrated Adventures for Early Readers
            </h3>
            <p className="text-xs sm:text-sm text-[#695B64] leading-relaxed">
              Crafted as engaging illustrated story books for kids transitioning into kindergarten and primary school. Rich multi-page narrative arcs featuring gentle challenges, problem solving, and social-emotional growth that spark early independent reading confidence.
            </p>
            <div className="pt-2 text-xs font-medium text-[#B8A9C9] flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-[#8F9E8B]" />
              <span>Multi-sentence paragraphs • Emotional resilience themes</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Anchored Section: Family & Occasion Intent (#personalised-gifts) */}
      <section id="personalised-gifts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-white rounded-3xl p-8 sm:p-14 border border-[#EBE3D9] shadow-sm space-y-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAEEED] border border-[#C98A84]/30 text-xs font-semibold text-[#C98A84]">
              <Heart className="w-3.5 h-3.5" />
              <span>Family Love & Bonds</span>
            </div>
            <h2 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
              Customised Gifts for Children by Family & Occasion
            </h2>
            <p className="text-xs sm:text-sm text-[#695B64] leading-relaxed">
              Whether you are looking for memorable gifts for daughter birthday, a surprise gift for niece or nephew, or a sentimental gift from grandparents to grandchild, a bespoke story book bridges physical distance with eternal warmth.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2">
              <div className="font-editorial-serif text-base font-bold text-[#2D222A]">
                Gifts for Daughter Birthday
              </div>
              <p className="text-xs text-[#695B64] leading-relaxed">
                An empowering journey where she leads with bravery, compassion, and boundless curiosity.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2">
              <div className="font-editorial-serif text-base font-bold text-[#2D222A]">
                Gift for Niece & Nephew
              </div>
              <p className="text-xs text-[#695B64] leading-relaxed">
                The favorite aunt or uncle gift that parents praise for encouraging screen-free story time.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2">
              <div className="font-editorial-serif text-base font-bold text-[#2D222A]">
                Grandparents to Grandchild
              </div>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Add an affectionate grandparent dedication letter preserved forever in museum-grade print.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2">
              <div className="font-editorial-serif text-base font-bold text-[#2D222A]">
                Festival & Milestone Gifts
              </div>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Celebrate Diwali, birthdays, naming ceremonies, and preschool graduations with meaning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Heirloom Craftsmanship Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-[#FAF7F2] rounded-3xl p-8 sm:p-12 border border-[#EBE3D9]">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C98A84]">
              Museum-Grade Craftsmanship
            </span>
            <h3 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
              Built to Be Cherished for Generations
            </h3>
            <p className="text-xs sm:text-sm text-[#695B64]">
              We treat each child’s book as a literary heirloom, printed with traditional European bindery methods.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-[#FAEEED] text-[#C98A84] flex items-center justify-center font-editorial-serif font-bold">
                01
              </div>
              <h4 className="font-editorial-serif text-lg font-bold text-[#2D222A]">
                170gsm Silk Fine-Art Paper
              </h4>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Acid-free, FSC-certified heavyweight pages that resist fingerprints, glare, and yellowing for decades.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-[#F2EEF7] text-[#B8A9C9] flex items-center justify-center font-editorial-serif font-bold">
                02
              </div>
              <h4 className="font-editorial-serif text-lg font-bold text-[#2D222A]">
                Character Consistency Engine
              </h4>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Multi-angle face preservation keeps your child recognizable through smiles, wonder, and dynamic story scenes.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] space-y-2.5">
              <div className="w-10 h-10 rounded-full bg-[#EEF4ED] text-[#8F9E8B] flex items-center justify-center font-editorial-serif font-bold">
                03
              </div>
              <h4 className="font-editorial-serif text-lg font-bold text-[#2D222A]">
                Hand-Sewn Durable Hardcover
              </h4>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Sturdy cloth-bound spine with glossy or soft-touch matte lamination that survives enthusiastic bedtime read-alouds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Creative Full Story Reader Modal */}
      <StoryReaderModal
        story={readingStory}
        isOpen={!!readingStory}
        onClose={() => setReadingStory(null)}
      />
    </div>
  );
}
