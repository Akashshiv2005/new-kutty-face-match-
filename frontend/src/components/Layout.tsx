import { useState, useEffect, useMemo } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Sparkles, ShieldCheck, Menu, X, ArrowRight, Tag, Copy, Check, Gift } from "lucide-react";
import FooterFeedbackForm from "./FooterFeedbackForm";
import GrandmaChatbot from "./GrandmaChatbot";
import { api, AnnouncementSettings, NoticeItem } from "@/lib/api";

// =========================================================================
// KUTTYSTORY SOCIAL MEDIA CONFIGURATION
// To connect official accounts, replace the placeholder URLs below with the real KuttyStory pages:
// =========================================================================
export const KUTTYSTORY_SOCIAL_LINKS = {
  // Replace with official Instagram profile URL (e.g., "https://www.instagram.com/kuttystory")
  instagram: "https://www.instagram.com/kuttystory.co",
  // Replace with official WhatsApp link or phone number (e.g., "https://wa.me/91XXXXXXXXXX")
  whatsapp: "https://wa.me/919003169615",
  // Replace with official Facebook page URL (e.g., "https://www.facebook.com/kuttystory")
  facebook: "https://www.facebook.com/people/KUTTY-STORY/61593938865227/",
};

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function FacebookIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}


export function GiftBoxIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="giftShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#BA5A5E" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#BA5A5E" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="giftBoxFront" x1="12" y1="20" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE3DE" />
          <stop offset="100%" stopColor="#F5BFB5" />
        </linearGradient>
        <linearGradient id="giftBoxLid" x1="10" y1="14" x2="38" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF0ED" />
          <stop offset="100%" stopColor="#F8CEC5" />
        </linearGradient>
        <linearGradient id="giftRibbon" x1="14" y1="6" x2="34" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D46F74" />
          <stop offset="50%" stopColor="#BA5A5E" />
          <stop offset="100%" stopColor="#9C4448" />
        </linearGradient>
        <linearGradient id="giftBowHighlight" x1="18" y1="6" x2="30" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E5858A" />
          <stop offset="100%" stopColor="#BA5A5E" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="24" cy="42" rx="16" ry="3" fill="url(#giftShadow)" />

      {/* Main Box Body */}
      <rect x="13" y="20" width="22" height="19" rx="2.5" fill="url(#giftBoxFront)" stroke="#E5A69E" strokeWidth="0.8" />

      {/* Vertical Ribbon on Box Body */}
      <rect x="21.5" y="20" width="5" height="19" fill="url(#giftRibbon)" />

      {/* Lid Overhang */}
      <rect x="11" y="15" width="26" height="6.5" rx="1.8" fill="url(#giftBoxLid)" stroke="#E5A69E" strokeWidth="0.8" />

      {/* Vertical Ribbon on Lid */}
      <rect x="21.5" y="15" width="5" height="6.5" fill="url(#giftRibbon)" />

      {/* Bow Left Loop */}
      <path
        d="M23.5 15C21 11 14 9 15.5 14C16.8 17.5 22 15.5 23.5 15Z"
        fill="url(#giftBowHighlight)"
        stroke="#9C4448"
        strokeWidth="0.6"
      />
      {/* Bow Right Loop */}
      <path
        d="M24.5 15C27 11 34 9 32.5 14C31.2 17.5 26 15.5 24.5 15Z"
        fill="url(#giftBowHighlight)"
        stroke="#9C4448"
        strokeWidth="0.6"
      />

      {/* Bow Center Knot */}
      <ellipse cx="24" cy="15" rx="2.5" ry="2" fill="#9C4448" />

      {/* Floating Sparkles around Gift */}
      <path
        d="M9 13C9 14.2 9.5 14.8 10.5 15C9.5 15.2 9 15.8 9 17C9 15.8 8.5 15.2 7.5 15C8.5 14.8 9 14.2 9 13Z"
        fill="#D46F74"
        opacity="0.85"
      />
      <path
        d="M38 11C38 12 38.4 12.5 39.2 12.7C38.4 12.9 38 13.4 38 14.5C38 13.4 37.6 12.9 36.8 12.7C37.6 12.5 38 12 38 11Z"
        fill="#D46F74"
        opacity="0.75"
      />
      <circle cx="10" cy="28" r="0.9" fill="#D46F74" opacity="0.6" />
      <circle cx="37" cy="25" r="0.9" fill="#D46F74" opacity="0.6" />
    </svg>
  );
}

export function CornerLeavesLeft({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="leafGradLeft" x1="0" y1="40" x2="30" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EAA49E" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#F5BFB8" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FDE5E1" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <path d="M0 38C8 36 16 30 22 20" stroke="#D9948E" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <path d="M4 35C2 28 8 22 14 24C16 28 10 34 4 35Z" fill="url(#leafGradLeft)" />
      <path d="M12 28C10 20 18 16 23 18C24 23 18 28 12 28Z" fill="url(#leafGradLeft)" />
      <path d="M19 22C18 15 25 11 29 13C30 17 25 22 19 22Z" fill="url(#leafGradLeft)" />
      <path d="M6 38C12 36 18 37 20 34C16 31 10 33 6 38Z" fill="url(#leafGradLeft)" opacity="0.7" />
    </svg>
  );
}

export function CornerLeavesRight({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="leafGradRight" x1="40" y1="40" x2="10" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EAA49E" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#F5BFB8" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#FDE5E1" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <path d="M40 38C32 36 24 30 18 20" stroke="#D9948E" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <path d="M36 35C38 28 32 22 26 24C24 28 30 34 36 35Z" fill="url(#leafGradRight)" />
      <path d="M28 28C30 20 22 16 17 18C16 23 22 28 28 28Z" fill="url(#leafGradRight)" />
      <path d="M21 22C22 15 15 11 11 13C10 17 15 22 21 22Z" fill="url(#leafGradRight)" />
      <path d="M34 38C28 36 22 37 20 34C24 31 30 33 34 38Z" fill="url(#leafGradRight)" opacity="0.7" />
    </svg>
  );
}

export function renderFormattedNotice(rawText: string, couponCode?: string, badge?: string) {
  const display = getDisplayNoticeText(rawText, couponCode);
  const discountMatch = display.match(/^(.*?)(?:(\d+%\s*off)|(\d+%\s*OFF))(.*)$/i);

  if (discountMatch) {
    const prefix = discountMatch[1].trim() || "Get";
    const discountPill = discountMatch[2] || discountMatch[3];
    let suffix = discountMatch[4].trim();
    if (suffix.toLowerCase().startsWith("your child")) {
      suffix = "on " + suffix;
    }

    // Concise label for mobile so it never awkwardly clips with an ellipsis
    const mobileSuffix = suffix
      .replace(/on your child's first personalized storybook/i, "on first book")
      .replace(/your child's first personalized storybook/i, "first book")
      .replace(/on your child's first storybook/i, "on first book");

    return (
      <span className="inline-flex items-center gap-1 sm:gap-1.5 flex-nowrap justify-center min-w-0 max-w-full">
        <span className="hidden sm:inline shrink-0">{prefix}</span>
        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#BA5A5E] text-white font-bold text-[10px] sm:text-[13px] shadow-xs shrink-0">
          {discountPill}
        </span>
        <span className="sm:hidden truncate text-[11px]">{mobileSuffix}</span>
        <span className="hidden sm:inline truncate text-[13.5px]">{suffix}</span>
      </span>
    );
  }

  if (badge) {
    return (
      <span className="inline-flex items-center gap-1 sm:gap-1.5 flex-nowrap justify-center min-w-0 max-w-full">
        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-[#BA5A5E] text-white font-bold text-[10px] sm:text-[13px] shadow-xs shrink-0">
          {badge}
        </span>
        <span className="truncate text-[11px] sm:text-[13.5px]">{display}</span>
      </span>
    );
  }

  return <span className="truncate text-[11px] sm:text-[13.5px]">{display}</span>;
}

function getDisplayNoticeText(rawText: string, couponCode?: string) {
  if (!rawText) return "";
  if (!couponCode) return rawText;
  const escaped = couponCode.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleaned = rawText
    .replace(new RegExp(`(?:\\s*[,.-]?\\s*(?:with|use)?\\s*code[:\\s]+${escaped}\\s*\\.?)$`, "i"), "")
    .trim();
  return cleaned || rawText;
}

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSocialOpen, setMobileSocialOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<AnnouncementSettings | null>(null);
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeNoticeIdx, setActiveNoticeIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const allNotices = useMemo<NoticeItem[]>(() => {
    if (!announcement) return [];
    const primary: NoticeItem = {
      badge: announcement.badge,
      text: announcement.text,
      coupon_code: announcement.coupon_code,
      link_label: announcement.link_label,
      link_url: announcement.link_url,
    };
    const extras = (announcement.notices || []).filter((n) => n.text && n.text.trim().length > 0);
    return [primary, ...extras];
  }, [announcement]);

  useEffect(() => {
    api.getAnnouncement()
      .then((data) => {
        setAnnouncement(data);
      })
      .catch((err) => console.error("Error fetching announcement:", err));
  }, []);

  // Auto-cycle through all notices/offers smoothly
  useEffect(() => {
    if (allNotices.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setActiveNoticeIdx((curr) => (curr + 1) % allNotices.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [allNotices.length, isHovered]);

  // Keep index within bounds if notices change
  useEffect(() => {
    if (activeNoticeIdx >= allNotices.length) {
      setActiveNoticeIdx(0);
    }
  }, [allNotices.length, activeNoticeIdx]);

  const currentNotice = allNotices[activeNoticeIdx] || allNotices[0];

  const handleCopyCoupon = (e: React.MouseEvent, code?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!code) return;
    const clean = code.trim();
    navigator.clipboard.writeText(clean);
    try {
      sessionStorage.setItem("kuttystory_copied_coupon", clean);
      window.dispatchEvent(new CustomEvent("kuttystory_coupon_copied", { detail: clean }));
    } catch { }
    setCopiedCode(clean);
    setTimeout(() => {
      setCopiedCode((curr) => (curr === clean ? null : curr));
    }, 2200);
  };

  const navLinks = [
    { label: "Home", path: "/", end: true },
    { label: "About", path: "/about" },
    { label: "Books", path: "/storybooks" },
    { label: "How It Works", path: "/how-it-works" },
    { label: "Foot Steps", path: "/footsteps" },
    { label: "Kutty's Story", path: "/kuttys-story" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2D222A]">
      {/* Sticky Container for Announcement Bar + Header (Always visible when scrolling) */}
      <div className="sticky top-0 z-50 w-full shadow-xs">
        {/* 1. Global Announcement Bar (Pill Bar: Corner Leaves, 3D Gift Box, Highlight Pill & Use Code Button) */}
        {!announcementDismissed && announcement?.is_active && allNotices.length > 0 && (
          <aside
            aria-label="Announcement"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="w-full bg-[#FAF7F2] py-1.5 sm:py-2 px-2 sm:px-4 md:px-6 select-none border-b border-[#F7DCD7]/60"
          >
            <div className="max-w-6xl mx-auto relative rounded-full bg-gradient-to-r from-[#FFF5F4] via-[#FDF0EE] to-[#FFF5F4] border border-[#F7D8D3] shadow-[0_2px_12px_rgba(186,90,94,0.06)] px-2.5 sm:px-5 py-1 sm:py-1.5 flex items-center justify-between gap-1.5 sm:gap-4 overflow-hidden">

              {/* Left Group: Gift Icon with soft circle */}
              <div className="relative z-10 flex items-center shrink-0 pl-0.5 sm:pl-1">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#FAEEED] border border-[#F2DCD8] flex items-center justify-center text-[#BA5A5E] shadow-2xs">
                  <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BA5A5E]" />
                </div>
              </div>

              {/* Center Content: Formatted Notice + Sparkles with Smooth Cross-Fade Transition */}
              <div className="relative z-10 flex-1 overflow-hidden flex items-center justify-center min-w-0 px-1">
                <div
                  key={activeNoticeIdx}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-500 flex items-center justify-center gap-1 sm:gap-2 text-center text-[#33272D] text-xs sm:text-[13.5px] font-medium whitespace-nowrap overflow-hidden max-w-full py-0.5"
                >
                  {renderFormattedNotice(currentNotice.text, currentNotice.coupon_code, currentNotice.badge)}
                  {/* Rose Sparkle Stars ✦ ✦ (Desktop only) */}
                  <span className="hidden md:inline-flex items-center gap-1 text-[#BA5A5E] shrink-0 select-none ml-1">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M8 0C8 4.4 9.6 6 14 6C9.6 6 8 7.6 8 12C8 7.6 6.4 6 2 6C6.4 6 8 4.4 8 0Z" />
                    </svg>
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-80 -mt-1.5">
                      <path d="M8 0C8 4.4 9.6 6 14 6C9.6 6 8 7.6 8 12C8 7.6 6.4 6 2 6C6.4 6 8 4.4 8 0Z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Right Group: Use Code Button + Close ✕ Button */}
              <div className="relative z-10 flex items-center gap-1 sm:gap-2.5 shrink-0">
                {currentNotice?.coupon_code ? (
                  <button
                    key={`coupon-${activeNoticeIdx}`}
                    type="button"
                    onClick={(e) => handleCopyCoupon(e, currentNotice.coupon_code)}
                    className="animate-in fade-in duration-300 inline-flex items-center gap-1 sm:gap-2 px-2 sm:pl-3.5 sm:pr-3 py-0.5 sm:py-1 rounded-full bg-[#BA5A5E] hover:bg-[#A84E52] active:scale-95 text-white transition-all shadow-xs cursor-pointer text-xs whitespace-nowrap group/code shrink-0"
                    title="Click to copy promo code"
                  >
                    <span className="hidden sm:inline text-[11px] sm:text-[12px] font-medium text-white/95">Use code</span>
                    <span className="font-mono font-bold tracking-wider text-[#33272D] bg-[#FCECE9] px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] shadow-inner">
                      {currentNotice.coupon_code}
                    </span>
                    {copiedCode === currentNotice.coupon_code?.trim() ? (
                      <span className="inline-flex items-center gap-0.5 text-emerald-200 text-xs font-bold animate-in fade-in">
                        <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-300" />
                        <span className="hidden md:inline text-[10px]">Copied</span>
                      </span>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-white/90 sm:hidden" />
                        <ArrowRight className="w-3.5 h-3.5 text-white hidden sm:inline group-hover/code:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                ) : currentNotice?.link_label ? (
                  <Link
                    key={`link-${activeNoticeIdx}`}
                    to={currentNotice.link_url || "/storybooks"}
                    className="animate-in fade-in duration-300 inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full bg-[#BA5A5E] hover:bg-[#A84E52] text-white text-[11px] sm:text-xs font-semibold shadow-xs shrink-0"
                  >
                    <span>{currentNotice.link_label}</span>
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                  </Link>
                ) : null}

                {/* Circular Close ✕ Button */}
                <button
                  type="button"
                  onClick={() => setAnnouncementDismissed(true)}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border border-[#E8B8B0]/80 text-[#33272D] hover:bg-[#FDF2F0] hover:text-[#BA5A5E] hover:rotate-90 flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0"
                  title="Close announcement"
                  aria-label="Close announcement"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4 stroke-[2.2]" />
                </button>
              </div>

            </div>
          </aside>
        )}

        {/* Editorial Header */}
        <header className="bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#EBE3D9] transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-2.5 sm:space-x-3 group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white border border-[#EBE3D9] p-0.5 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden shadow-xs shrink-0">
                  <img src="/logo.png" alt="KuttyStory Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="font-editorial-serif text-xl sm:text-2xl font-bold tracking-tight text-[#2D222A] block leading-none">
                    KuttyStory
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#695B64] font-medium">
                    Editorial Atelier
                  </span>
                </div>
              </Link>
            </div>

            {/* Primary Navigation Menu (Desktop) */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {navLinks.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3.5 py-2 rounded-full text-xs xl:text-sm font-medium transition-all relative ${isActive
                      ? "text-[#C98A84] bg-[#FAEEED]/70 font-semibold"
                      : "text-[#4E424B] hover:text-[#C98A84] hover:bg-[#FAEEED]/30"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <span className="flex items-center gap-1.5">
                      {item.label}
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C98A84] inline-block" />
                      )}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Action CTA & Mobile Hamburger */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link
                to="/storybooks"
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs sm:text-sm font-medium shadow-xs hover:shadow transition-all"
              >
                <span>Personalize a Story</span>
                <Sparkles className="w-3.5 h-3.5" />
              </Link>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-[#EBE3D9] flex items-center justify-center text-[#2D222A] hover:text-[#C98A84] transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer / Overlay */}
          {mobileMenuOpen && (
            <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-[#EBE3D9] px-4 pt-3 pb-6 animate-in slide-in-from-top duration-200 max-h-[calc(100vh-70px)] overflow-y-auto">
              <div className="flex flex-col space-y-1">
                {navLinks.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${isActive
                        ? "bg-[#FAEEED] text-[#C98A84] font-semibold"
                        : "text-[#2D222A] hover:bg-[#FAF7F2]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span>{item.label}</span>
                        {isActive && <Sparkles className="w-4 h-4 text-[#C98A84]" />}
                      </>
                    )}
                  </NavLink>
                ))}

                <div className="pt-3 border-t border-[#EBE3D9] mt-2 space-y-3">
                  <Link
                    to="/storybooks"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-3 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs"
                  >
                    <span>Personalize A Storybook</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  {/* Connect on Social inside Mobile Menu */}
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <span className="text-[11px] text-[#695B64] font-medium mr-1">Follow Us:</span>
                    <a
                      href={KUTTYSTORY_SOCIAL_LINKS.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EBE3D9] text-[#695B64] hover:text-[#C98A84] flex items-center justify-center transition shadow-2xs"
                    >
                      <InstagramIcon className="w-4 h-4" />
                    </a>
                    <a
                      href={KUTTYSTORY_SOCIAL_LINKS.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="WhatsApp"
                      className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EBE3D9] text-[#25D366] flex items-center justify-center transition shadow-2xs"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                    </a>
                    <a
                      href={KUTTYSTORY_SOCIAL_LINKS.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EBE3D9] text-[#1877F2] flex items-center justify-center transition shadow-2xs"
                    >
                      <FacebookIcon className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </header>
      </div>

      {/* Main page content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Editorial Footer */}
      <footer className="bg-[#F7F3EC] border-t border-[#EBE3D9] py-14 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#EBE3D9] bg-white p-0.5 shadow-2xs flex items-center justify-center">
                  <img src="/logo.png" alt="KuttyStory" className="w-full h-full object-contain" />
                </div>
                <span className="font-editorial-serif text-xl font-bold text-[#2D222A]">
                  KuttyStory
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#695B64]">
                Creating personalized heirloom storybooks that nurture wonder, bravery, and lasting memories for children around the world.
              </p>
              <div className="flex items-center gap-2 text-xs text-[#8F9E8B] font-medium">
                <ShieldCheck className="w-4 h-4 text-[#8F9E8B]" />
                <span>Verified Guardian Data Protection</span>
              </div>

              {/* Social Media Links */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2D222A] block mb-2.5">
                  Follow & Connect
                </span>
                <div className="flex items-center gap-2.5">
                  <a
                    href={KUTTYSTORY_SOCIAL_LINKS.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram - Follow KuttyStory"
                    className="w-8 h-8 rounded-full bg-white border border-[#EBE3D9] hover:border-[#C98A84] text-[#695B64] hover:text-[#C98A84] flex items-center justify-center transition shadow-2xs hover:shadow-xs"
                    title="Instagram - Follow KuttyStory (Configurable in src/components/Layout.tsx)"
                  >
                    <InstagramIcon className="w-4 h-4" />
                  </a>

                  <a
                    href={KUTTYSTORY_SOCIAL_LINKS.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp - Chat with KuttyStory"
                    className="w-8 h-8 rounded-full bg-white border border-[#EBE3D9] hover:border-[#25D366] text-[#695B64] hover:text-[#25D366] flex items-center justify-center transition shadow-2xs hover:shadow-xs"
                    title="WhatsApp - Connect with KuttyStory (Configurable in src/components/Layout.tsx)"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                  </a>

                  <a
                    href={KUTTYSTORY_SOCIAL_LINKS.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook - Connect with KuttyStory"
                    className="w-8 h-8 rounded-full bg-white border border-[#EBE3D9] hover:border-[#1877F2] text-[#695B64] hover:text-[#1877F2] flex items-center justify-center transition shadow-2xs hover:shadow-xs"
                    title="Facebook - KuttyStory (Configurable in src/components/Layout.tsx)"
                  >
                    <FacebookIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-editorial-serif text-sm font-semibold uppercase tracking-wider text-[#2D222A] mb-4">
                Explore Atelier
              </h4>
              <ul className="space-y-2.5 text-xs text-[#695B64]">
                <li><Link to="/stories" className="hover:text-[#C98A84] transition-colors">Personalised Story Books</Link></li>
                <li><Link to="/stories#birthday-gifts" className="hover:text-[#C98A84] transition-colors">Birthday Gifts for Kids</Link></li>
                <li><Link to="/kuttys-story" className="hover:text-[#C98A84] transition-colors">Kutty's Story</Link></li>
                <li><Link to="/about" className="hover:text-[#C98A84] transition-colors">About Us</Link></li>
                <li><Link to="/about#contact" className="hover:text-[#C98A84] transition-colors">Contact Atelier</Link></li>
                <li><Link to="/footsteps" className="hover:text-[#C98A84] transition-colors">Foot Steps Milestones</Link></li>
                <li><Link to="/how-it-works" className="hover:text-[#C98A84] transition-colors">How It Works</Link></li>
                <li><Link to="/collections" className="hover:text-[#C98A84] transition-colors">Thematic Collections</Link></li>
                <li><Link to="/collections#birthday-return-gifts" className="hover:text-[#C98A84] transition-colors">Birthday Return Gifts</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-editorial-serif text-sm font-semibold uppercase tracking-wider text-[#2D222A] mb-4">
                Privacy & Trust
              </h4>
              <p className="text-xs text-[#695B64] leading-relaxed mb-3">
                Children's photographs are stored in private encrypted storage and processed solely for book generation with parental consent.
              </p>
              <div className="space-y-1.5 text-xs">
                <div>
                  <Link to="/privacy" className="text-[#8B3DFF] hover:underline font-semibold inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Child Privacy Charter →</span>
                  </Link>
                </div>
                <div>
                  <Link to="/terms#refund-policy" className="text-[#695B64] hover:text-[#2D222A] hover:underline">
                    Cancellation &amp; Refund Policy
                  </Link>
                </div>
                <div className="text-[11px] text-[#695B64] pt-2 space-y-1">
                  <div>📍 Tiruchirappalli, Tamil Nadu, India</div>
                  <div>📞 <a href="https://wa.me/9003169615" className="hover:underline">+91 90031 69615</a></div>
                  <div>✉️ <a href="mailto:info@kuttystory.co.in" className="hover:underline">info@kuttystory.co.in</a></div>
                  <div>⏰ Mon – Sat: 9:30 AM – 6:30 PM IST</div>
                </div>
              </div>
              <div className="text-[11px] text-[#A2949E] mt-3">
                ReportLab 8×8 inch Print Ready Engine • ISO 19005 Compliance
              </div>
            </div>

            {/* Column 4: Share Feedback Form */}
            <div>
              <FooterFeedbackForm />
            </div>
          </div>


          <div className="mt-12 pt-6 border-t border-[#EBE3D9] flex flex-col sm:flex-row items-center justify-between text-xs text-[#695B64] gap-4">
            <div className="text-center sm:text-left leading-relaxed">
              <p>© 2026 Kutty Story. All Rights Reserved.</p>
              <p className="mt-0.5">
                Designed &amp; Developed by{" "}
                <a
                  href="https://izonetech.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#2D222A] hover:text-[#C98A84] underline underline-offset-2 transition-colors"
                >
                  iZone Technologies
                </a>
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-[11px] sm:text-xs">
              <Link to="/privacy" className="hover:text-[#2D222A] hover:underline transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[#2D222A] hover:underline transition-colors">Terms of Service</Link>
              <Link to="/terms#refund-policy" className="hover:text-[#2D222A] hover:underline transition-colors">Refund Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Social Media & Quick Contact Dock */}
      <aside
        aria-label="Floating Social Media & Contact Links"
        className="fixed bottom-3 right-3 sm:bottom-8 sm:right-6 z-30 flex flex-col items-center gap-2 animate-in fade-in duration-300 pointer-events-auto"
      >
        {/* Grandma AI Chatbot: Placed Before Instagram (Always accessible on desktop & mobile) */}
        <GrandmaChatbot />

        {/* Instagram & Facebook (Visible on desktop OR when mobile speed-dial is expanded) */}
        <div
          className={`flex flex-col items-center gap-2 transition-all duration-300 ${mobileSocialOpen ? "opacity-100 scale-100 pointer-events-auto" : "hidden sm:flex"
            }`}
        >
          {/* Instagram */}
          <div className="relative group">
            <a
              href={KUTTYSTORY_SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram - Follow KuttyStory"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-[#E1306C] text-[#C98A84] hover:text-white border border-[#EBE3D9] hover:border-[#E1306C] shadow-md hover:shadow-xl hover:scale-110 flex items-center justify-center transition-all duration-200"
            >
              <InstagramIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <span className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#2D222A] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hidden sm:block">
              Follow on Instagram
            </span>
          </div>

          {/* Facebook */}
          <div className="relative group">
            <a
              href={KUTTYSTORY_SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook - Connect with KuttyStory"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-[#1877F2] text-[#695B64] hover:text-white border border-[#EBE3D9] hover:border-[#1877F2] shadow-md hover:shadow-xl hover:scale-110 flex items-center justify-center transition-all duration-200"
            >
              <FacebookIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <span className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#2D222A] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hidden sm:block">
              Connect on Facebook
            </span>
          </div>
        </div>

        {/* Primary WhatsApp Button + Mobile Speed Dial Toggle */}
        <div className="relative group flex items-center">
          <a
            href={KUTTYSTORY_SOCIAL_LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp - Chat with KuttyStory"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#EBE3D9] hover:border-[#25D366] shadow-md hover:shadow-xl hover:scale-110 flex items-center justify-center transition-all duration-200"
          >
            <WhatsAppIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </a>
          <span className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#2D222A] text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hidden sm:block">
            Chat on WhatsApp
          </span>

          {/* Mobile-only toggle button to reveal/hide Instagram & Facebook */}
          <button
            type="button"
            onClick={() => setMobileSocialOpen(!mobileSocialOpen)}
            className="sm:hidden absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#2D222A] text-white flex items-center justify-center shadow-xs text-[10px] font-bold border border-white cursor-pointer"
            aria-label={mobileSocialOpen ? "Close social menu" : "Open social menu"}
            title="More links"
          >
            {mobileSocialOpen ? "×" : "+"}
          </button>
        </div>
      </aside>

    </div>
  );
}
