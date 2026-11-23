import React, { useState, useEffect } from "react";
import {
  Sun,
  Coffee,
  GraduationCap,
  UtensilsCrossed,
  Palette,
  Trees,
  BookOpen,
  HeartHandshake,
  Sparkles,
  BookMarked,
  MoonStar,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { api, ParentingRoutineStage } from "@/lib/api";

// Fallback routine stages matching the exact 11 user-specified stages
const DEFAULT_STAGES: ParentingRoutineStage[] = [
  {
    id: "stage-1",
    time: "6:30 – 7:00 AM",
    start_hour: 6.5,
    end_hour: 7.0,
    activity: "Wake Up & Smile",
    parenting_idea: "Hugs, gratitude and brushing teeth.",
    category: "morning",
    icon: "Sun",
    character: "boy",
  },
  {
    id: "stage-2",
    time: "7:00 – 8:00 AM",
    start_hour: 7.0,
    end_hour: 8.0,
    activity: "Healthy Morning",
    parenting_idea: "Breakfast and getting ready.",
    category: "morning",
    icon: "Coffee",
    character: "boy",
  },
  {
    id: "stage-3",
    time: "8:00 AM – 2:00 PM",
    start_hour: 8.0,
    end_hour: 14.0,
    activity: "School & Learning",
    parenting_idea: "Lessons, lunch and friendships.",
    category: "day",
    icon: "GraduationCap",
    character: "boy",
  },
  {
    id: "stage-4",
    time: "2:00 – 3:00 PM",
    start_hour: 14.0,
    end_hour: 15.0,
    activity: "Lunch & Relaxation",
    parenting_idea: "Food, connection and quiet time.",
    category: "day",
    icon: "UtensilsCrossed",
    character: "boy",
  },
  {
    id: "stage-5",
    time: "3:00 – 4:00 PM",
    start_hour: 15.0,
    end_hour: 16.0,
    activity: "Creative Time",
    parenting_idea: "Art, puzzles and imaginative play.",
    category: "day",
    icon: "Palette",
    character: "boy",
  },
  {
    id: "stage-6",
    time: "4:00 – 5:30 PM",
    start_hour: 16.0,
    end_hour: 17.5,
    activity: "Outdoor Play",
    parenting_idea: "Movement and active games.",
    category: "evening",
    icon: "Trees",
    character: "girl",
  },
  {
    id: "stage-7",
    time: "5:30 – 6:30 PM",
    start_hour: 17.5,
    end_hour: 18.5,
    activity: "Homework & Reading",
    parenting_idea: "Learning with gentle support.",
    category: "evening",
    icon: "BookOpen",
    character: "girl",
  },
  {
    id: "stage-8",
    time: "6:30 – 7:30 PM",
    start_hour: 18.5,
    end_hour: 19.5,
    activity: "Family & Dinner",
    parenting_idea: "Conversation and shared meals.",
    category: "evening",
    icon: "HeartHandshake",
    character: "girl",
  },
  {
    id: "stage-9",
    time: "7:30 – 8:00 PM",
    start_hour: 19.5,
    end_hour: 20.0,
    activity: "Bedtime Preparation",
    parenting_idea: "Wash, brush teeth and wind down.",
    category: "night",
    icon: "Sparkles",
    character: "girl",
  },
  {
    id: "stage-10",
    time: "8:00 – 8:30 PM",
    start_hour: 20.0,
    end_hour: 20.5,
    activity: "KuttyStory Magic",
    parenting_idea: "Read together and imagine.",
    category: "night",
    icon: "BookMarked",
    character: "girl",
  },
  {
    id: "stage-11",
    time: "8:30 PM – 6:30 AM",
    start_hour: 20.5,
    end_hour: 30.5,
    activity: "Sweet Dreams",
    parenting_idea: "10 hours of restorative sleep.",
    category: "night",
    icon: "MoonStar",
    character: "boy",
  },
];

// Helper to map icon name to component
function RoutineIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  switch (name) {
    case "Sun":
      return <Sun className={className} />;
    case "Coffee":
      return <Coffee className={className} />;
    case "GraduationCap":
    case "Backpack":
      return <GraduationCap className={className} />;
    case "Utensils":
    case "UtensilsCrossed":
      return <UtensilsCrossed className={className} />;
    case "Palette":
      return <Palette className={className} />;
    case "Trees":
      return <Trees className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "HeartHandshake":
      return <HeartHandshake className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "BookMarked":
      return <BookMarked className={className} />;
    case "Moon":
    case "MoonStar":
      return <MoonStar className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

// Stage angular distribution for all 11 stages matching Image Ref 2
// Stage 1 (6:30) starts at top-right (-50°) and circulates clockwise to Stage 11 (8:30 PM) at top (-90°)
function getStageAngle(index: number, total: number): number {
  const startAngle = -50;
  const step = 360 / Math.max(1, total);
  return startAngle + index * step;
}

export default function MagicalParentingRoutine() {
  const [stages, setStages] = useState<ParentingRoutineStage[]>(DEFAULT_STAGES);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [displayPos, setDisplayPos] = useState({ x: 586, y: 178, angle: -50 });
  const [sway, setSway] = useState(0);

  // Geometry: Enlarged to fill 800x800 viewBox with bold, high-contrast presence
  const CX = 400;
  const CY = 400;
  const R_ARC = 290;      // Main Sky Arc Radius (increased from 236 -> 290)
  const R_NODES = 234;    // Numbered Milestones Inner Radius (sitting snugly along inner edge)
  const R_PILLS = 290;    // Time Pills Radius (sitting right along the arc centerline)

  // Fetch backend routine if available
  useEffect(() => {
    api.getParentingRoutine()
      .then((data) => {
        if (data && data.length > 0) setStages(data);
      })
      .catch((err) => {
        console.warn("Using default routine stages:", err);
      });
  }, []);

  const currentStage = stages[currentStageIndex] || DEFAULT_STAGES[0];
  const isGirl = currentStage.character === "girl";

  // Calculate target position for current stage (character floats at R_ARC)
  const targetAngle = getStageAngle(currentStageIndex, stages.length);
  const targetRad = (targetAngle * Math.PI) / 180;
  const targetX = CX + R_ARC * Math.cos(targetRad);
  const targetY = CY + R_ARC * Math.sin(targetRad);

  // Smoothly animate character position towards target stage
  useEffect(() => {
    let animId: number;
    let startTime: number | null = null;
    const startX = displayPos.x;
    const startY = displayPos.y;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      const duration = 1200; // 1.2s smooth flight
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const curX = startX + (targetX - startX) * ease;
      const curY = startY + (targetY - startY) * ease;

      // Parachute sway oscillation
      const curSway = Math.sin(elapsed * 0.008) * 8 * (1 - progress * 0.5);

      setDisplayPos({ x: curX, y: curY, angle: targetAngle });
      setSway(curSway);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [currentStageIndex, targetX, targetY]);

  // Autoplay progression timer: advances stage every 5.5s when playing
  useEffect(() => {
    if (!isPlaying || stages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentStageIndex((prev) => (prev + 1) % stages.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPlaying, stages.length]);

  const handleNext = () => {
    setCurrentStageIndex((prev) => (prev + 1) % stages.length);
  };

  const handlePrev = () => {
    setCurrentStageIndex((prev) => (prev - 1 + stages.length) % stages.length);
  };

  const handleReplay = () => {
    setCurrentStageIndex(0);
    setIsPlaying(true);
  };

  // Determine stage visual theme colors (matching Image Ref 2)
  const getStageTheme = (cat: string) => {
    switch (cat) {
      case "morning":
        return {
          pill: "bg-[#FFF9ED] text-[#92400E] border-[#FDE68A]",
          accent: "#38BDF8",
          sky: "Morning Sunrise",
          glow: "rgba(56, 189, 248, 0.4)",
        };
      case "day":
        return {
          pill: "bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]",
          accent: "#2A85B8",
          sky: "Bright Daylight",
          glow: "rgba(56, 189, 248, 0.4)",
        };
      case "evening":
        return {
          pill: "bg-[#FFF9ED] text-[#92400E] border-[#FDE68A]",
          accent: "#EA580C",
          sky: "Golden Sunset",
          glow: "rgba(234, 88, 12, 0.4)",
        };
      case "night":
        return {
          pill: "bg-[#F5F3FF] text-[#5B21B6] border-[#DDD6FE]",
          accent: "#6366F1",
          sky: "Sweet Dreams",
          glow: "rgba(99, 102, 241, 0.4)",
        };
      default:
        return {
          pill: "bg-[#FFF9ED] text-[#92400E] border-[#FDE68A]",
          accent: "#E29547",
          sky: "Daily Routine",
          glow: "rgba(245, 158, 11, 0.4)",
        };
    }
  };

  const theme = getStageTheme(currentStage.category);

  // Per-stage vibrant squircle icon background colors
  const stageIconBg = [
    "#F59E0B", // 1. Wake Up & Smile (Amber)
    "#10B981", // 2. Healthy Morning (Emerald)
    "#3B82F6", // 3. School & Learning (Blue)
    "#EC4899", // 4. Lunch & Relaxation (Pink)
    "#8B5CF6", // 5. Creative Time (Purple)
    "#14B8A6", // 6. Outdoor Play (Teal)
    "#EA580C", // 7. Homework & Reading (Vibrant Orange - exact ref match)
    "#E11D48", // 8. Family & Dinner (Rose Red)
    "#6366F1", // 9. Bedtime Preparation (Indigo)
    "#A85341", // 10. KuttyStory Magic (Terracotta)
    "#4338CA", // 11. Sweet Dreams (Midnight)
  ][currentStageIndex] || theme.accent;

  return (
    <section
      id="parenting-routine"
      className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 mb-12 scroll-mt-28 sm:scroll-mt-32"
    >
      {/* 1. Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF0E6] border border-[#F0D5C2] text-[#A85341] text-xs font-bold tracking-wider uppercase shadow-2xs">
          <span>🎈</span>
          <span>A Child’s 24-Hour Magical Journey</span>
          <span>✨</span>
        </div>

        <h2 className="font-editorial-serif text-3xl sm:text-5xl font-bold text-[#2D222A] tracking-tight leading-tight">
          The 24-Hour Parenting Routine
        </h2>

        <p className="font-editorial-sans text-[#695B64] text-sm sm:text-base leading-relaxed">
          Follow our little parachuters, as they
          float through a balanced day filled with sunrise laughter, creative wonder, nourishing family
          time, and sweet storybook dreams.
        </p>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#EBE3D9] text-[#2D222A] hover:bg-[#FAF7F2] text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-[#A85341]" />
                <span>Pause Flight</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600" />
                <span>Resume Flight</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#EBE3D9] text-[#695B64] hover:text-[#2D222A] hover:bg-[#FAF7F2] text-xs font-medium shadow-2xs transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replay Day</span>
          </button>

          <div className="flex items-center gap-1 bg-white border border-[#EBE3D9] rounded-full p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous routine stage"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#FAF0E6] text-[#695B64] hover:text-[#A85341] transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-semibold text-[#8C7E86] px-2">
              {currentStageIndex + 1} of {stages.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next routine stage"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#FAF0E6] text-[#695B64] hover:text-[#A85341] transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Stage: Interactive 24-Hour Circular Experience */}
      <div className="relative bg-gradient-to-b from-[#FFFDF9] via-[#FAF7F2] to-[#F5EFE6] rounded-3xl sm:rounded-[36px] border border-[#EBE3D9] p-4 sm:p-7 lg:p-8 xl:p-10 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-center">
        {/* Soft Ambient Background Elements */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <div className="absolute top-10 left-10 w-24 h-10 bg-white rounded-full blur-xs" />
          <div className="absolute bottom-16 left-20 w-36 h-14 bg-white rounded-full blur-xs" />
        </div>

        {/* Circular SVG Dial Column (7 Cols on desktop - BOLD & PROMINENT) */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center relative select-none w-full">
          <div className="relative w-full max-w-[680px] xl:max-w-[720px] aspect-square mx-auto">
            <svg
              viewBox="0 0 800 800"
              className="w-full h-full drop-shadow-md overflow-visible"
            >
              <defs>
                {/* 1. Day Sky Arc Gradient (Light Cyan to Sky Blue to Cerulean) */}
                <linearGradient id="dayArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7DD3FC" />
                  <stop offset="40%" stopColor="#38BDF8" />
                  <stop offset="100%" stopColor="#0EA5E9" />
                </linearGradient>

                {/* 2. Sunset Arc Gradient (Coral Pink -> Vivid Orange -> Warm Golden Yellow) */}
                <linearGradient id="sunsetArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FB7185" />
                  <stop offset="30%" stopColor="#FB923C" />
                  <stop offset="70%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#FDE047" />
                </linearGradient>

                {/* 3. Night Arc Gradient (Twilight Purple -> Deep Indigo -> Midnight Navy) */}
                <linearGradient id="nightArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#818CF8" />
                  <stop offset="35%" stopColor="#6366F1" />
                  <stop offset="75%" stopColor="#4338CA" />
                  <stop offset="100%" stopColor="#1E1B4B" />
                </linearGradient>

                {/* Parachute Striped Canopy Gradients */}
                <linearGradient id="paraStripe1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EA580C" />
                  <stop offset="25%" stopColor="#F59E0B" />
                  <stop offset="50%" stopColor="#38BDF8" />
                  <stop offset="75%" stopColor="#0284C7" />
                  <stop offset="100%" stopColor="#1E3A8A" />
                </linearGradient>

                {/* Glow Filter for Active Milestone */}
                <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Parachute Canopy Clip Path for 5-Slice Rainbow */}
                <clipPath id="canopyClip">
                  <path d="M -56 -74 C -56 -132, 56 -132, 56 -74 C 42 -68, 14 -78, 0 -74 C -14 -78, -42 -68, -56 -74 Z" />
                </clipPath>
              </defs>

              {/* ── BACKGROUND STORYBOOK CELESTIAL DECORATIONS (From Image Ref 2) ── */}

              {/* Fluffy clouds at bottom left and bottom right corners */}
              <g opacity="0.75" pointerEvents="none">
                <path d="M -40 760 C -10 730, 40 730, 80 750 C 120 730, 180 730, 210 760 C 240 740, 280 750, 300 780 L -40 800 Z" fill="#FFFFFF" />
                <path d="M 520 770 C 560 740, 620 740, 660 760 C 700 740, 760 740, 800 760 C 820 740, 850 760, 860 800 L 500 800 Z" fill="#FFFFFF" />
              </g>

              {/* Top Arched Curved Dashed Flight Line (Connecting Moon to Sun) */}
              <path
                d="M 160 115 C 280 40, 520 40, 640 95"
                fill="none"
                stroke="#E8DFD3"
                strokeWidth="2"
                strokeDasharray="5 7"
                strokeLinecap="round"
                opacity="0.8"
              />

              {/* TOP-RIGHT: Big Smiling Cartoon Sunshine Sitting on Fluffy Clouds */}
              <g transform="translate(685, 105)">
                {/* Fluffy White Clouds supporting Sun */}
                <path
                  d="M -50 25 C -70 25, -70 5, -50 0 C -45 -20, -5 -25, 5 -5 C 25 -10, 40 10, 25 25 Z"
                  fill="#FFFFFF"
                  opacity="0.9"
                  filter="drop-shadow(0 4px 8px rgba(0,0,0,0.06))"
                />
                {/* Sun Rays (12 golden triangular rays with rounded looks) */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <path
                    key={deg}
                    d="M 0 -48 L 7 -36 L -7 -36 Z"
                    fill="#FBBF24"
                    transform={`rotate(${deg})`}
                  />
                ))}
                {/* Sun Disc */}
                <circle r="36" fill="#FBBF24" stroke="#F59E0B" strokeWidth="2.5" />
                <circle r="32" fill="#FDE047" />
                {/* Cute Smiling Face: Curved Happy Eyes + Rosy Cheeks + Sweet Smile */}
                <path d="M -12 -5 Q -8 -11 -4 -5" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 4 -5 Q 8 -11 12 -5" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="-12" cy="3" r="4.5" fill="#FDA4AF" />
                <circle cx="12" cy="3" r="4.5" fill="#FDA4AF" />
                <path d="M -7 4 Q 0 11 7 4" fill="none" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
              </g>

              {/* TOP-LEFT: Night Sky Twilight Cloud & Smiling Crescent Moon */}
              <g transform="translate(125, 125)">
                {/* Indigo Night Cloud */}
                <path
                  d="M -30 20 C -50 20, -50 -10, -30 -10 C -25 -30, 15 -35, 25 -15 C 45 -20, 60 5, 45 20 Z"
                  fill="#4338CA"
                  opacity="0.9"
                  filter="drop-shadow(0 4px 8px rgba(0,0,0,0.12))"
                />
                {/* Golden Crescent Moon */}
                <path
                  d="M -15 -18 A 20 20 0 0 0 -5 18 A 16 16 0 0 1 -15 -18 Z"
                  fill="#FCD34D"
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                />
                {/* Cute Moon Eye */}
                <path d="M -13 -3 Q -10 -6 -8 -3" fill="none" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="-9" cy="2" r="2" fill="#FDA4AF" />
                {/* Tiny Twinkling Stars */}
                <text x="15" y="-5" fontSize="12" fill="#FDE047">⭐</text>
                <text x="-32" y="2" fontSize="9" fill="#FDE047">⭐</text>
              </g>

              {/* Floating Background Stars Around the Canvas */}
              <text x="735" y="270" fontSize="14" fill="#FBBF24">⭐</text>
              <text x="710" y="650" fontSize="16" fill="#FBBF24">⭐</text>
              <text x="90" y="620" fontSize="15" fill="#FBBF24">⭐</text>
              <text x="80" y="240" fontSize="12" fill="#FBBF24">⭐</text>
              <text x="215" y="80" fontSize="13" fill="#FBBF24">⭐</text>
              <text x="540" y="65" fontSize="14" fill="#FBBF24">⭐</text>

              {/* ── THE THICK GLOSSY 24-HOUR SKY ARC (The Centerpiece from Img 2) ── */}

              {/* 1. Daytime Sky Blue Segment (6:30 AM to ~3:30 PM: ~ -50° to +95°) */}
              <path
                d={`M ${CX + R_ARC * Math.cos((-52 * Math.PI) / 180)} ${CY + R_ARC * Math.sin((-52 * Math.PI) / 180)} A ${R_ARC} ${R_ARC} 0 0 1 ${
                  CX + R_ARC * Math.cos((95 * Math.PI) / 180)
                } ${CY + R_ARC * Math.sin((95 * Math.PI) / 180)}`}
                fill="none"
                stroke="url(#dayArcGrad)"
                strokeWidth="66"
                strokeLinecap="round"
                className="drop-shadow-xs"
              />

              {/* 2. Sunset Coral to Golden Yellow Segment (~95° to +210°) */}
              <path
                d={`M ${CX + R_ARC * Math.cos((90 * Math.PI) / 180)} ${CY + R_ARC * Math.sin((90 * Math.PI) / 180)} A ${R_ARC} ${R_ARC} 0 0 1 ${
                  CX + R_ARC * Math.cos((215 * Math.PI) / 180)
                } ${CY + R_ARC * Math.sin((215 * Math.PI) / 180)}`}
                fill="none"
                stroke="url(#sunsetArcGrad)"
                strokeWidth="66"
                strokeLinecap="round"
                className="drop-shadow-xs"
              />

              {/* 3. Deep Night Twilight Purple Segment (~205° to -45° at 8:30 PM) */}
              <path
                d={`M ${CX + R_ARC * Math.cos((210 * Math.PI) / 180)} ${CY + R_ARC * Math.sin((210 * Math.PI) / 180)} A ${R_ARC} ${R_ARC} 0 0 1 ${
                  CX + R_ARC * Math.cos((-48 * Math.PI) / 180)
                } ${CY + R_ARC * Math.sin((-48 * Math.PI) / 180)}`}
                fill="none"
                stroke="url(#nightArcGrad)"
                strokeWidth="68"
                strokeLinecap="round"
                className="drop-shadow-md"
              />

              {/* Puffy Clouds directly on the Day Blue Arc */}
              <g transform="translate(705, 330)">
                <path d="M 0 0 C -10 -15, 20 -20, 25 -5 C 35 -10, 45 10, 30 15 C 20 20, -5 20, 0 0 Z" fill="#BAE6FD" opacity="0.65" />
              </g>
              <g transform="translate(680, 580)">
                <path d="M 0 0 C -10 -15, 20 -20, 25 -5 C 35 -10, 45 10, 30 15 C 20 20, -5 20, 0 0 Z" fill="#BAE6FD" opacity="0.65" />
              </g>

              {/* Mini Smiling Sunshine on the Day Arc near 8:00 AM */}
              <g transform="translate(720, 480)">
                <circle r="15" fill="#FBBF24" />
                <circle r="12" fill="#FDE047" />
                <circle cx="-4" cy="-2" r="1.5" fill="#78350F" />
                <circle cx="4" cy="-2" r="1.5" fill="#78350F" />
                <circle cx="-4" cy="2" r="1.5" fill="#FDA4AF" />
                <circle cx="4" cy="2" r="1.5" fill="#FDA4AF" />
                <path d="M -3 3 Q 0 6 3 3" fill="none" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* ── TIME BUBBLE PILLS ON THE ARC (Matching Image Ref 2) ── */}
              {stages.map((stage, idx) => {
                const angle = getStageAngle(idx, stages.length);
                const rad = (angle * Math.PI) / 180;
                const pillX = CX + R_PILLS * Math.cos(rad);
                const pillY = CY + R_PILLS * Math.sin(rad);
                const isActive = idx === currentStageIndex;
                const isSpecialNight = idx === 10; // 8:30 PM top milestone

                // Choose pill style based on sector (matching Img 2)
                let pillBg = "#BAE6FD";
                let pillText = "#0369A1";
                let pillStroke = "#7DD3FC";

                if (idx >= 0 && idx <= 4) {
                  // Day Sky Blue
                  pillBg = isActive ? "#FFFFFF" : "#BAE6FD";
                  pillText = "#0369A1";
                  pillStroke = isActive ? "#38BDF8" : "#7DD3FC";
                } else if (idx === 5) {
                  // Coral/Pink 4:00 PM
                  pillBg = isActive ? "#FFFFFF" : "#FECDD3";
                  pillText = "#9F1239";
                  pillStroke = isActive ? "#FB7185" : "#FDA4AF";
                } else if (idx >= 6 && idx <= 7) {
                  // Sunset Orange & Gold
                  pillBg = isActive ? "#FFFFFF" : "#FED7AA";
                  pillText = "#9A3412";
                  pillStroke = isActive ? "#FB923C" : "#FDBA74";
                } else {
                  // Night Indigo / Purple
                  pillBg = isSpecialNight ? "#1E1B4B" : (isActive ? "#312E81" : "#4338CA");
                  pillText = "#FFFFFF";
                  pillStroke = isSpecialNight ? "#6366F1" : "#818CF8";
                }

                const pillWidth = isSpecialNight ? 96 : (stage.time.includes("AM") ? 72 : 58);

                return (
                  <g
                    key={`pill-${stage.id}`}
                    transform={`translate(${pillX}, ${pillY})`}
                    className="cursor-pointer transition-transform duration-200 hover:scale-110"
                    onClick={() => setCurrentStageIndex(idx)}
                  >
                    <rect
                      x={-pillWidth / 2}
                      y="-14"
                      width={pillWidth}
                      height="28"
                      rx="14"
                      fill={pillBg}
                      stroke={pillStroke}
                      strokeWidth={isActive ? "2.5" : "1.5"}
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.14))"
                    />
                    <text
                      x={isSpecialNight ? "8" : "0"}
                      y="4.5"
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="800"
                      fill={pillText}
                    >
                      {stage.time.split("–")[0].trim()}
                    </text>
                    {isSpecialNight && (
                      <text x="-30" y="4.5" fontSize="11" fill="#FFF">🕒</text>
                    )}
                  </g>
                );
              })}

              {/* ── 11 NUMBERED MILESTONE DISCS ALONG INNER EDGE (From Image Ref 2) ── */}
              {stages.map((stage, idx) => {
                const angle = getStageAngle(idx, stages.length);
                const rad = (angle * Math.PI) / 180;
                const nodeX = CX + R_NODES * Math.cos(rad);
                const nodeY = CY + R_NODES * Math.sin(rad);
                const isActive = idx === currentStageIndex;

                return (
                  <g
                    key={stage.id}
                    onClick={() => setCurrentStageIndex(idx)}
                    className="cursor-pointer transition-transform duration-300 hover:scale-115"
                    style={{ transformOrigin: `${nodeX}px ${nodeY}px` }}
                  >
                    {/* Active Halo Pulse Ring */}
                    {isActive && (
                      <circle
                        cx={nodeX}
                        cy={nodeY}
                        r="34"
                        fill={theme.accent}
                        fillOpacity="0.3"
                        filter="url(#softGlow)"
                        className="animate-pulse"
                      />
                    )}

                    {/* Milestone Disc: PURE WHITE WITH CRISP DARK OUTLINE */}
                    <circle
                      cx={nodeX}
                      cy={nodeY}
                      r={isActive ? "26" : "22"}
                      fill="#FFFFFF"
                      stroke={isActive ? theme.accent : "#2B2144"}
                      strokeWidth={isActive ? "4" : "2.5"}
                      filter="drop-shadow(0 3px 6px rgba(0,0,0,0.18))"
                    />

                    {/* Bold, 100% Legible Stage Number */}
                    <text
                      x={nodeX}
                      y={nodeY + 6}
                      textAnchor="middle"
                      fontSize={isActive ? "19" : "16"}
                      fontWeight="900"
                      fill={isActive ? theme.accent : "#1F172E"}
                      letterSpacing="-0.5px"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}

              {/* ── CENTER AREA: AARAV PILOT WITH JOY ENERGY RAYS & STAR BANNER ── */}
              <g transform={`translate(${CX}, ${CY})`}>
                {/* 3 Cheerful Sunshine Energy Joy Rays Above Head (\ | /) */}
                <g stroke="#FBBF24" strokeWidth="4.5" strokeLinecap="round">
                  <line x1="56" y1="-70" x2="76" y2="-92" />
                  <line x1="76" y1="-54" x2="100" y2="-66" />
                  <line x1="84" y1="-34" x2="110" y2="-36" />
                </g>

                {/* Soft Golden Outer Halo Ring */}
                <circle r="84" fill="#FFFDF9" stroke="#FDE68A" strokeWidth="7" opacity="0.65" />
                <circle r="74" fill="#FFFDF9" stroke="#F59E0B" strokeWidth="2.8" />

                {/* Circular Portrait Image */}
                <image
                  href={isGirl ? "/avatar_unicorn_girl.png" : "/avatar_dino_boy.png"}
                  x="-60"
                  y="-60"
                  width="120"
                  height="120"
                  clipPath="circle(58px at 60px 60px)"
                />

                {/* Pilot Tag Banner (Cream with Golden Stars) */}
                <g transform="translate(0, 58)">
                  <rect
                    x="-90"
                    y="-16"
                    width="180"
                    height="32"
                    rx="16"
                    fill="#FFFDF9"
                    stroke="#FCD34D"
                    strokeWidth="2"
                    filter="drop-shadow(0 3px 6px rgba(0,0,0,0.12))"
                  />
                  {/* Decorative golden star ear tips */}
                  <text x="-76" y="5" fontSize="13" fill="#FBBF24">⭐</text>
                  <text
                    x="2"
                    y="5.5"
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="800"
                    fill="#2D222A"
                  >
                    {isGirl ? "🌸 Pilot: Ananya" : "🦖 Pilot: Aarav"}
                  </text>
                  <text x="76" y="5" fontSize="13" fill="#FBBF24">⭐</text>
                </g>
              </g>

              {/* ── THE FLOATING PARACHUTE CHARACTER (At Active Stage) ── */}
              <g
                transform={`translate(${displayPos.x}, ${displayPos.y}) rotate(${sway})`}
                className="transition-transform ease-out pointer-events-none"
              >
                {/* Wind / Motion Curve Accents beside parachute */}
                <path d="M -66 -36 C -75 -28, -75 -16, -66 -8" fill="none" stroke="#F59E0B" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M -75 -30 C -84 -22, -84 -12, -75 -4" fill="none" stroke="#F59E0B" strokeWidth="2.8" strokeLinecap="round" />

                {/* 5-Slice Rainbow Arched Parachute Canopy (Matching Exact Image Ref 2) */}
                <g clipPath="url(#canopyClip)" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.22))">
                  {/* Slice 1 (Far Left): Coral Red */}
                  <rect x="-60" y="-140" width="27" height="85" fill="#FF4E50" />
                  {/* Slice 2 (Mid Left): Sunset Orange */}
                  <rect x="-33" y="-140" width="23" height="85" fill="#FFA024" />
                  {/* Slice 3 (Center): Golden Yellow */}
                  <rect x="-10" y="-140" width="20" height="85" fill="#FFD124" />
                  {/* Slice 4 (Mid Right): Vibrant Cyan Sky */}
                  <rect x="10" y="-140" width="23" height="85" fill="#20C5FF" />
                  {/* Slice 5 (Far Right): Rich Royal Blue */}
                  <rect x="33" y="-140" width="27" height="85" fill="#1D70EC" />
                </g>

                {/* Parachute Outer Rim & Scalloped White Border */}
                <path
                  d="M -56 -74 C -56 -132, 56 -132, 56 -74 C 42 -68, 14 -78, 0 -74 C -14 -78, -42 -68, -56 -74 Z"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                />

                {/* Parachute White Rib Seams Between Segments */}
                <path
                  d="M 0 -132 C -10 -105, -21 -86, -33 -74 M 0 -132 C -3 -105, -7 -86, -10 -74 M 0 -132 C 3 -105, 7 -86, 10 -74 M 0 -132 C 10 -105, 21 -86, 33 -74"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeOpacity="0.9"
                />

                {/* Suspension Cords */}
                <line x1="-50" y1="-72" x2="-14" y2="-28" stroke="#8C7A6D" strokeWidth="1.8" />
                <line x1="-18" y1="-72" x2="-6" y2="-28" stroke="#8C7A6D" strokeWidth="1.8" />
                <line x1="18" y1="-72" x2="6" y2="-28" stroke="#8C7A6D" strokeWidth="1.8" />
                <line x1="50" y1="-72" x2="14" y2="-28" stroke="#8C7A6D" strokeWidth="1.8" />

                {/* Parachuter Circular Avatar Body */}
                <g transform="translate(0, -14)">
                  <circle r="26" fill="#FFFFFF" stroke="#0284C7" strokeWidth="3" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.22))" />
                  <image
                    href={isGirl ? "/avatar_unicorn_girl.png" : "/avatar_dino_boy.png"}
                    x="-22"
                    y="-22"
                    width="44"
                    height="44"
                    clipPath="circle(21px at 22px 22px)"
                  />
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* 3. Magical Dreamy Message Popup Card (Matching Exact Reference Template) */}
        <div className="lg:col-span-5 flex flex-col justify-center w-full max-w-[540px] mx-auto">
          {/* Main Card */}
          <div className="relative bg-white rounded-[32px] sm:rounded-[36px] border border-[#EFE7DE] p-7 sm:p-9 shadow-[0_20px_50px_rgba(45,34,42,0.06)] transition-all duration-300">
            {/* Top Row: Category Badge (Left) + Time Badge (Right) */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <span
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border ${theme.pill}`}
              >
                {theme.sky}
              </span>

              <span className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#FAF5EE] border border-[#EFE7DE] text-[#2D222A] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#9C4B3B]" />
                <span>{currentStage.time}</span>
              </span>
            </div>

            {/* Stage Title with Large Squircle Icon */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0 transition-colors"
                style={{ backgroundColor: stageIconBg }}
              >
                <RoutineIcon name={currentStage.icon} className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#A85341] tracking-widest uppercase block mb-1">
                  STAGE {currentStageIndex + 1} OF {stages.length}
                </span>
                <h3 className="font-editorial-serif text-2xl sm:text-3xl font-extrabold text-[#2D222A] tracking-tight leading-tight">
                  {currentStage.activity}
                </h3>
              </div>
            </div>

            {/* Tinted Storybook Box for Parenting Idea */}
            <div className="w-full bg-[#FAF5EE] border border-[#EFE5D8] rounded-2xl p-5 sm:p-6 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">💡</span>
                <span className="text-xs font-bold text-[#A85341] tracking-wider uppercase">
                  PARENTING IDEA
                </span>
              </div>
              <p className="font-editorial-sans italic font-medium text-base sm:text-lg text-[#2D222A] leading-relaxed">
                “{currentStage.parenting_idea}”
              </p>
            </div>

            {/* Footer Row: Guide + Action Buttons */}
            <div className="border-t border-[#F2ECE3] pt-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white shadow-xs">
                  <img
                    src={isGirl ? "/avatar_unicorn_girl.png" : "/avatar_dino_boy.png"}
                    alt="Guide"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-[#52444C]">
                  With <strong className="text-[#2D222A] font-bold">{isGirl ? "Ananya" : "Aarav"}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl bg-[#FAF5EE] hover:bg-[#F2ECE3] text-[#2D222A] text-xs font-bold border border-[#E8DEC8] transition cursor-pointer"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 rounded-xl bg-[#9C4B3B] hover:bg-[#853F32] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* Numbered Pagination Circles Below the Card (1 to 11 Matching Reference) */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 mt-6">
            {stages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentStageIndex(i)}
                aria-label={`Jump to stage ${i + 1}`}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  currentStageIndex === i
                    ? "bg-[#9C4B3B] text-white shadow-md scale-105"
                    : "bg-white hover:bg-[#FAF5EE] text-[#52444C] border border-[#E2D7CC] shadow-2xs hover:border-[#9C4B3B]"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
