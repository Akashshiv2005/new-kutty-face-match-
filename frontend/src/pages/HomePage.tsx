import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, BookOpen, CheckCircle, ChevronLeft, ChevronRight, UploadCloud, Eye, Star, Heart, Award, Gift, Sparkle } from "lucide-react";
import { api, StoryTemplate, isLogoStory } from "@/lib/api";
import { HardcoverBook } from "@/components/HardcoverBook";
import { StoryReaderModal } from "@/components/StoryReaderModal";
import Seo from "@/seo/Seo";
import { SEO_ROUTES } from "@/seo/routes";
import { getOrganizationSchema, getWebSiteSchema } from "@/seo/schema";
import FaqSection from "@/components/FaqSection";
import { HOMEPAGE_FAQS } from "@/seo/faqs";

export default function HomePage() {
  const [stories, setStories] = useState<StoryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const latestStoryIdRef = useRef<string | null>(null);
  const [readingStory, setReadingStory] = useState<StoryTemplate | null>(null);

  // Scroll entrance animation for "How It Works" 3-step cards
  const [stepsInView, setStepsInView] = useState(false);
  const stepsSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = stepsSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStepsInView(true);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [selectedFont, setSelectedFont] = useState<string>(() => {
    return localStorage.getItem("kutty_hero_font") || "georgia";
  });
  const [defaultPdfPrice, setDefaultPdfPrice] = useState<number>(799);

  const handleFontChange = (id: string) => {
    setSelectedFont(id);
    localStorage.setItem("kutty_hero_font", id);
  };

  const fetchStories = () => {
    api.getAnnouncement().then((ann) => {
      if (ann?.default_pdf_price) {
        setDefaultPdfPrice(Number(ann.default_pdf_price));
      }
    }).catch(() => { });

    api.getStories()
      .then((data) => {
        setStories(data);
        if (data.length > 0) {
          const newestId = data[0].id;
          if (latestStoryIdRef.current && latestStoryIdRef.current !== newestId) {
            // New latest story uploaded in admin dashboard! Immediately show it as active hero
            setCurrentSlideIndex(0);
          }
          latestStoryIdRef.current = newestId;
        }
      })
      .catch((err) => console.error("Error loading stories:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStories();

    // Auto-refresh when tab regains focus or visibility (e.g., after uploading a story in admin dashboard)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchStories();
      }
    };
    window.addEventListener("focus", fetchStories);
    document.addEventListener("visibilitychange", handleVisibility);

    // Light background poll every 15s to automatically catch newly uploaded stories
    const pollTimer = setInterval(fetchStories, 15000);

    return () => {
      window.removeEventListener("focus", fetchStories);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(pollTimer);
    };
  }, []);

  // Filter stories for hero carousel:
  // Admin can curate which stories appear in the hero carousel (s.in_hero_carousel === true).
  // Strictly capped at max 5 slides. If none explicitly chosen, defaults to the first 5 stories.
  const validStories = stories.filter(
    (s) => Boolean(s.cover_image_url || (s.pages && s.pages.some((p) => p.original_image_url)))
  );
  const curatedHeroStories = validStories.filter((s) => s.in_hero_carousel);
  const heroStories = (curatedHeroStories.length > 0 ? curatedHeroStories : validStories).slice(0, 5);

  // Dynamic image changing: auto-cycle every 4.5s through stories when not hovered
  useEffect(() => {
    if (heroStories.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroStories.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [heroStories.length, isHovered]);

  const activeIndex = heroStories.length > 0 ? currentSlideIndex % heroStories.length : 0;
  const currentStory = heroStories[activeIndex] || stories[0];
  const currentImageUrl = currentStory
    ? api.resolveUrl(currentStory.cover_image_url || currentStory.pages?.[0]?.original_image_url)
    : "";

  return (
    <div className="space-y-16 sm:space-y-24 lg:space-y-28 pb-16">
      {/* Search Engine Optimization & Structured Data */}
      <Seo
        config={SEO_ROUTES["/"]}
        schemas={[getOrganizationSchema(), getWebSiteSchema()]}
      />

      {/* 1. Hero Section */}
      <section className="relative pt-6 sm:pt-12 md:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#FAEEED] border border-[#C98A84]/30 text-[11px] sm:text-xs font-medium text-[#C98A84]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Bespoke Heirloom Storybooks for Children</span>
              </div>
            </div>

            <h1 className="font-georgia text-3xl sm:text-4xl md:text-5xl lg:text-[42px] xl:text-5xl 2xl:text-6xl font-bold tracking-tight text-[#2D222A] leading-tight sm:leading-[1.15] transition-all duration-200">
              Personalised Story Books for Kids - Your Child Is the Hero
            </h1>

            <p className="text-sm sm:text-base text-[#695B64] font-normal leading-relaxed max-w-xl">
              Make your child the hero of a personalised story book. Explore stories made with their name and photo and find a thoughtful birthday gift for kids. Each illustrated adventure features gentle, character-consistent artwork and museum-grade typography designed to nurture lifelong reading confidence.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2 sm:pt-4">
              <Link
                to="/stories"
                className="px-6 sm:px-8 py-3.5 sm:py-4 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 sm:gap-3 text-center"
              >
                <span>Explore Story Books</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/how-it-works"
                className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-full bg-white border border-[#EBE3D9] hover:border-[#C98A84] text-[#2D222A] text-sm sm:text-base font-medium transition-all flex items-center justify-center gap-2 text-center"
              >
                <span>See How It Works</span>
              </Link>
            </div>

            

            {/* Trust badge */}
            <div className="flex items-center gap-6 pt-3 sm:pt-4 text-xs text-[#695B64]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#8F9E8B]" />
                <span>End-to-End Encrypted Photo Privacy</span>
              </div>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-sm sm:max-w-md lg:max-w-none">
              {/* Decorative luxury frame */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-[#FAEEED] via-[#F2EEF7] to-[#FAF5E8] opacity-80 blur-xl"></div>

              <div
                className="relative rounded-2xl bg-white p-2.5 sm:p-3 shadow-xl border border-[#EBE3D9] group overflow-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#FAF7F2]">
                  {loading && !currentStory ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#695B64] p-8 text-center bg-[#FAEEED]/20 animate-pulse">
                      <BookOpen className="w-12 h-12 text-[#C98A84]/50 mb-3" />
                      <div className="h-4 w-32 bg-[#EBE3D9] rounded-full mb-2" />
                      <div className="h-3 w-20 bg-[#EBE3D9]/60 rounded-full" />
                    </div>
                  ) : currentStory && currentImageUrl ? (
                    isLogoStory(currentStory) ? (
                      <Link
                        to="/stories"
                        className="block w-full h-full relative cursor-pointer flex items-center justify-center p-3 sm:p-5 bg-white"
                        title="Explore Story Books"
                        aria-label="KuttyStory - Explore Story Books"
                      >
                        <img
                          key={currentStory.id}
                          src={currentImageUrl}
                          alt="KuttyStory Logo"
                          className="w-full h-full object-contain transform hover:scale-105 transition-all duration-700 ease-out"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.src = "/logo.png";
                          }}
                        />
                      </Link>
                    ) : (
                      <Link
                        to={`/personalize/${currentStory.slug}`}
                        className="block w-full h-full relative cursor-pointer"
                      >
                        <img
                          key={currentStory.id}
                          src={currentImageUrl}
                          alt={`${currentStory.title} Cover`}
                          className="w-full h-full object-cover transform hover:scale-105 transition-all duration-700 ease-out"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = "none";
                          }}
                        />
                      </Link>
                    )
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#695B64] p-8 text-center bg-[#FAEEED]/30">
                      <BookOpen className="w-16 h-16 text-[#C98A84] mb-4 stroke-1" />
                      <span className="font-editorial-serif text-2xl font-semibold text-[#2D222A]">
                        {currentStory?.title || "Heirloom Story"}
                      </span>
                      <span className="text-xs text-[#695B64] mt-2">
                        {currentStory?.page_count || 26}-Page Heirloom Edition
                      </span>
                    </div>
                  )}

                  {/* Top Slide Dots Indicator */}
                  {heroStories.length > 1 && (
                    <div className="absolute top-3.5 right-3.5 z-20 pointer-events-auto flex items-center gap-1.5 bg-black/35 backdrop-blur-md px-2.5 py-1.5 rounded-full shadow-xs">
                      {heroStories.slice(0, 5).map((story, idx) => {
                        const isLogo = isLogoStory(story);
                        const slideLabel = isLogo ? "KuttyStory" : story.title;
                        return (
                          <button
                            key={story.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCurrentSlideIndex(idx);
                            }}
                            className={`transition-all duration-300 rounded-full cursor-pointer ${idx === activeIndex
                              ? "w-4 h-1.5 bg-white shadow-xs"
                              : "w-1.5 h-1.5 bg-white/50 hover:bg-white/80"
                              }`}
                            title={slideLabel}
                            aria-label={`Slide ${idx + 1}: ${slideLabel}`}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Next / Prev Navigation Arrows */}
                  {heroStories.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentSlideIndex(
                            (prev) => (prev - 1 + heroStories.length) % heroStories.length
                          );
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#2D222A] shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-[#EBE3D9]"
                        aria-label="Previous story"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCurrentSlideIndex(
                            (prev) => (prev + 1) % heroStories.length
                          );
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#2D222A] shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-[#EBE3D9]"
                        aria-label="Next story"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Dynamic Corner / Bottom Floating Glassmorphism Badge - only shown for actual storybooks, not for logo */}
                  {currentStory && !isLogoStory(currentStory) && (
                    <div className="absolute bottom-2.5 sm:bottom-4 left-2.5 sm:left-4 right-2.5 sm:right-4 z-20 bg-white/95 backdrop-blur-md rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 border border-[#EBE3D9] flex items-center justify-between shadow-lg shadow-black/10 transition-all">
                      <div className="min-w-0 pr-2 sm:pr-3 flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#2D222A] truncate">
                          {currentStory.title}
                        </span>
                        {currentStory.highlight === "latest" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAEEED] border border-[#C98A84]/30 text-[#C98A84] text-[10px] sm:text-[11px] font-bold tracking-wide uppercase shrink-0">
                            <Sparkles className="w-3 h-3" />
                            Latest
                          </span>
                        )}
                        {currentStory.highlight === "best_seller" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase shrink-0">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            Best Seller
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/personalize/${currentStory.slug}`}
                          className="px-3 sm:px-3.5 py-1.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs hover:shadow-sm"
                        >
                          <span>Personalize</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. How KuttyStory Personalisation Works */}
      <section
        id="how-it-works"
        ref={stepsSectionRef}
        className="bg-white py-12 md:py-16 border-y border-[#EBE3D9] relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8 md:space-y-10">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FAEEED] border border-[#C98A84]/30 text-xs font-semibold text-[#C98A84] shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>How It Works</span>
            </div>
            <h2 className="font-editorial-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2D222A] tracking-tight">
              How KuttyStory Personalisation Works
            </h2>
            <p className="text-xs sm:text-sm text-[#695B64] max-w-lg mx-auto">
              Create your child’s story in 3 simple steps — from an everyday smartphone photo to a personalized heirloom hardcover book in minutes.
            </p>
          </div>

          {/* Interactive 3-Step Flow with Touch & Scroll Animations */}
          <div className="relative mx-auto max-w-5xl">
            {/* Desktop Curved Connector Arrow 1 */}
            <div
              className={`hidden md:block absolute top-[45%] left-[32.5%] -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-700 delay-300 ${stepsInView ? "opacity-100 scale-100" : "opacity-0 scale-75"
                }`}
            >
              <svg width="52" height="32" viewBox="0 0 52 32" fill="none" className="text-[#C98A84] drop-shadow-xs">
                <path
                  d="M 4 22 C 16 8, 34 8, 44 16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  className="animate-dash-flow"
                />
                <polygon points="42,10 50,17 40,21" fill="currentColor" />
              </svg>
            </div>

            {/* Desktop Curved Connector Arrow 2 */}
            <div
              className={`hidden md:block absolute top-[45%] left-[66%] -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-700 delay-500 ${stepsInView ? "opacity-100 scale-100" : "opacity-0 scale-75"
                }`}
            >
              <svg width="52" height="32" viewBox="0 0 52 32" fill="none" className="text-[#C98A84] drop-shadow-xs">
                <path
                  d="M 4 22 C 16 8, 34 8, 44 16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                  className="animate-dash-flow"
                />
                <polygon points="42,10 50,17 40,21" fill="currentColor" />
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 lg:gap-6 items-stretch">
              {[
                {
                  step: "1",
                  title: "Upload Photo",
                  subtitle: "A simple smartphone selfie or casual snap",
                  image: "/card_step_1_transparent.png",
                  alt: "Step 1: Upload Your Child's Photo",
                },
                {
                  step: "2",
                  title: "Preview & Order",
                  subtitle: "Watch your child appear across 26 pages",
                  image: "/card_step_2_transparent.png",
                  alt: "Step 2: Preview & Order Storybook",
                },
                {
                  step: "3",
                  title: "Get Your Book",
                  subtitle: "Premium 8×8 inch hardbound keepsake delivered to your door",
                  image: "/card_step_3_transparent.png",
                  alt: "Step 3: Get Your Storybook Keepsake",
                },
              ].map((s, idx) => (
                <div key={s.step} className="flex flex-col items-center">
                  <Link
                    to="/storybooks"
                    className={`w-full group block cursor-pointer transition-all duration-700 ease-out transform ${stepsInView
                      ? "opacity-100 translate-y-0 scale-100"
                      : "opacity-0 translate-y-8 scale-95"
                      }`}
                    style={{ transitionDelay: `${idx * 200 + 100}ms` }}
                  >
                    <div className="transform transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:scale-[1.03] active:scale-95 touch-manipulation select-none">
                      <img
                        src={s.image}
                        alt={s.alt}
                        className="w-full h-auto object-contain drop-shadow-sm group-hover:drop-shadow-xl transition-all duration-300 pointer-events-none"
                        draggable={false}
                      />
                    </div>
                  </Link>

                  {/* Mobile Downward Connector Arrow (Between Step 1->2 and 2->3) */}
                  {idx < 2 && (
                    <div
                      className={`flex md:hidden items-center justify-center -my-1 py-1 text-[#C98A84] transition-all duration-500 ${stepsInView ? "opacity-100 scale-100" : "opacity-0 scale-75"
                        }`}
                    >
                      <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
                        <path
                          d="M 12 4 C 18 12, 18 20, 12 26"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                        />
                        <polygon points="8,24 12,30 16,24" fill="currentColor" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Atelier Technical & Quality Details (Existing Content Preserved) */}
          <div className="pt-8 md:pt-10 border-t border-[#EBE3D9]">
            <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
              <div className="text-xs uppercase tracking-widest text-[#C98A84] font-semibold">
                The Atelier Process
              </div>
              <h3 className="font-editorial-serif text-3xl font-bold text-[#2D222A]">
                How Your Heirloom Book is Created
              </h3>
              <p className="text-xs text-[#695B64]">
                Three meticulous craftsmanship stages ensuring heirloom quality, privacy safeguards, and print engineering.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
              <div className="bg-white p-5 sm:p-8 rounded-2xl border border-[#EBE3D9] shadow-sm space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FAEEED] flex items-center justify-center text-[#C98A84] font-editorial-serif text-xl sm:text-2xl font-bold">
                  1
                </div>
                <h4 className="font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A]">
                  Name & Reference Photo
                </h4>
                <p className="text-xs leading-relaxed text-[#695B64]">
                  Enter your child’s name and upload a single clear, authorized photo. We validate face lighting and composition with strict guardian privacy safeguards.
                </p>
              </div>

              <div className="bg-white p-5 sm:p-8 rounded-2xl border border-[#EBE3D9] shadow-sm space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#F2EEF7] flex items-center justify-center text-[#B8A9C9] font-editorial-serif text-xl sm:text-2xl font-bold">
                  2
                </div>
                <h4 className="font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A]">
                  Character Consistency & Artistry
                </h4>
                <p className="text-xs leading-relaxed text-[#695B64]">
                  Our multi-stage pipeline integrates reference likeness across close-ups, dynamic scenes, and emotional moments while preserving the story’s timeless illustration style.
                </p>
              </div>

              <div className="bg-white p-5 sm:p-8 rounded-2xl border border-[#EBE3D9] shadow-sm space-y-3 sm:space-y-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#EEF4ED] flex items-center justify-center text-[#8F9E8B] font-editorial-serif text-xl sm:text-2xl font-bold">
                  3
                </div>
                <h4 className="font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A]">
                  Deterministic PDF Layout
                </h4>
                <p className="text-xs leading-relaxed text-[#695B64]">
                  Artwork is typeset with our ReportLab deterministic layout engine at exact 8×8 inch (203×203 mm) trim size. Sharp vector typography, safe margins, and validated print-ready output.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. A Story With One Very Special Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-14 border border-[#EBE3D9] shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAEEED] border border-[#C98A84]/30 text-xs font-semibold text-[#C98A84]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>The Magic of Seeing Themselves</span>
            </div>
            <h2 className="font-editorial-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2D222A] tracking-tight">
              A Story With One Very Special Hero
            </h2>
            <p className="text-sm sm:text-base text-[#695B64] leading-relaxed">
              When a child opens a book and discovers their own name, likeness, and smile woven into the narrative, reading stops being a routine task. It becomes an unforgettable adventure where they are brave, capable, and deeply loved.
            </p>
            <p className="text-sm sm:text-base text-[#695B64] leading-relaxed">
              Our stories foster empathy, inner confidence, and a lifelong excitement for books. Whether exploring enchanted forests or befriending gentle unicorns, your child sees that their own qualities are worth celebrating.
            </p>
            <div className="pt-2">
              <Link
                to="/stories"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#C98A84] hover:text-[#B87A74] underline underline-offset-4 transition-colors"
              >
                <span>Explore personalised story books for kids</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 bg-[#FAF7F2] rounded-2xl p-6 sm:p-8 border border-[#EBE3D9] space-y-4">
            <div className="font-editorial-serif text-xl font-bold text-[#2D222A]">
              Why Hero Representation Matters
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-[#695B64]">
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                <span>Builds emotional self-worth and confidence in early developmental years.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                <span>Encourages children who are reluctant readers to engage with print.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                <span>Creates an indelible bond between parent and child during bedtime reading.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. Why Choose a Personalised Kids Book? */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-2 sm:space-y-3">
          <div className="text-xs uppercase tracking-widest text-[#C98A84] font-semibold">The KuttyStory Difference</div>
          <h2 className="font-editorial-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2D222A]">
            Why Choose a Personalised Kids Book?
          </h2>
          <p className="text-xs sm:text-sm text-[#695B64]">
            Every volume combines gentle fine-art illustration, respectful privacy, and durable keepsake bookbinding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAEEED] flex items-center justify-center text-[#C98A84]">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-editorial-serif text-lg font-bold text-[#2D222A]">
              1. Unmatched Attention
            </h3>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Children pay significantly higher attention when they see themselves on every page, transforming storytime into an interactive joy.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#F2EEF7] flex items-center justify-center text-[#B8A9C9]">
              <Sparkle className="w-5 h-5" />
            </div>
            <h3 className="font-editorial-serif text-lg font-bold text-[#2D222A]">
              2. Gentle Watercolor Art
            </h3>
            <p className="text-xs text-[#695B64] leading-relaxed">
              No artificial cutouts or uncanny edges. Facial contours are softly woven into classical children’s book watercolor aesthetics.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF4ED] flex items-center justify-center text-[#8F9E8B]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-editorial-serif text-lg font-bold text-[#2D222A]">
              3. Sacred Child Privacy
            </h3>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Strict guardian consent and zero-harvesting policy. Child photos are encrypted and never used to train public generative models.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#EBE3D9] shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF5E8] flex items-center justify-center text-[#C5A059]">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-editorial-serif text-lg font-bold text-[#2D222A]">
              4. Heirloom Craftsmanship
            </h3>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Heavyweight 170gsm silk paper, reinforced Smyth-sewn binding, and archival inks engineered to survive years of loving hands.
            </p>
          </div>
        </div>
      </section>

      {/* 4. A Thoughtful Birthday Gift for Kids */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#FAEEED]/70 via-[#FAF7F2] to-[#FAF5E8]/70 rounded-3xl p-8 sm:p-14 border border-[#EBE3D9] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#C98A84]/30 text-xs font-semibold text-[#C98A84]">
              <Gift className="w-3.5 h-3.5" />
              <span>Gifting With Meaning</span>
            </div>
            <h2 className="font-editorial-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2D222A] tracking-tight">
              A Thoughtful Birthday Gift for Kids
            </h2>
            <p className="text-sm sm:text-base text-[#695B64] leading-relaxed">
              Finding meaningful birthday gifts for kids can be challenging when toy boxes are already overflowing with disposable plastic. A personalised storybook stands apart as a permanent keepsake—celebrating who they are at this very milestone in their lives.
            </p>
            <p className="text-sm sm:text-base text-[#695B64] leading-relaxed">
              Parents, grandparents, aunts, and uncles can include a custom dedication letter printed inside the cover, ensuring that the love and celebration of their birthday stays with them for decades.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 items-center">
              <Link
                to="/stories#birthday-gifts"
                className="px-6 py-3 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
              >
                Birthday gifts for kids →
              </Link>
            </div>
          </div>
          <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#EBE3D9] text-center space-y-3 shadow-xs">
            <div className="text-3xl">🎂</div>
            <div className="font-editorial-serif text-lg font-bold text-[#2D222A]">
              The Gift That Lasts 30+ Years
            </div>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Toys break or get donated within months. An illustrated story where your child saves the day is saved forever on the family bookshelf.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Featured Stories Catalog: Find a Book They Will Love */}
      <section id="stories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-2 sm:space-y-3">
          <div className="text-xs uppercase tracking-widest text-[#C98A84] font-semibold">Story Catalog</div>
          <h2 className="font-editorial-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#2D222A]">
            Find a Book They Will Love
          </h2>
          <p className="text-xs sm:text-sm text-[#695B64]">
            Each story is crafted with classical fairy-tale storytelling and adaptable artwork layouts ready for personalization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Story Cards (up to 3 actual books, excluding logo) */}
          {stories.filter((s) => !isLogoStory(s)).slice(0, 3).map((story) => (
            <div key={story.id} className="editorial-card overflow-hidden flex flex-col group">
              <div className="relative aspect-square p-5 sm:p-6 bg-gradient-to-b from-[#FDFCFB] via-[#F8F5EE] to-[#EFE8DD] flex items-center justify-center overflow-hidden border-b border-[#EBE3D9]/70">
                <div className="w-[82%] sm:w-[86%] max-w-[320px] aspect-square flex items-center justify-center mx-auto">
                  <HardcoverBook
                    coverUrl={story.cover_image_url}
                    title={story.title}
                    aspectRatio="square"
                    onClick={() => setReadingStory(story)}
                  >
                    {/* Quick Look Inside Button — exactly matching user reference */}
                    <div className="absolute inset-0 bg-[#2D222A]/20 sm:bg-[#2D222A]/30 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4 rounded-r-[7px] rounded-l-[4px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReadingStory(story);
                        }}
                        className="px-4 py-2.5 rounded-full bg-white text-[#2D222A] hover:text-[#C98A84] text-xs font-semibold shadow-lg transition-transform transform translate-y-1 sm:translate-y-2 group-hover:translate-y-0 group-hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer border border-[#E8DEC8]"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C98A84]" />
                        <span>Read the Full Story</span>
                      </button>
                    </div>
                  </HardcoverBook>
                </div>
                {story.highlight && (
                  <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#EBE3D9] text-[11px] font-semibold text-[#2D222A] shadow-xs">
                    {story.highlight === "best_seller" ? (
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#C98A84]" />
                    )}
                    <span>
                      {story.highlight === "best_seller"
                        ? "Bestseller"
                        : story.highlight === "latest"
                        ? "New Release"
                        : story.highlight === "popular"
                        ? "Popular"
                        : story.highlight}
                    </span>
                  </div>
                )}
                <div className="absolute top-3 right-3 z-30 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#EBE3D9] text-[11px] font-medium text-[#2D222A] shadow-xs">
                  {story.age_range}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-[#C98A84] font-medium">
                    {story.category} • {story.page_count} Pages
                  </div>
                  <h3 className="font-editorial-serif text-2xl font-bold text-[#2D222A]">
                    {story.title}
                  </h3>
                  <p className="text-xs text-[#695B64] line-clamp-2 leading-relaxed">
                    {story.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#EBE3D9] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#695B64]">From </span>
                    <span className="font-editorial-serif text-xl font-bold text-[#2D222A]">
                      ₹{story.price_digital ? Number(story.price_digital).toLocaleString("en-IN") : defaultPdfPrice}
                    </span>
                  </div>
                  <Link
                    to={`/personalize/${story.slug}`}
                    className="px-4 py-2 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>Personalize</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="mt-12 flex justify-center">
          <Link
            to="/stories"
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[#FAEEED] hover:bg-[#F5DFDC] text-[#C98A84] hover:text-[#B87A74] text-sm font-semibold border border-[#C98A84]/30 hover:border-[#C98A84] shadow-xs hover:shadow transition-all"
          >
            <span>Explore All Story Books</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      

      {/* 7. Homepage Verified FAQ Section */}
      <FaqSection
        id="home-faq"
        title="Frequently Asked Questions About Personalised Books"
        subtitle="Common questions from parents about creating custom storybooks, photo privacy, and delivery."
        items={HOMEPAGE_FAQS}
      />

      {/* 8. Quality & Safety Charter + Closing CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="editorial-card p-6 sm:p-12 bg-white flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8F9E8B]">
              <ShieldCheck className="w-4 h-4 text-[#8F9E8B]" />
              <span>Responsible Privacy & Child Safety Charter</span>
            </div>
            <h3 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
              We respect your child’s privacy as sacred.
            </h3>
            <p className="text-xs sm:text-sm text-[#695B64] leading-relaxed">
              Photographs uploaded by parents are stored in private, protected storage with automated retention limits. We never sell biometric identifiers, train public models on your children, or expose reference photos to third parties.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <Link
              to="/stories"
              className="px-6 py-3.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs sm:text-sm font-semibold text-center transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>Explore Story Books</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="px-6 py-3.5 rounded-full bg-[#FAEEED] hover:bg-[#F5DFDC] text-[#C98A84] text-xs sm:text-sm font-semibold text-center transition-colors flex items-center justify-center"
            >
              <span>See How It Works</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Creative Full Story Reader Modal */}
      <StoryReaderModal
        story={readingStory}
        isOpen={!!readingStory}
        onClose={() => setReadingStory(null)}
      />
    </div>
  );
}
