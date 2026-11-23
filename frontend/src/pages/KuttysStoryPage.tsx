import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  ArrowRight,
} from "lucide-react";
import { api, KuttysStoryItem } from "@/lib/api";
import Seo from "@/seo/Seo";
import { SEO_ROUTES } from "@/seo/routes";
import { getBreadcrumbSchema } from "@/seo/schema";

// 3D Child Cartoon Mockup Avatars (Pure character mockup, rounded-full, zero storybook text)
export function KidCartoonAvatar({
  preset,
  customUrl,
  className = "w-18 h-18 sm:w-20 sm:h-20",
  alt = "Child cartoon mockup",
  accentColor,
}: {
  preset?: string;
  customUrl?: string;
  className?: string;
  alt?: string;
  accentColor?: string;
}) {
  let src = "/avatar_dino_boy.png";

  if (customUrl && customUrl.trim().length > 0) {
    src = customUrl;
  } else if (preset === "cartoon_unicorn_girl") {
    src = "/avatar_unicorn_girl.png";
  } else if (preset === "cartoon_astronaut_boy") {
    src = "/avatar_moon_boy.png";
  } else if (preset === "cartoon_baker_girl") {
    src = "/avatar_baker_girl.png";
  } else if (preset === "cartoon_hero_boy") {
    src = "/avatar_doctor_boy.png";
  } else if (preset === "cartoon_detective_girls") {
    src = "/avatar_nature_kids.png";
  } else if (preset === "cartoon_dino_boy") {
    src = "/avatar_dino_boy.png";
  }

  return (
    <div
      className={`relative rounded-full overflow-hidden shadow-xs border-2 border-white bg-[#FAF5EE] shrink-0 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/avatar_dino_boy.png";
        }}
      />
    </div>
  );
}

export default function KuttysStoryPage() {
  const [stories, setStories] = useState<KuttysStoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});

  // 3D Automatically Running Sliding Carousel State (Matching Image Ref 2)
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handlePrevSlide();
      } else {
        handleNextSlide();
      }
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    loadStories();
    try {
      const storedLikes = localStorage.getItem("kuttystory_user_likes");
      if (storedLikes) {
        setLikedStories(JSON.parse(storedLikes));
      }
    } catch {}
  }, []);

  const loadStories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPublicKuttysStories();
      setStories(data || []);
    } catch (err: any) {
      console.error("Error loading Kutty's stories:", err);
      setError("Could not load stories right now. Please refresh!");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (storyId: string) => {
    if (likedStories[storyId]) return;

    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, likes_count: (s.likes_count || 0) + 1 } : s))
    );

    const updated = { ...likedStories, [storyId]: true };
    setLikedStories(updated);
    try {
      localStorage.setItem("kuttystory_user_likes", JSON.stringify(updated));
      await api.likeKuttysStory(storyId);
    } catch (err) {
      console.error("Failed to register like:", err);
    }
  };

  // Automatic running timer: smoothly slides to next review continuously every 3 seconds
  useEffect(() => {
    if (!isAutoPlaying || stories.length === 0) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % stories.length);
    }, 3200);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, stories.length]);

  const handlePrevSlide = () => {
    setCarouselIndex((prev) => (prev - 1 + stories.length) % stories.length);
  };

  const handleNextSlide = () => {
    setCarouselIndex((prev) => (prev + 1) % stories.length);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-20 text-[#2D222A] overflow-hidden flex flex-col justify-between">
      {/* Search Engine Optimization & Structured Data */}
      <Seo
        config={SEO_ROUTES["/kuttys-story"]}
        schemas={[
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Kutty's Story", path: "/kuttys-story" }
          ])
        ]}
      />

      {/* 1. Clean, Elegant Editorial Header */}
      <section className="relative pt-8 pb-3 sm:pt-16 sm:pb-8 px-4 sm:px-6 lg:px-8 text-center bg-gradient-to-b from-[#FAEEED]/40 via-[#FAF7F2] to-[#FAF7F2]">
        <div className="max-w-4xl mx-auto">
          {/* Subtle Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#FBECE6] border border-[#F3D7CD] text-[#A85341] text-[11px] sm:text-xs font-semibold tracking-wider uppercase mb-3 sm:mb-5 shadow-2xs">
            <span>✨</span>
            <span>100% Real Kid Words</span>
            <span>🖍️</span>
          </div>

          <h1 className="font-editorial-serif text-2xl sm:text-5xl lg:text-6xl text-[#2D222A] tracking-tight font-bold mb-3 sm:mb-5 leading-tight">
            The Story of KuttyStory — Celebrating Childhood
          </h1>

          <p className="font-editorial-sans text-[#695B64] text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Read how KuttyStory turns everyday childhood moments into cherished illustrated fairy tales, honoring every child's courage, wonder, and imagination. What happens when little kids open a book and see{" "}
            <span className="font-semibold text-[#A85341]">their own smiling face</span> fighting
            dinosaurs, baking treats, and walking on the moon? Watch them tell it in their own words!
          </p>
        </div>
      </section>

      {/* 2. AUTOMATIC RUNNING 3D SLIDING TEMPLATE (The ONLY showcase section, matching Image Ref 2) */}
      <main className="flex-1 flex flex-col justify-center my-1 sm:my-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#695B64]">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C98A84] mb-3" />
            <p className="text-sm">Fetching little reader stories...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={loadStories}
              className="px-4 py-2 bg-[#C98A84] text-white rounded-lg text-xs font-medium hover:bg-[#B8706A]"
            >
              Try Again
            </button>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-[#EBE3D9] p-8 max-w-lg mx-auto">
            <p className="text-base text-[#695B64]">No reviews published yet.</p>
          </div>
        ) : (
          <div className="relative max-w-7xl mx-auto px-3 sm:px-6 w-full my-2 sm:my-4">
            {/* Top Controls Bar: Live Auto-Running Indicator + Navigation */}
            <div className="flex items-center justify-between max-w-4xl mx-auto mb-3 sm:mb-4 px-2">
              <div className="flex items-center gap-2 text-xs text-[#7A6B74]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-[#2D222A]">
                  {isAutoPlaying ? "" : "Paused"}
                </span>
                <span className="text-[#A2949E]">
                  ({carouselIndex + 1} of {stories.length})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                  aria-label={isAutoPlaying ? "Pause auto-slide" : "Resume auto-slide"}
                  className="w-8 h-8 rounded-full bg-white hover:bg-[#FBECE6] text-[#7A6B74] hover:text-[#A85341] border border-[#EBE3D9] flex items-center justify-center transition shadow-2xs"
                  title={isAutoPlaying ? "Pause auto-slide" : "Resume auto-slide"}
                >
                  {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label="Previous story"
                  className="w-8 h-8 rounded-full bg-white hover:bg-[#FBECE6] text-[#7A6B74] hover:text-[#A85341] border border-[#EBE3D9] flex items-center justify-center transition shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label="Next story"
                  className="w-8 h-8 rounded-full bg-white hover:bg-[#FBECE6] text-[#7A6B74] hover:text-[#A85341] border border-[#EBE3D9] flex items-center justify-center transition shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ─── Mobile View (block md:hidden): Smooth Horizontal Slider Track with Natural Height ─── */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="block md:hidden w-full overflow-hidden py-2 px-1 select-none"
            >
              <div
                className="flex transition-transform duration-500 ease-out items-start"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {stories.map((story, idx) => {
                  const isLiked = likedStories[story.id];
                  return (
                    <div key={story.id} className="w-full shrink-0 px-1">
                      <article className="relative bg-white rounded-2xl border border-[#EBE3D9] shadow-[0_8px_30px_rgba(45,34,42,0.08)] p-4 flex flex-col justify-between">
                        <div className="relative z-0">
                          {/* Top Row: Tag Badge & Serial */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FBECE6] border border-[#F3D7CD] text-[#A85341] text-[10px] font-bold tracking-wider uppercase">
                              <span>{story.badge || "🦕 DINO TAMER"}</span>
                            </div>
                            <span className="text-[10px] text-[#9C8E96] font-medium tracking-normal">
                              Story review #{String(idx + 1).padStart(2, "0")}
                            </span>
                          </div>

                          {/* Child Profile Row */}
                          <div className="flex items-center gap-3 mb-3">
                            <KidCartoonAvatar
                              preset={story.avatar_preset}
                              customUrl={story.avatar_url}
                              className="w-14 h-14"
                              alt={story.child_name}
                            />

                            <div className="flex-1 min-w-0">
                              <h3 className="font-editorial-serif text-lg font-bold text-[#2D222A] tracking-tight truncate">
                                {story.child_name}
                              </h3>
                              <p className="text-[11px] text-[#8C7E86] font-normal mt-0.5">
                                {story.child_age || "5¾ years"}
                                {story.city ? ` · ${story.city}` : ""}
                              </p>
                              <p className="text-sm font-bold text-[#2D222A] mt-0.5 flex items-center gap-1.5 truncate">
                                <span>{story.child_title || "Chief T-Rex Whisperer 🦕"}</span>
                              </p>
                            </div>
                          </div>

                          {/* Full-Width Tinted Quote Box */}
                          <div className="w-full bg-[#F8EFEA] border border-[#F0DFD7] rounded-xl px-3.5 py-3 mb-3">
                            <p className="font-editorial-sans italic font-medium text-sm text-[#2D222A] leading-relaxed">
                              “{story.kid_quote}”
                            </p>
                            {story.parent_note && (
                              <p className="mt-2 text-[11px] text-[#7A6B74] font-normal not-italic border-t border-[#F0DFD7]/60 pt-1.5 leading-snug">
                                {story.parent_note}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Rating Stars + Link */}
                        <div className="pt-2.5 border-t border-[#F4EDE5] flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#A85341] tracking-wider text-[11px]">★★★★★</span>
                            <span className="text-[11px] text-[#8C7E86] font-normal">
                              {story.rating_label || "Little reader review"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLike(story.id);
                              }}
                              disabled={isLiked}
                              aria-label="Send love"
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-all ${
                                isLiked
                                  ? "text-rose-600 bg-rose-50"
                                  : "text-[#8C7E86] hover:text-rose-600 bg-[#FAF7F2] hover:bg-rose-50"
                              }`}
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`}
                              />
                              <span>{story.likes_count || 0}</span>
                            </button>

                            <Link
                              to={story.storybook_slug ? `/personalize/${story.storybook_slug}` : "/storybooks"}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-medium text-[#7A6B74] hover:text-[#A85341] transition-colors inline-flex items-center gap-1 group/link"
                            >
                              <span>Read adventure</span>
                              <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
                            </Link>
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── Desktop View (hidden md:flex): 3D Curved Perspective Showroom Stage ─── */}
            <div
              className="hidden md:flex relative w-full h-[400px] md:h-[410px] items-center justify-center overflow-visible select-none px-1"
              style={{ perspective: "1200px" }}
            >
              {stories.map((story, idx) => {
                let diff = idx - carouselIndex;
                if (diff > stories.length / 2) diff -= stories.length;
                if (diff < -stories.length / 2) diff += stories.length;

                const isActive = diff === 0;

                let transform = "";
                let zIndex = 10;
                let opacity = 0;
                let pointerEvents: "auto" | "none" = "none";

                if (isActive) {
                  transform = "translate3d(0, 0, 0) scale(1) rotateY(0deg)";
                  zIndex = 30;
                  opacity = 1;
                  pointerEvents = "auto";
                } else if (diff === -1) {
                  transform = "translate3d(-64%, 0, -80px) scale(0.88) rotateY(25deg)";
                  zIndex = 20;
                  opacity = 1;
                  pointerEvents = "auto";
                } else if (diff === 1) {
                  transform = "translate3d(64%, 0, -80px) scale(0.88) rotateY(-25deg)";
                  zIndex = 20;
                  opacity = 1;
                  pointerEvents = "auto";
                } else if (diff === -2) {
                  transform = "translate3d(-118%, 0, -180px) scale(0.75) rotateY(42deg)";
                  zIndex = 10;
                  opacity = 1;
                  pointerEvents = "auto";
                } else if (diff === 2) {
                  transform = "translate3d(118%, 0, -180px) scale(0.75) rotateY(-42deg)";
                  zIndex = 10;
                  opacity = 1;
                  pointerEvents = "auto";
                } else {
                  transform = `translate3d(${diff > 0 ? 150 : -150}%, 0, -280px) scale(0.6)`;
                  zIndex = 0;
                  opacity = 0;
                  pointerEvents = "none";
                }

                const isLiked = likedStories[story.id];

                return (
                  <div
                    key={story.id}
                    onClick={() => {
                      if (!isActive) setCarouselIndex(idx);
                    }}
                    className={`absolute w-[92%] max-w-[560px] md:max-w-[620px] transition-all duration-700 ease-out cursor-pointer ${
                      isActive ? "cursor-default" : "hover:brightness-105"
                    }`}
                    style={{
                      transform,
                      zIndex,
                      opacity,
                      pointerEvents,
                      transformStyle: "preserve-3d",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <article className="relative bg-white rounded-3xl border border-[#EBE3D9] shadow-[0_12px_40px_rgba(45,34,42,0.08)] p-6 sm:p-7 flex flex-col justify-between overflow-hidden">
                      {/* Subtle depth shade for background cards on desktop */}
                      {!isActive && (
                        <div className="absolute inset-0 bg-[#FAF7F2]/20 backdrop-blur-[0.5px] pointer-events-none z-10 transition-opacity" />
                      )}

                      <div className="relative z-0">
                        {/* Top Row: Tag Badge & Serial */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBECE6] border border-[#F3D7CD] text-[#A85341] text-[11px] font-bold tracking-wider uppercase">
                            <span>{story.badge || "🦕 DINO TAMER"}</span>
                          </div>
                          <span className="text-xs text-[#9C8E96] font-medium tracking-normal">
                            Story review #{String(idx + 1).padStart(2, "0")}
                          </span>
                        </div>

                        {/* Child Profile Row */}
                        <div className="flex items-center gap-5 mb-4">
                          <KidCartoonAvatar
                            preset={story.avatar_preset}
                            customUrl={story.avatar_url}
                            className="w-20 h-20"
                            alt={story.child_name}
                          />

                          <div className="flex-1 min-w-0">
                            <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A] tracking-tight truncate">
                              {story.child_name}
                            </h3>
                            <p className="text-xs text-[#8C7E86] font-normal mt-0.5">
                              {story.child_age || "5¾ years"}
                              {story.city ? ` · ${story.city}` : ""}
                            </p>
                            <p className="text-base font-bold text-[#2D222A] mt-1 flex items-center gap-1.5 truncate">
                              <span>{story.child_title || "Chief T-Rex Whisperer 🦕"}</span>
                            </p>
                          </div>
                        </div>

                        {/* Full-Width Tinted Quote Box */}
                        <div className="w-full bg-[#F8EFEA] border border-[#F0DFD7] rounded-2xl px-5 py-4 mb-4">
                          <p className="font-editorial-sans italic font-medium text-base text-[#2D222A] leading-relaxed">
                            “{story.kid_quote}”
                          </p>
                          {story.parent_note && (
                            <p className="mt-2 text-xs text-[#7A6B74] font-normal not-italic border-t border-[#F0DFD7]/60 pt-1.5">
                              {story.parent_note}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Rating Stars + Link */}
                      <div className="pt-2 border-t border-[#F4EDE5] flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[#A85341] tracking-wider text-xs">★★★★★</span>
                          <span className="text-xs text-[#8C7E86] font-normal">
                            {story.rating_label || "Little reader review"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(story.id);
                            }}
                            disabled={isLiked}
                            aria-label="Send love"
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                              isLiked
                                ? "text-rose-600 bg-rose-50"
                                : "text-[#8C7E86] hover:text-rose-600 bg-[#FAF7F2] hover:bg-rose-50"
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`}
                            />
                            <span>{story.likes_count || 0}</span>
                          </button>

                          <Link
                            to={story.storybook_slug ? `/personalize/${story.storybook_slug}` : "/storybooks"}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[13px] font-medium text-[#7A6B74] hover:text-[#A85341] transition-colors inline-flex items-center gap-1 group/link"
                          >
                            <span>Read their adventure</span>
                            <span className="transition-transform group-hover/link:translate-x-0.5">→</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>

            {/* Running Indicator Dots */}
            <div className="flex items-center justify-center gap-2 mt-4 sm:mt-7">
              {stories.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => setCarouselIndex(idx)}
                  aria-label={`Jump to review ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    carouselIndex === idx
                      ? "w-7 sm:w-8 h-2 bg-[#A85341]"
                      : "w-2 h-2 bg-[#E0D4CA] hover:bg-[#C98A84]"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. Bottom Call-to-Action */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 mt-10 sm:mt-16 w-full">
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#321424] via-[#431A31] to-[#200B17] text-white p-6 sm:p-10 text-center overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/20 text-xs font-semibold uppercase tracking-wider mb-3 sm:mb-4">
              Your Turn to Make Magic
            </span>

            <h2 className="font-editorial-serif text-xl sm:text-4xl font-bold mb-2 sm:mb-3 text-[#FFF9F5] leading-tight">
              Ready to hear your Kutty say: “Mommy, that’s ME!!”
            </h2>

            <p className="text-xs sm:text-base text-[#E5B5A1] leading-relaxed mb-5 sm:mb-7">
              Choose from exciting personalized adventures — dinosaurs, baking, unicorns, space
              missions — and preview the first 5 pages for free in under 60 seconds!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <Link
                to="/storybooks"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#E5B5A1] to-[#C98A84] hover:from-[#E8BEAC] hover:to-[#D49892] text-[#2D222A] font-bold text-sm tracking-wide shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 inline-flex items-center justify-center gap-2"
              >
                <span>Browse Storybooks & Personalize</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/how-it-works"
                className="w-full sm:w-auto px-6 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition border border-white/20 inline-flex items-center justify-center"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
