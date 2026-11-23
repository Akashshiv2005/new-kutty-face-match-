import { useState, useRef, useEffect, useMemo } from "react";
import {
  MapPin,
  Award,
  BookOpen,
  Calendar,
  ChevronDown,
  Sparkles,
  X,
  MousePointerClick,
  Check,
  AlertCircle
} from "lucide-react";
import { INDIA_MAP_DATA, STATE_BBOXES } from "../data/indiaMapData";
import {
  calculateSalesMetrics,
  getStateFillColor,
  INDIAN_28_STATES,
  UNION_TERRITORIES,
  StateSalesInfo,
  DonutSegment
} from "../data/bookSalesData";

const DONUT_RADIUS = 75;
const CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const GAP_LENGTH = 3.5;

export default function BookSalesMapSection() {
  // Filter period state: "Last 30 days" is default selected option
  const [timeFilter, setTimeFilter] = useState<"30days" | "1year" | "custom">("30days");
  const [customFrom, setCustomFrom] = useState<string>("2026-09-22");
  const [customTo, setCustomTo] = useState<string>("2026-10-21");
  const [appliedFrom, setAppliedFrom] = useState<string>("2026-09-22");
  const [appliedTo, setAppliedTo] = useState<string>("2026-10-21");
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [showCustomInputs, setShowCustomInputs] = useState<boolean>(false);

  // CRITICAL REQUIREMENT: Do not preselect or highlight any state on the map when the page first loads
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);
  const [hoveredDonutId, setHoveredDonutId] = useState<string | null>(null);
  const [showAllModal, setShowAllModal] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"states" | "territories">("states");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Mobile & touch custom logo cursor follower state
  const [mobileCursorPos, setMobileCursorPos] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });

  const handleMapPointerMove = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setMobileCursorPos({ x, y, visible: true });
    } else {
      setMobileCursorPos((prev) => ({ ...prev, visible: false }));
    }
  };

  const handleMapTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      setMobileCursorPos({ x, y, visible: true });
    }

    // Detect state under finger on mobile hover/touch drag
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elem && elem.tagName.toLowerCase() === "path" && elem.id && elem.id.startsWith("state-")) {
      const stateId = elem.id.replace("state-", "").toLowerCase();
      setHoveredStateId(stateId);
      setSelectedStateId(stateId);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Calculate sales metrics dynamically based on real completed paid orders
  const metrics = useMemo(
    () => calculateSalesMetrics(timeFilter, appliedFrom, appliedTo),
    [timeFilter, appliedFrom, appliedTo]
  );

  // Validation: start date cannot be later than end date
  const isDateRangeInvalid = Boolean(customFrom && customTo && customFrom > customTo);

  const handleSelectOption = (option: "30days" | "1year" | "custom") => {
    if (option === "custom") {
      setShowCustomInputs(true);
      return;
    }
    setTimeFilter(option);
    setShowCustomInputs(false);
    setIsDropdownOpen(false);
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDateRangeInvalid || !customFrom || !customTo) return;
    setAppliedFrom(customFrom);
    setAppliedTo(customTo);
    setTimeFilter("custom");
    setIsDropdownOpen(false);
  };

  // Active state ID (hovered has transient priority, otherwise selected)
  const activeStateId = (hoveredStateId || selectedStateId)?.toLowerCase() || null;

  // Active state record from metrics
  const activeRecord = activeStateId ? metrics.stateSalesRecord[activeStateId] : null;

  const activeLocation = activeStateId
    ? INDIA_MAP_DATA.locations.find(
        (loc) => loc.id.toLowerCase() === activeStateId
      )
    : null;

  const activePercentage = activeRecord ? activeRecord.percentage : "0.0";

  // Precomputed bounding box for the standalone state shape
  const stateBBox =
    (activeStateId && STATE_BBOXES[activeStateId]) || {
      minX: 0,
      minY: 0,
      width: 612,
      height: 696,
    };
  const padX = Math.max(stateBBox.width * 0.08, 4);
  const padY = Math.max(stateBBox.height * 0.08, 4);
  const standaloneStrokeWidth = Math.max(stateBBox.width, stateBBox.height) * 0.018;

  // Precompute donut offsets
  const availableLength = CIRCUMFERENCE - metrics.donutSegments.length * GAP_LENGTH;
  let cumulativeOffset = 0;
  const segmentsWithOffsets = metrics.donutSegments.map((seg) => {
    const arcLength = metrics.totalBooks > 0 ? (seg.count / metrics.totalBooks) * availableLength : 0;
    const offset = cumulativeOffset;
    cumulativeOffset += arcLength + GAP_LENGTH;
    return {
      ...seg,
      arcLength,
      offset,
    };
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 mb-16">
      {/* Inline styles for animated outline and panel transitions */}
      <style>{`
        @keyframes drawStateOutline {
          0% {
            stroke-dashoffset: 700;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes panelFadeInSlide {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .state-outline-animated {
          stroke-dasharray: 700;
          stroke-dashoffset: 700;
          animation: drawStateOutline 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .panel-fade-slide {
          animation: panelFadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .state-path-base {
          transition: filter 0.2s ease, stroke 0.2s ease;
          outline: none;
        }
        .kuttystory-map-canvas,
        .kuttystory-map-canvas * {
          cursor: url('data:image/png;base64,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') 16 16,
                  url('/kuttystory_cursor_32.png') 16 16,
                  url('/kuttystory_cursor_36.png') 18 18,
                  url('/kuttystory_cursor.png') 18 18,
                  pointer !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .state-outline-animated {
            animation: none !important;
            stroke-dasharray: none !important;
            stroke-dashoffset: 0 !important;
          }
          .panel-fade-slide {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAEEED] border border-[#C98A84]/30 text-xs font-semibold tracking-wider uppercase text-[#C98A84]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FOOT STEPS · SALES REACH</span>
          </div>
          <h2 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
            Where our stories travel
          </h2>
          <p className="text-sm text-[#695B64] max-w-2xl">
            See how many Foot Steps books have found a home in each state.
          </p>
        </div>

        {/* Date Filter Dropdown with "Last 30 days", "Last 1 year", and "Custom date range" */}
        <div className="flex items-center gap-2 self-start md:self-auto relative" ref={dropdownRef}>
          <button
            type="button"
            id="date-filter-btn"
            aria-haspopup="true"
            aria-expanded={isDropdownOpen}
            onClick={() => {
              setIsDropdownOpen((prev) => !prev);
              if (!isDropdownOpen && timeFilter === "custom") {
                setShowCustomInputs(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsDropdownOpen((prev) => !prev);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EBE3D9] hover:border-[#C98A84]/60 text-xs font-semibold text-[#2D222A] shadow-xs hover:shadow transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C98A84]/40"
          >
            <Calendar className="w-3.5 h-3.5 text-[#C98A84]" />
            <span>{metrics.filterLabel}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#695B64] transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180 text-[#C98A84]" : ""
              }`}
            />
          </button>

          {/* Accessible, compact dropdown menu matching KuttyStory styling */}
          {isDropdownOpen && (
            <div
              role="menu"
              aria-orientation="vertical"
              aria-labelledby="date-filter-btn"
              className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-[#EBE3D9] shadow-xl p-2.5 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8C7A86] px-3 py-1.5 border-b border-[#EBE3D9]/60 mb-1">
                Select Date Range
              </div>

              {/* Option 1: Last 30 days */}
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSelectOption("30days")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                  timeFilter === "30days"
                    ? "bg-[#FAEEED] text-[#C98A84] font-semibold"
                    : "text-[#2D222A] hover:bg-[#FAF7F2]"
                }`}
              >
                <span>Last 30 days</span>
                {timeFilter === "30days" && <Check className="w-4 h-4 text-[#C98A84]" />}
              </button>

              {/* Option 2: Last 1 year */}
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSelectOption("1year")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                  timeFilter === "1year"
                    ? "bg-[#FAEEED] text-[#C98A84] font-semibold"
                    : "text-[#2D222A] hover:bg-[#FAF7F2]"
                }`}
              >
                <span>Last 1 year</span>
                {timeFilter === "1year" && <Check className="w-4 h-4 text-[#C98A84]" />}
              </button>

              {/* Option 3: Custom date range */}
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSelectOption("custom")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                  timeFilter === "custom" || showCustomInputs
                    ? "bg-[#FAEEED] text-[#C98A84] font-semibold"
                    : "text-[#2D222A] hover:bg-[#FAF7F2]"
                }`}
              >
                <span>Custom date range</span>
                {timeFilter === "custom" && !showCustomInputs && (
                  <Check className="w-4 h-4 text-[#C98A84]" />
                )}
              </button>

              {/* Custom Date Range Inputs: "From" and "To" with Validation and Apply Action */}
              {(showCustomInputs || timeFilter === "custom") && (
                <form
                  onSubmit={handleApplyCustomRange}
                  className="mt-2.5 pt-2.5 border-t border-[#EBE3D9] space-y-2.5 px-1"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor="custom-from-date"
                        className="block text-[11px] font-semibold text-[#695B64] mb-1"
                      >
                        From
                      </label>
                      <input
                        id="custom-from-date"
                        type="date"
                        value={customFrom}
                        max={customTo || "2026-10-21"}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs text-[#2D222A] bg-[#FAF7F2] focus:bg-white focus:outline-none transition-all ${
                          isDateRangeInvalid
                            ? "border-[#C98A84] focus:ring-1 focus:ring-[#C98A84]"
                            : "border-[#EBE3D9] focus:border-[#C98A84]"
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="custom-to-date"
                        className="block text-[11px] font-semibold text-[#695B64] mb-1"
                      >
                        To
                      </label>
                      <input
                        id="custom-to-date"
                        type="date"
                        value={customTo}
                        max="2026-10-21"
                        onChange={(e) => setCustomTo(e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs text-[#2D222A] bg-[#FAF7F2] focus:bg-white focus:outline-none transition-all ${
                          isDateRangeInvalid
                            ? "border-[#C98A84] focus:ring-1 focus:ring-[#C98A84]"
                            : "border-[#EBE3D9] focus:border-[#C98A84]"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Validation message if start date is after end date */}
                  {isDateRangeInvalid && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#A35C56] font-medium bg-[#FAEEED] px-2.5 py-1.5 rounded-lg border border-[#C98A84]/30">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Start date cannot be later than end date.</span>
                    </div>
                  )}

                  {/* Apply Action Button */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isDateRangeInvalid || !customFrom || !customTo}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold shadow-xs hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-center"
                    >
                      Apply Range
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInputs(false);
                        setIsDropdownOpen(false);
                      }}
                      className="py-2 px-3 rounded-xl bg-[#FAF7F2] hover:bg-[#EBE3D9] text-[#695B64] text-xs font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {/* Card 1: BOOKS SOLD */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBE3D9] shadow-xs flex items-center gap-4 transition-all hover:border-[#C98A84]/40 hover:shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#FAEEED] flex items-center justify-center text-[#C98A84] shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#695B64]">
              BOOKS SOLD
            </div>
            <div className="font-editorial-serif text-3xl font-bold text-[#2D222A] tracking-tight">
              {metrics.totalBooks.toLocaleString()}
            </div>
            <div className="text-xs text-[#695B64] mt-0.5">
              Across India · {metrics.filterLabel.toLowerCase()}
            </div>
          </div>
        </div>

        {/* Card 2: STATES REACHED — CRITICAL REQUIREMENT: Display India's state count as "28 states", not states plus union territories */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBE3D9] shadow-xs flex items-center gap-4 transition-all hover:border-[#C98A84]/40 hover:shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#FAF5E8] flex items-center justify-center text-[#C5A059] shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#695B64]">
              STATES REACHED
            </div>
            <div className="font-editorial-serif text-3xl font-bold text-[#2D222A] tracking-tight">
              {metrics.statesReachedCount === 28
                ? "28 states"
                : `${metrics.statesReachedCount} / 28 states`}
            </div>
            <div className="text-xs text-[#695B64] mt-0.5">
              Across 28 Indian states
            </div>
          </div>
        </div>

        {/* Card 3: TOP STATE */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBE3D9] shadow-xs flex items-center gap-4 transition-all hover:border-[#C98A84]/40 hover:shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[#EEF4ED] flex items-center justify-center text-[#8F9E8B] shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-[#695B64]">
              TOP STATE
            </div>
            <div className="font-editorial-serif text-3xl font-bold text-[#2D222A] tracking-tight">
              {metrics.topState.name}
            </div>
            <div className="text-xs text-[#695B64] mt-0.5">
              {metrics.topState.count.toLocaleString()} books sold
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Book Sales Map Card: 75–80% Map on Left, 20–25% Details Panel on Right */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EBE3D9] shadow-sm mb-8">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-editorial-serif text-2xl sm:text-3xl font-bold text-[#2D222A]">
              Book sales by state
            </h3>
            <p className="text-xs sm:text-sm text-[#695B64] mt-1">
              Hover or tap a state to see its book sales for {metrics.filterLabel.toLowerCase()}.
            </p>
          </div>

          {/* Interactive badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#EBE3D9] text-xs text-[#695B64] self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-[#C98A84] animate-pulse"></span>
            <span>Interactive Map</span>
          </div>
        </div>

        {/* Proportional Layout: Full Map & Details Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Full India Map Column */}
          <div className="lg:col-span-9 flex flex-col items-center">
            <div
              ref={mapContainerRef}
              className="kuttystory-map-canvas w-full relative bg-[#FAF7F2]/90 rounded-2xl p-4 sm:p-6 border border-[#EBE3D9] flex flex-col items-center justify-center overflow-hidden"
              onPointerEnter={handleMapPointerMove}
              onPointerMove={handleMapPointerMove}
              onMouseMove={handleMapPointerMove}
              onPointerLeave={() => {
                setHoveredStateId(null);
                setMobileCursorPos((prev) => ({ ...prev, visible: false }));
              }}
              onMouseLeave={() => {
                setHoveredStateId(null);
                setMobileCursorPos((prev) => ({ ...prev, visible: false }));
              }}
              onTouchStart={handleMapTouchMove}
              onTouchMove={handleMapTouchMove}
              onTouchEnd={() => {
                setTimeout(() => {
                  setMobileCursorPos((prev) => ({ ...prev, visible: false }));
                }, 1200);
              }}
            >
              {/* Mobile floating prompt badge showing logo when no state is selected */}
              {!activeRecord && (
                <div className="lg:hidden absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-full border border-[#EBE3D9] shadow-xs flex items-center gap-2 pointer-events-none">
                  <img
                    src="/kuttystory_cursor.png"
                    alt="KuttyStory"
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/logo.png";
                    }}
                  />
                  <span className="text-[11px] font-medium text-[#695B64]">Tap any state to explore</span>
                </div>
              )}

              {/* Mobile floating state info badge with KuttyStory logo when state is active/hovered */}
              {activeRecord && activeLocation && (
                <div className="lg:hidden absolute top-3 left-3 right-3 z-20 max-w-sm mx-auto bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-[#C98A84]/40 shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#FAEEED] border border-[#C98A84]/30 flex items-center justify-center shrink-0 p-1">
                      <img
                        src="/kuttystory_cursor.png"
                        alt="KuttyStory"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = "/logo.png";
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-editorial-serif font-bold text-sm text-[#2D222A] truncate">
                          {activeRecord.name}
                        </span>
                        {activeRecord.rank && activeRecord.count > 0 ? (
                          <span className="text-[10px] font-bold text-[#C98A84] bg-[#FAEEED] px-2 py-0.5 rounded-full border border-[#C98A84]/20 shrink-0">
                            Rank #{activeRecord.rank}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-[#695B64] font-medium">
                        {activeRecord.count.toLocaleString()} {activeRecord.count === 1 ? "book sold" : "books sold"} · {activePercentage}%
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStateId(null);
                      setHoveredStateId(null);
                    }}
                    className="p-1.5 text-[#8C7A86] hover:text-[#2D222A] hover:bg-[#FAF7F2] rounded-full shrink-0 transition-colors cursor-pointer"
                    aria-label="Dismiss state preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mobile floating logo cursor follower: visible on mobile view when touching or moving pointer */}
              {mobileCursorPos.visible && (
                <div
                  className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 lg:hidden"
                  style={{
                    left: `${mobileCursorPos.x}px`,
                    top: `${mobileCursorPos.y}px`,
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <img
                      src="/kuttystory_cursor.png"
                      alt="KuttyStory Cursor"
                      className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(201,138,132,0.5)] select-none"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/logo.png";
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="w-full max-w-[620px] max-h-[620px] aspect-[612/696] flex items-center justify-center relative">
                <svg
                  viewBox={INDIA_MAP_DATA.viewBox}
                  className="kuttystory-map-canvas w-full h-full select-none"
                  role="img"
                  aria-label="Interactive India State Book Sales Map"
                  onMouseLeave={() => setHoveredStateId(null)}
                >
                  {/* Full India Map State Paths */}
                  {INDIA_MAP_DATA.locations.map((loc) => {
                    const idLower = loc.id.toLowerCase();
                    const stateInfo = metrics.stateSalesRecord[idLower] || {
                      name: loc.name,
                      count: 0,
                    };
                    const isSelected = selectedStateId ? selectedStateId === idLower : false;
                    const isHovered = hoveredStateId ? hoveredStateId === idLower : false;
                    const isHighlighted = isHovered || isSelected;

                    return (
                      <path
                        key={loc.id}
                        id={`state-${loc.id}`}
                        d={loc.path}
                        fill={getStateFillColor(stateInfo.count, metrics.topState.count)}
                        stroke={isHighlighted ? "#873E38" : "#E5D8D5"}
                        strokeWidth={isHighlighted ? 2.2 : 0.7}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        tabIndex={0}
                        role="button"
                        aria-label={`${stateInfo.name}: ${stateInfo.count} books sold`}
                        className="kuttystory-map-canvas state-path-base focus:stroke-[#873E38] focus:stroke-[2px]"
                        style={{
                          filter: isHighlighted
                            ? "drop-shadow(0 0 4px rgba(135, 62, 56, 0.4)) brightness(1.04)"
                            : undefined,
                        }}
                        onMouseEnter={() => setHoveredStateId(idLower)}
                        onPointerEnter={() => setHoveredStateId(idLower)}
                        onTouchStart={() => {
                          setSelectedStateId(idLower);
                          setHoveredStateId(idLower);
                        }}
                        onClick={() => setSelectedStateId(idLower)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedStateId(idLower);
                          }
                        }}
                      />
                    );
                  })}

                  {/* Clear contrasting animated outline for active state on the full map */}
                  {activeLocation && (
                    <path
                      key={`outline-${activeLocation.id}`}
                      d={activeLocation.path}
                      fill="none"
                      stroke="#873E38"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none state-outline-animated"
                      style={{
                        filter: "drop-shadow(0 0 3px rgba(135, 62, 56, 0.5))",
                      }}
                    />
                  )}
                </svg>
              </div>

              {/* Color Legend below the full map */}
              <div className="mt-5 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#695B64] border-t border-[#EBE3D9]/80 w-full">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-[#2D222A]">Fewer books</span>
                  <div className="w-36 sm:w-48 h-3 rounded-full bg-gradient-to-r from-[#FAF1EF] via-[#EAC4BF] to-[#A35C56] border border-[#EBE3D9] shadow-inner"></div>
                  <span className="font-medium text-[#2D222A]">More books</span>
                </div>
                <div className="text-[11px] text-[#8C7A86] italic">
                  Shaded by sales volume · {metrics.filterLabel}
                </div>
              </div>
            </div>
          </div>

          {/* Details Panel Column (Contains Standalone State Shape + Sales Metrics) */}
          <div className="lg:col-span-3 w-full">
            <div className="bg-[#FAF7F2] rounded-2xl p-4 sm:p-5 border border-[#EBE3D9] shadow-2xs">
              {/* Content transitions smoothly on state change */}
              <div key={activeStateId || "neutral"} className="panel-fade-slide space-y-3.5">
                {!activeRecord || !activeLocation ? (
                  <div className="flex flex-col justify-between min-h-[350px] py-1">
                    {/* Header row: date range + 28 States indicator */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-[#C98A84] bg-white px-2.5 py-0.5 rounded-full border border-[#C98A84]/20 shadow-2xs">
                        {metrics.filterLabel}
                      </span>
                      <span className="text-[10px] font-medium text-[#8C7A86] bg-white px-2 py-0.5 rounded-full border border-[#EBE3D9]">
                        28 States
                      </span>
                    </div>

                    {/* Neutral prompt & icon */}
                    <div className="flex flex-col items-center justify-center text-center my-auto py-8 px-2 space-y-3">
                      <div className="w-13 h-13 rounded-2xl bg-[#FAEEED] border border-[#C98A84]/30 flex items-center justify-center text-[#C98A84] shadow-xs">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="space-y-1.5 max-w-[210px]">
                        <h4 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#2D222A]">
                          State Details
                        </h4>
                        <p className="text-xs sm:text-[13px] text-[#695B64] leading-relaxed">
                          Hover over or select a state to view its details for {metrics.filterLabel.toLowerCase()}.
                        </p>
                      </div>
                    </div>

                    {/* Short helper hint */}
                    <div className="pt-3 border-t border-[#EBE3D9] flex items-center justify-center gap-1.5 text-[11px] text-[#8C7A86]">
                      <MousePointerClick className="w-3.5 h-3.5 text-[#C98A84] shrink-0" />
                      <span>Hover over or tap any state</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header row: date range + rank */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-[#C98A84] bg-white px-2.5 py-0.5 rounded-full border border-[#C98A84]/20 shadow-2xs">
                        {metrics.filterLabel}
                      </span>
                      {activeRecord.rank && activeRecord.count > 0 ? (
                        <span className="text-[10px] font-bold text-[#2D222A] bg-white px-2 py-0.5 rounded-full border border-[#EBE3D9]">
                          Rank #{activeRecord.rank}
                        </span>
                      ) : null}
                    </div>

                    {/* Standalone State Shape */}
                    <div className="w-full flex items-center justify-center py-2">
                      <div className="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center relative">
                        <svg
                          viewBox={`${stateBBox.minX - padX} ${stateBBox.minY - padY} ${stateBBox.width + 2 * padX} ${stateBBox.height + 2 * padY}`}
                          className="kuttystory-map-canvas w-full h-full select-none"
                          style={{
                            filter: "drop-shadow(0 4px 12px rgba(163, 92, 86, 0.28))",
                          }}
                          role="img"
                          aria-label={`Standalone shape of ${activeRecord.name}`}
                        >
                          <path
                            d={activeLocation.path}
                            fill={getStateFillColor(activeRecord.count, metrics.topState.count)}
                            stroke="#873E38"
                            strokeWidth={standaloneStrokeWidth}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            className="transition-all duration-300"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Selected State Name */}
                    <div className="text-center sm:text-left">
                      <div className="text-[10px] font-medium tracking-wider uppercase text-[#8C7A86]">
                        {activeRecord.isUnionTerritory ? "Union Territory" : "Selected State"}
                      </div>
                      <h4 className="font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A] leading-tight">
                        {activeRecord.name}
                      </h4>
                    </div>

                    {/* Books Sold Metric */}
                    <div className="bg-white rounded-xl p-3 border border-[#EBE3D9] shadow-2xs">
                      <div className="text-[10px] font-semibold text-[#8C7A86] uppercase tracking-wide">
                        Books Sold
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-editorial-serif text-2xl sm:text-3xl font-bold text-[#2D222A] leading-none">
                          {activeRecord.count.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#695B64] font-medium">
                          {activeRecord.count === 1 ? "book" : "books"}
                        </span>
                      </div>
                      {activeRecord.count === 0 ? (
                        <p className="text-[10px] text-[#8C7A86] pt-1 italic">
                          0 qualifying orders in {metrics.filterLabel.toLowerCase()}.
                        </p>
                      ) : null}
                    </div>

                    {/* Share of Total Sales */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#695B64] text-[11px] font-medium">Share of Total</span>
                        <span className="font-bold text-[#2D222A] text-xs">{activePercentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#EBE3D9] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#C98A84] rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                activeRecord.count > 0
                                  ? (activeRecord.count / Math.max(metrics.topState.count, 1)) * 100
                                  : 0,
                                activeRecord.count > 0 ? 2 : 0
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-[#8C7A86] text-right">
                        {activeRecord.count.toLocaleString()} of {metrics.totalBooks.toLocaleString()} total
                      </div>
                    </div>

                    {/* Short hint */}
                    <div className="pt-2 border-t border-[#EBE3D9] flex items-center gap-1.5 text-[11px] text-[#695B64] leading-snug">
                      <MousePointerClick className="w-3.5 h-3.5 text-[#C98A84] shrink-0" />
                      <span>Tap or click another state to compare totals.</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top States Donut Chart & Analytics Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EBE3D9] shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Donut Chart Visual */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="flex items-center justify-between w-full mb-2">
              <div>
                <h3 className="font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A]">
                  Top states
                </h3>
                <p className="text-xs text-[#695B64]">
                  Share of books sold · {metrics.filterLabel}
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C98A84] bg-[#FAEEED] px-2.5 py-1 rounded-full border border-[#C98A84]/30">
                VERIFIED SALES
              </span>
            </div>

            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto my-3 flex items-center justify-center">
              <svg
                viewBox="0 0 220 220"
                className="w-full h-full transform -rotate-90 select-none"
              >
                {/* Background track circle */}
                <circle
                  cx="110"
                  cy="110"
                  r={DONUT_RADIUS}
                  fill="none"
                  stroke="#F7F3EC"
                  strokeWidth="16"
                />

                {/* Donut Segments */}
                {segmentsWithOffsets.map((seg) => {
                  const isHovered = hoveredDonutId === seg.id;
                  const isSelectedOnMap = activeStateId ? activeStateId === seg.id.toLowerCase() : false;
                  return (
                    <circle
                      key={seg.id}
                      cx="110"
                      cy="110"
                      r={DONUT_RADIUS}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={isHovered || isSelectedOnMap ? 24 : 18}
                      strokeDasharray={`${seg.arcLength} ${CIRCUMFERENCE - seg.arcLength}`}
                      strokeDashoffset={-seg.offset}
                      strokeLinecap="butt"
                      className="transition-all duration-300 cursor-pointer origin-center"
                      style={{
                        filter:
                          isHovered || isSelectedOnMap
                            ? "drop-shadow(0px 2px 6px rgba(45, 34, 42, 0.15))"
                            : "none",
                      }}
                      onClick={() => {
                        if (seg.id === "OTHER") {
                          setShowAllModal(true);
                        } else {
                          setSelectedStateId(seg.id.toLowerCase());
                        }
                      }}
                      onMouseEnter={() => setHoveredDonutId(seg.id)}
                      onMouseLeave={() => setHoveredDonutId(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Text: Total and Books Sold */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
                <span className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A] tracking-tight leading-none">
                  {metrics.totalBooks.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#695B64] mt-1">
                  books sold
                </span>
              </div>
            </div>
          </div>

          {/* Legend and Notes */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* Color-Coded Legend */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {metrics.donutSegments.map((seg) => {
                const isHovered = hoveredDonutId === seg.id;
                const isSelectedOnMap = activeStateId ? activeStateId === seg.id.toLowerCase() : false;
                return (
                  <button
                    key={seg.id}
                    onClick={() => {
                      if (seg.id === "OTHER") {
                        setShowAllModal(true);
                      } else {
                        setSelectedStateId(seg.id.toLowerCase());
                      }
                    }}
                    onMouseEnter={() => setHoveredDonutId(seg.id)}
                    onMouseLeave={() => setHoveredDonutId(null)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                      isHovered || isSelectedOnMap
                        ? "bg-[#FAEEED]/70 border border-[#C98A84]/40 shadow-2xs"
                        : "hover:bg-[#FAF7F2] border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-xs font-semibold text-[#2D222A] truncate">
                        {seg.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-editorial-serif text-xs font-bold text-[#2D222A]">
                        {seg.count.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-[#695B64] font-medium bg-[#FAF7F2] border border-[#EBE3D9] px-2 py-0.5 rounded-md min-w-[38px] text-center">
                        {seg.percentage}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* View all link & Explanatory disclaimer */}
            <div className="pt-2 flex items-center justify-between border-t border-[#EBE3D9]">
              <div className="text-[11px] text-[#695B64] leading-relaxed max-w-lg">
                Totals count real completed, paid book orders grouped by shipping state. Excludes cancelled and refunded orders.
              </div>
              <button
                onClick={() => setShowAllModal(true)}
                className="text-xs font-semibold text-[#C98A84] hover:text-[#B87A74] flex items-center gap-1 transition-colors cursor-pointer group shrink-0 ml-4"
              >
                <span>View all 28 states</span>
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* "View all 28 states" Modal — Strictly displays India's state count as 28 states */}
      {showAllModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden border border-[#EBE3D9] shadow-2xl flex flex-col">
            <div className="p-6 border-b border-[#EBE3D9] flex items-center justify-between">
              <div>
                <h4 className="font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A]">
                  All 28 States of India
                </h4>
                <p className="text-xs text-[#695B64] mt-0.5">
                  Book orders by shipping state · {metrics.filterLabel} ({metrics.statesReachedCount} of 28 states reached)
                </p>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-full bg-[#FAF7F2] hover:bg-[#FAEEED] text-[#2D222A] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs: 28 States vs Union Territories */}
            <div className="px-6 pt-3 flex items-center gap-2 border-b border-[#EBE3D9] bg-[#FAF7F2]/60">
              <button
                type="button"
                onClick={() => setModalTab("states")}
                className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
                  modalTab === "states"
                    ? "bg-white text-[#C98A84] border-t border-x border-[#EBE3D9] shadow-2xs -mb-px"
                    : "text-[#695B64] hover:text-[#2D222A]"
                }`}
              >
                28 States ({metrics.statesReachedCount} Reached)
              </button>
              <button
                type="button"
                onClick={() => setModalTab("territories")}
                className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer ${
                  modalTab === "territories"
                    ? "bg-white text-[#C98A84] border-t border-x border-[#EBE3D9] shadow-2xs -mb-px"
                    : "text-[#695B64] hover:text-[#2D222A]"
                }`}
              >
                Union Territories ({metrics.unionTerritoriesList.filter((u) => u.count > 0).length} Active)
              </button>
            </div>

            {/* Modal List */}
            <div className="p-6 overflow-y-auto space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {(modalTab === "states"
                  ? metrics.allStatesList
                  : metrics.unionTerritoriesList
                ).map((state) => (
                  <div
                    key={state.id}
                    onClick={() => {
                      setSelectedStateId(state.id);
                      setShowAllModal(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedStateId === state.id
                        ? "bg-[#FAEEED] border-[#C98A84] shadow-xs"
                        : "bg-[#FAF7F2] border-[#EBE3D9] hover:bg-[#FAEEED]/40 hover:border-[#C98A84]/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-[#8C7A86] w-6 shrink-0">
                        {state.rank ? `#${state.rank}` : "—"}
                      </span>
                      <span className="text-xs font-semibold text-[#2D222A] truncate">
                        {state.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        state.count > 0 ? "text-[#C98A84]" : "text-[#8C7A86]"
                      }`}
                    >
                      {state.count.toLocaleString()} books
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#FAF7F2] border-t border-[#EBE3D9] flex items-center justify-between text-xs text-[#695B64]">
              <span>Real completed, paid orders. Excludes refunded and cancelled orders.</span>
              <button
                onClick={() => setShowAllModal(false)}
                className="px-4 py-1.5 rounded-full bg-[#2D222A] text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
