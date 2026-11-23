import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  X,
  BookOpen,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ScrollText,
  CheckCircle,
  Eye
} from "lucide-react";
import { StoryTemplate, StoryPage, api } from "@/lib/api";

interface StoryReaderModalProps {
  story: StoryTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  initialPageNumber?: number;
}

export function StoryReaderModal({
  story,
  isOpen,
  onClose,
  initialPageNumber = 1
}: StoryReaderModalProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [readingMode, setReadingMode] = useState<"spread" | "scroll">("spread");
  const [previewChildName, setPreviewChildName] = useState("Aarav");
  const [isEditingName, setIsEditingName] = useState(false);
  const [defaultPdfPrice, setDefaultPdfPrice] = useState<number>(799);
  const [defaultHardcoverPrice, setDefaultHardcoverPrice] = useState<number>(1399);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Touch swipe support for mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const minSwipeDistance = 40;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentPageIndex < pages.length - 1) {
      goToNextPage();
    } else if (isRightSwipe && currentPageIndex > 0) {
      goToPrevPage();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    api.getAnnouncement().then((ann) => {
      if (ann?.default_pdf_price) {
        setDefaultPdfPrice(Number(ann.default_pdf_price));
      }
      if (ann?.default_hardcover_price) {
        setDefaultHardcoverPrice(Number(ann.default_hardcover_price));
      }
    }).catch(() => {});
  }, [isOpen]);

  // Filter and prepare story pages
  const pages: StoryPage[] = useMemo(() => {
    if (!story || !story.pages || story.pages.length === 0) {
      return [
        {
          id: "preview-1",
          story_id: story?.id || "preview",
          page_index: 0,
          page_number: 1,
          page_type: "story",
          story_text: `Once upon a time, in a cozy room filled with starlight, [Name] discovered a curious little door hidden behind the bookshelf. It glowed with a warm, golden sparkle that smelled of fresh pine and ancient wonders.`,
          extracted_text: "",
          scene_description: "A cozy bedroom with a glowing miniature door behind books, casting magical light on [Name].",
          character_guidance: "Child looking with wide, curious eyes and a joyful smile.",
          prompt_template: "",
          personalization_required: true,
          allow_illustration_generation: true,
          original_image_path: "",
          original_image_url: story?.cover_image_url || "/unicorn_cover.png"
        },
        {
          id: "preview-2",
          story_id: story?.id || "preview",
          page_index: 1,
          page_number: 2,
          page_type: "story",
          story_text: `Taking a deep, brave breath, [Name] turned the little brass key. With a soft click, a path made of shimmering stepping stones unfurled into the Enchanted Forest, where friendly creatures bowed in welcoming salute.`,
          extracted_text: "",
          scene_description: "Stepping onto glowing stones winding through a luminous fairytale forest.",
          character_guidance: "Child wearing a courageous adventurer outfit with a warm cape.",
          prompt_template: "",
          personalization_required: true,
          allow_illustration_generation: true,
          original_image_path: "",
          original_image_url: story?.cover_image_url || "/unicorn_cover.png"
        },
        {
          id: "preview-3",
          story_id: story?.id || "preview",
          page_index: 2,
          page_number: 3,
          page_type: "story",
          story_text: `“We have been waiting for you, Little Champion,” whispered the wise Owl perched upon the silver branch. “Your kindness and laughter are the keys that will restore peace to our kingdom!”`,
          extracted_text: "",
          scene_description: "A majestic ancient owl with sparkling golden eyes talking to [Name] beneath the moon.",
          character_guidance: "Child smiling proudly, standing tall with confidence.",
          prompt_template: "",
          personalization_required: true,
          allow_illustration_generation: true,
          original_image_path: "",
          original_image_url: story?.cover_image_url || "/unicorn_cover.png"
        }
      ];
    }

    const sorted = [...story.pages].sort((a, b) => (a.page_index ?? a.page_number) - (b.page_index ?? b.page_number));
    return sorted;
  }, [story]);

  // Reset to initial page when opening
  useEffect(() => {
    if (isOpen) {
      const idx = pages.findIndex((p) => p.page_number === initialPageNumber);
      setCurrentPageIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, initialPageNumber, pages]);

  // Keyboard arrow navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" && readingMode === "spread") {
        setCurrentPageIndex((prev) => Math.min(prev + 1, pages.length - 1));
      } else if (e.key === "ArrowLeft" && readingMode === "spread") {
        setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, readingMode, pages.length, onClose]);

  if (!isOpen || !story) return null;

  const currentPage = pages[currentPageIndex] || pages[0];
  const progressPercent = Math.round(((currentPageIndex + 1) / Math.max(pages.length, 1)) * 100);

  // Helper to replace name placeholders with glowing chip
  const renderPersonalizedText = (rawText?: string) => {
    if (!rawText) return "Story scene illustration spread.";
    
    const placeholderRegex = /(\[name\]|\{name\}|\[child_name\]|\{child_name\})/gi;
    const parts = rawText.split(placeholderRegex);

    return parts.map((part, i) => {
      if (placeholderRegex.test(part)) {
        return (
          <span
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md bg-[#FAEEED] text-[#C98A84] font-bold border border-[#C98A84]/30 shadow-2xs transition-all hover:bg-[#F5DFDC]"
            title="Your child's name will appear here in the custom book!"
          >
            {previewChildName || "Your Child"}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Helper to extract first character for drop cap
  const getDropCap = (rawText?: string) => {
    if (!rawText) return { dropCap: "O", remainder: "nce upon a time..." };
    const cleaned = rawText.trim();
    if (cleaned.length === 0) return { dropCap: "O", remainder: "" };
    
    let firstChar = cleaned.charAt(0);
    let remainder = cleaned.slice(1);
    if ((firstChar === '"' || firstChar === "“" || firstChar === "'") && cleaned.length > 1) {
      firstChar = cleaned.slice(0, 2);
      remainder = cleaned.slice(2);
    }
    return { dropCap: firstChar, remainder };
  };

  const rawText = currentPage?.story_text || currentPage?.extracted_text || "";
  const { dropCap, remainder } = getDropCap(rawText);

  const goToNextPage = () => {
    setCurrentPageIndex((prev) => Math.min(prev + 1, pages.length - 1));
  };

  const goToPrevPage = () => {
    setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-0 sm:p-4 bg-[#2D222A]/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Fairytale Story Reader Card — Full viewport height on mobile, elegant card on tablet/desktop */}
      <div className="relative w-full max-w-5xl bg-[#FAF7F2] rounded-none sm:rounded-3xl border-0 sm:border border-[#E8DEC8] shadow-2xl flex flex-col h-[100dvh] sm:h-[94vh] sm:max-h-[820px] z-10 overflow-hidden">
        
        {/* ─── 1. Header Toolbar (Compact) ─── */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-white border-b border-[#E8DEC8] flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-2xs">
          {/* Story Meta & Title */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#E8DEC8] shrink-0 bg-[#FAEEED]/40 hidden sm:block">
              <img
                src={story.cover_image_url || "/unicorn_cover.png"}
                alt={story.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FAEEED] text-[#C98A84] border border-[#C98A84]/20">
                  {story.category || "Adventure"}
                </span>
                <span className="text-[11px] text-[#695B64] hidden md:inline">
                  {story.age_range || "Ages 3–7"} • {pages.length} Pages
                </span>
              </div>
              <h2 className="font-editorial-serif text-sm sm:text-lg font-bold text-[#2D222A] truncate leading-tight">
                {story.title}
              </h2>
            </div>
          </div>

          {/* Interactive Controls & Close Button */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* View Mode Toggle: Spread vs Continuous Scroll */}
            <div className="inline-flex p-0.5 rounded-full bg-[#FAF7F2] border border-[#E8DEC8] text-xs">
              <button
                onClick={() => setReadingMode("spread")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  readingMode === "spread"
                    ? "bg-[#C98A84] text-white shadow-2xs"
                    : "text-[#695B64] hover:text-[#2D222A]"
                }`}
                title="Page-by-page illustrated spread"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Book Spread</span>
              </button>
              <button
                onClick={() => setReadingMode("scroll")}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  readingMode === "scroll"
                    ? "bg-[#C98A84] text-white shadow-2xs"
                    : "text-[#695B64] hover:text-[#2D222A]"
                }`}
                title="Continuous full story text scroll"
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Scroll</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white hover:bg-[#FAEEED] border border-[#E8DEC8] text-[#695B64] hover:text-[#2D222A] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              title="Close story reader (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── 2. Personalization Simulator & Direct Prev/Next Bar (Always Visible) ─── */}
        <div className="px-3 sm:px-6 py-1.5 bg-gradient-to-r from-[#FDFBF7] via-[#FAEEED]/40 to-[#FDFBF7] border-b border-[#E8DEC8] flex items-center justify-between text-xs text-[#695B64] shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C98A84] shrink-0" />
            <span className="font-medium text-[#2D222A] hidden sm:inline">Preview story with name:</span>
            {isEditingName ? (
              <input
                type="text"
                value={previewChildName}
                onChange={(e) => setPreviewChildName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                autoFocus
                placeholder="Child's Name"
                className="px-2 py-0.5 rounded-md border border-[#C98A84] text-xs font-bold text-[#C98A84] bg-white outline-none w-20 sm:w-24"
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="px-2 py-0.5 rounded-md bg-white border border-[#C98A84]/40 font-bold text-[#C98A84] hover:border-[#C98A84] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                title="Click to change child name in preview"
              >
                <span className="truncate max-w-[80px] sm:max-w-none">{previewChildName || "Aarav"}</span>
                <span className="text-[10px] text-[#C98A84]/70 font-normal underline">edit</span>
              </button>
            )}
          </div>

          {/* Quick Page Jump & Direct Next/Prev Controls Right in Top Bar */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPageIndex === 0}
              className="p-1 sm:px-2 sm:py-0.5 rounded-md bg-white border border-[#E8DEC8] hover:bg-[#FAEEED] text-xs font-semibold text-[#2D222A] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[#C98A84]" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <span className="text-xs text-[#695B64] font-medium px-1 whitespace-nowrap">
              Page <strong className="text-[#2D222A]">{currentPageIndex + 1}</strong> of {pages.length}
            </span>

            <button
              onClick={goToNextPage}
              disabled={currentPageIndex >= pages.length - 1}
              className="p-1 sm:px-2.5 sm:py-0.5 rounded-md bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs"
              title="Next Page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* ─── 3. Story Reader Body — Mobile Scrollable & Desktop Compact Spread ─── */}
        <div
          ref={scrollContainerRef}
          className={`flex-1 p-2 sm:p-4 md:p-5 bg-gradient-to-b from-[#FDFBF7] to-[#FAF7F2] ${
            readingMode === "spread"
              ? "flex flex-col justify-between items-center overflow-y-auto md:overflow-hidden"
              : "overflow-y-auto"
          }`}
        >
          {readingMode === "spread" ? (
            /* ─── Mode A: Two-Page Fairytale Book Spread ─── */
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="w-full max-w-4xl flex-1 flex flex-col justify-between relative my-auto select-none sm:select-auto"
            >
              
              {/* ─── Floating Side Navigation: Visible ONLY on large screens (hidden on mobile/tablet to prevent overlapping artwork) ─── */}
              {/* Left Floating Arrow Button */}
              <button
                onClick={goToPrevPage}
                disabled={currentPageIndex === 0}
                className="hidden lg:flex absolute -left-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white hover:bg-[#FAEEED] text-[#2D222A] hover:text-[#C98A84] border-2 border-[#E8DEC8] shadow-xl hover:shadow-2xl items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer transform hover:scale-110 active:scale-95 group"
                title="Previous Page (←)"
              >
                <ChevronLeft className="w-6 h-6 text-[#C98A84] group-hover:-translate-x-0.5 transition-transform" />
              </button>

              {/* Right Floating Arrow Button */}
              <button
                onClick={goToNextPage}
                disabled={currentPageIndex >= pages.length - 1}
                className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white border-2 border-white shadow-xl hover:shadow-2xl items-center justify-center transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer transform hover:scale-110 active:scale-95 group"
                title="Next Page (→)"
              >
                <ChevronRight className="w-6 h-6 text-white group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* The Realistic Open Book Container */}
              <div className="bg-white rounded-xl sm:rounded-3xl border border-[#E8DEC8] shadow-lg overflow-hidden flex flex-col md:flex-row relative flex-1 md:max-h-[60vh]">
                {/* Book Spine Center Crease (Desktop) */}
                <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-8 -translate-x-1/2 bg-gradient-to-r from-black/5 via-black/15 to-transparent pointer-events-none z-20" />

                {/* Left Side: Illustrated Spread / Cover Artwork */}
                <div
                  onClick={() => {
                    if (typeof window !== "undefined" && window.innerWidth >= 768) {
                      goToPrevPage();
                    }
                  }}
                  className="w-full md:w-1/2 p-2.5 sm:p-4 md:p-6 bg-gradient-to-b from-[#FDFCFB] to-[#F5EFE6] flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#E8DEC8] relative group md:cursor-pointer shrink-0"
                  title="Illustration spread"
                >
                  <div className="relative w-auto h-44 sm:h-56 md:h-auto md:w-full md:flex-1 md:max-h-[320px] aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-sm border border-[#E8DEC8]/80 flex items-center justify-center bg-[#FAF7F2] mx-auto">
                    <img
                      src={
                        currentPage.original_image_url ||
                        story.cover_image_url ||
                        "/unicorn_cover.png"
                      }
                      alt={`Illustration for Page ${currentPage.page_number}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = story.cover_image_url || "/unicorn_cover.png";
                      }}
                    />

                    {/* Page badge overlay */}
                    <div className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 px-2 sm:px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-md border border-[#E8DEC8] text-[9px] sm:text-[10px] font-semibold text-[#2D222A] shadow-xs">
                      Spread {currentPageIndex + 1}
                    </div>

                    <div className="absolute bottom-2 right-2 sm:bottom-2.5 sm:right-2.5 px-2 py-0.5 rounded-full bg-[#2D222A]/80 backdrop-blur-md text-[8px] sm:text-[9px] font-medium text-white shadow-xs">
                      8 × 8 Archival Artwork
                    </div>
                  </div>

                  {/* Compact Scene Atmosphere Caption */}
                  {currentPage.scene_description && (
                    <div className="mt-1.5 sm:mt-2 w-full max-w-[280px] sm:max-w-none px-2.5 py-1 sm:py-1.5 rounded-lg bg-white/95 border border-[#E8DEC8] text-[10px] sm:text-[11px] text-[#695B64] leading-tight truncate text-center sm:text-left">
                      <span className="font-semibold text-[#C98A84] mr-1">✦ Scene:</span>
                      {currentPage.scene_description.replace(/\[Name\]|\{name\}/gi, previewChildName)}
                    </div>
                  )}
                </div>

                {/* Right Side: Editorial Parchment Story Text */}
                <div
                  onClick={() => {
                    if (typeof window !== "undefined" && window.innerWidth >= 768) {
                      goToNextPage();
                    }
                  }}
                  className="w-full md:w-1/2 p-3.5 sm:p-5 md:p-7 flex flex-col justify-between bg-gradient-to-b from-[#FCFBF8] to-[#FAF7F2] relative md:cursor-pointer group flex-1 min-h-0 overflow-y-auto"
                  title="Story manuscript text"
                >
                  {/* Classical Page Header */}
                  <div className="flex items-center justify-between border-b border-[#E8DEC8]/60 pb-1.5 sm:pb-2 mb-2 sm:mb-3 shrink-0">
                    <div className="text-[10px] uppercase tracking-widest text-[#C98A84] font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Chapter {Math.ceil((currentPageIndex + 1) / 2)}</span>
                    </div>
                    <span className="font-editorial-serif text-xs text-[#8F9E8B] font-medium">
                      Page {currentPage.page_number || currentPageIndex + 1}
                    </span>
                  </div>

                  {/* Story Content Centered in the Page */}
                  <div className="flex-1 flex flex-col justify-center items-center my-auto py-4 sm:py-6 px-2 sm:px-4 text-center">
                    {rawText ? (
                      <div className="font-story text-base sm:text-lg md:text-xl text-[#2D222A] leading-relaxed sm:leading-loose max-w-md mx-auto">
                        {renderPersonalizedText(rawText)}
                      </div>
                    ) : (
                      <div className="py-4 sm:py-6 text-center space-y-1.5 max-w-md mx-auto">
                        <BookOpen className="w-6 h-6 text-[#C98A84]/60 mx-auto" />
                        <p className="font-story text-xs sm:text-sm text-[#695B64] italic">
                          Full-spread illustration moment celebrating bravery and wonder with {previewChildName}.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Page Footer & Subtle Ornaments */}
                  <div className="pt-2 sm:pt-3 mt-auto border-t border-[#E8DEC8]/60 flex items-center justify-between text-xs text-[#695B64] shrink-0">
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#8F9E8B]">
                      <CheckCircle className="w-3 h-3" />
                      <span>Original Heirloom Script</span>
                    </div>
                    <span className="font-story italic text-xs text-[#695B64]">
                      ~ {currentPageIndex + 1} ~
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── Spread Bottom User-Friendly Navigation Bar ─── */}
              <div className="mt-2 sm:mt-2.5 w-full shrink-0">
                {/* Mobile View: Dedicated, high-contrast, thumb-friendly navigation */}
                <div className="flex sm:hidden items-center justify-between gap-2 bg-white/95 backdrop-blur-md rounded-2xl p-2 border border-[#E8DEC8] shadow-sm">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPageIndex === 0}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#FAF7F2] border border-[#E8DEC8] hover:bg-[#FAEEED] text-xs font-bold text-[#2D222A] disabled:opacity-25 disabled:pointer-events-none flex items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs touch-manipulation"
                    aria-label="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#C98A84]" />
                    <span>Prev</span>
                  </button>

                  <div className="flex-1 flex flex-col items-center justify-center px-1">
                    <span className="text-xs font-bold text-[#2D222A] leading-tight">
                      Page <span className="text-[#C98A84]">{currentPageIndex + 1}</span> of {pages.length}
                    </span>
                    <div className="w-full max-w-[84px] h-1.5 bg-[#FAF7F2] rounded-full overflow-hidden border border-[#E8DEC8] mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-[#DE8F88] to-[#C98A84] rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-[#695B64]/80 mt-0.5">👈 swipe 👉</span>
                  </div>

                  {currentPageIndex < pages.length - 1 ? (
                    <button
                      onClick={goToNextPage}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-bold flex items-center justify-center gap-1 transition-all shadow-md active:scale-95 touch-manipulation"
                      aria-label="Next Page"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                  ) : (
                    <Link
                      to={`/personalize/${story.slug}`}
                      className="flex-1 py-2 px-2 rounded-xl bg-[#8F9E8B] hover:bg-[#7D8C79] text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all shadow-md active:scale-95 text-center truncate touch-manipulation"
                    >
                      <span>Make Book</span>
                      <Sparkles className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>

                {/* Desktop View: Full thumbnail scrubber strip */}
                <div className="hidden sm:flex items-center justify-between gap-3">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPageIndex === 0}
                    className="px-3.5 py-1.5 rounded-full bg-white border border-[#E8DEC8] hover:bg-[#FAEEED] text-xs font-semibold text-[#2D222A] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 text-[#C98A84]" />
                    <span>Previous Page</span>
                  </button>

                  {/* Thumbnails scrubber pills */}
                  <div className="flex items-center gap-1 overflow-x-auto max-w-md py-0.5 px-1">
                    {pages.map((p, idx) => (
                      <button
                        key={p.id || idx}
                        onClick={() => setCurrentPageIndex(idx)}
                        className={`h-6 min-w-[24px] px-2 rounded-md text-[10px] font-semibold transition-all cursor-pointer shrink-0 ${
                          currentPageIndex === idx
                            ? "bg-[#C98A84] text-white shadow-2xs scale-105"
                            : "bg-white text-[#695B64] border border-[#E8DEC8] hover:bg-[#FAEEED]"
                        }`}
                        title={`Go to page ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={goToNextPage}
                    disabled={currentPageIndex >= pages.length - 1}
                    className="px-4 py-1.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 transition-all shadow-2xs cursor-pointer shrink-0"
                  >
                    <span>Next Page</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ─── Mode B: Continuous Manuscript Chapter Scroll ─── */
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 py-2">
              <div className="text-center py-3 sm:py-4 border-b border-[#E8DEC8] space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#C98A84] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>The Complete Manuscript</span>
                </div>
                <h3 className="font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A]">
                  {story.title}
                </h3>
                <p className="text-xs text-[#695B64]">
                  Read the complete narrative from beginning to end before personalizing.
                </p>
              </div>

              {/* Flowing pages */}
              {pages.map((p, idx) => {
                const text = p.story_text || p.extracted_text || "";
                const { dropCap: pageDropCap, remainder: pageRemainder } = getDropCap(text);
                return (
                  <div
                    key={p.id || idx}
                    className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-[#E8DEC8] shadow-xs space-y-3 relative"
                  >
                    <div className="flex items-center justify-between border-b border-[#E8DEC8]/60 pb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#C98A84]">
                        Page {p.page_number || idx + 1} Spread
                      </span>
                      <span className="text-[11px] text-[#695B64]">Chapter {Math.ceil((idx + 1) / 2)}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 aspect-square rounded-xl overflow-hidden border border-[#E8DEC8] bg-[#FAF7F2] shadow-2xs mx-auto sm:mx-0">
                        <img
                          src={p.original_image_url || story.cover_image_url || "/unicorn_cover.png"}
                          alt={`Scene Page ${p.page_number}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {text ? (
                          <p className="font-story text-sm sm:text-base text-[#2D222A] leading-relaxed">
                            <span className="font-editorial-serif text-2xl text-[#C98A84] font-bold mr-0.5">
                              {pageDropCap}
                            </span>
                            {renderPersonalizedText(pageRemainder)}
                          </p>
                        ) : (
                          <p className="font-story text-xs text-[#695B64] italic">
                            Full-bleed personalized fairytale scene spread.
                          </p>
                        )}
                        {p.scene_description && (
                          <div className="mt-2 text-[10px] text-[#695B64] italic">
                            ✦ {p.scene_description.replace(/\[Name\]|\{name\}/gi, previewChildName)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── 4. High-Converting Bottom Sticky Bar (Compact & Always Visible) ─── */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-white border-t border-[#E8DEC8] flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2.5 shrink-0 shadow-md">
          <div className="text-center sm:text-left">
            <div className="text-[11px] sm:text-xs text-[#695B64] leading-tight">
              Love this story? Make <strong className="text-[#2D222A]">{previewChildName}</strong> the hero across all {pages.length} pages:
            </div>
            <div className="flex items-baseline gap-1.5 justify-center sm:justify-start">
              <span className="font-editorial-serif text-sm sm:text-lg font-bold text-[#2D222A]">
                ₹{story.price_digital ? Number(story.price_digital).toLocaleString("en-IN") : defaultPdfPrice}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#695B64]">Digital</span>
              <span className="text-[#C98A84]">•</span>
              <span className="text-[11px] sm:text-xs font-medium text-[#695B64]">
                ₹{story.price_print ? Number(story.price_print).toLocaleString("en-IN") : defaultHardcoverPrice.toLocaleString("en-IN")} 8×8 Keepsake Hardcover
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 sm:py-2 rounded-full border border-[#E8DEC8] bg-[#FAF7F2] hover:bg-[#FAEEED] text-xs font-semibold text-[#2D222A] transition-colors cursor-pointer w-auto shrink-0 text-center"
            >
              Back to Catalog
            </button>
            <Link
              to={`/personalize/${story.slug}`}
              className="flex-1 sm:flex-none px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
            >
              <span>Personalize with {previewChildName}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
