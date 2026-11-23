import { useState } from "react";
import {
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Check,
  Camera,
  Upload,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { PhotoValidationReport } from "@/lib/photoValidator";

export interface PhotoValidationStatusProps {
  originalPreview: string;
  enhancedPreview: string | null;
  isEnhancing: boolean;
  enhanceError?: string | null;
  selectedPortrait: "original" | "enhanced" | null;
  onSelectEnhanced: () => void;
  onSelectOriginal: () => void;
  onRetryEnhance: () => void;
  validationReport: PhotoValidationReport | null;
  onResetPhoto: () => void;
  onChangePhotoClick: () => void;
  onCameraClick?: () => void;
}

export default function PhotoValidationStatus({
  originalPreview,
  enhancedPreview,
  isEnhancing,
  enhanceError,
  selectedPortrait,
  onSelectEnhanced,
  onSelectOriginal,
  onRetryEnhance,
  validationReport,
  onResetPhoto,
  onChangePhotoClick,
  onCameraClick,
}: PhotoValidationStatusProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Derived validity
  const isDisplayValid = validationReport ? validationReport.isValid : true;
  const displayScore = validationReport?.score || (isDisplayValid ? 96 : 48);

  // Extract individual check results
  const chkFront = validationReport?.checks.find((c) => c.id === "front_facing");
  const chkMouth = validationReport?.checks.find((c) => c.id === "uncovered_face");
  const chkAccessory = validationReport?.checks.find((c) => c.id === "no_accessories");
  const chkFraming = validationReport?.checks.find((c) => c.id === "distance_framing");

  const isFrontOk = chkFront ? chkFront.status === "pass" : true;
  const isMouthOk = chkMouth ? chkMouth.status === "pass" : true;
  const isAccessoryOk = chkAccessory ? chkAccessory.status === "pass" : true;
  const isFramingOk = chkFraming ? chkFraming.status === "pass" : true;

  // Selection states: strictly determined by user choice, NOT active during initial loading!
  const isCard1Selected = selectedPortrait === "original";
  const isCard2Selected = selectedPortrait === "enhanced";

  return (
    <div className="rounded-3xl border border-[#EBE3D9] bg-white p-5 sm:p-7 shadow-sm space-y-6">
      {/* Top Header: Upload Status & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EAE1]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isDisplayValid
                ? "bg-[#DCFCE7] text-[#15803D] border border-[#86EFAC]"
                : "bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]"
                }`}
            >
              {isDisplayValid ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>PHOTO READY FOR ATELIER</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2]" />
                  <span>PHOTO QUALITY NOTICE</span>
                </>
              )}
            </span>

            <span className="text-xs text-[#695B64] font-medium">
              Portrait Match: <strong className={isDisplayValid ? "text-[#15803D]" : "text-[#B91C1C]"}>{displayScore}%</strong>
            </span>
          </div>

          <p className="text-xs text-[#5E515B] mt-1.5 font-editorial-sans">
            Choose your preferred reference portrait: original upload or studio enhanced.
          </p>
        </div>

        {/* Action buttons (Replace / Camera / Reset) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onChangePhotoClick}
            className="px-3.5 py-1.5 rounded-full border border-[#D8CCC0] hover:border-[#C98A84] text-xs font-medium text-[#2D222A] hover:text-[#C98A84] flex items-center gap-1.5 bg-[#FAF7F2] hover:bg-white transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Replace</span>
          </button>

          {onCameraClick && (
            <button
              type="button"
              onClick={onCameraClick}
              className="px-3.5 py-1.5 rounded-full border border-[#D8CCC0] hover:border-[#C98A84] text-xs font-medium text-[#2D222A] hover:text-[#C98A84] flex items-center gap-1.5 bg-[#FAF7F2] hover:bg-white transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
          )}

          <button
            type="button"
            onClick={onResetPhoto}
            className="p-1.5 rounded-full hover:bg-[#FAEEED] text-[#C98A84] transition cursor-pointer"
            title="Remove photo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C98A84]" />
            <h3 className="text-sm font-bold text-[#2D222A]">
              Step 1: Choose Reference Portrait
            </h3>
          </div>
          <span className="text-[11px] text-[#867682] hidden sm:inline">
            Click on either portrait to select it for storybook generation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          {/* Card 1: Original Upload */}
          <div
            onClick={onSelectOriginal}
            className={`relative rounded-3xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between ${isCard1Selected
              ? "border-[#15803D] bg-[#F0FDF4]/50 shadow-md ring-2 ring-[#15803D]/20"
              : "border-[#EBE3D9] bg-white hover:border-[#D8CCC0] hover:bg-[#FAF7F2]/30"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between min-h-[26px]">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-[#E0D7CD] text-[#5E515B]">
                  <span>📷</span>
                  <span>Original Image</span>
                </span>
                {isCard1Selected && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded-full">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Selected
                  </span>
                )}
              </div>

              <div className="relative aspect-square w-full max-h-[300px] rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center border border-[#EBE3D9]">
                <img
                  src={originalPreview}
                  alt="Original child photo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EBE3D9]/60 mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectOriginal();
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${isCard1Selected
                  ? "bg-[#15803D] hover:bg-[#166534] text-white font-bold shadow-sm ring-1 ring-[#15803D]"
                  : "bg-white border border-[#D8CCC0] text-[#5E515B] font-semibold hover:bg-[#FAF7F2]"
                  }`}
              >
                {isCard1Selected ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Selected (Original Photo)</span>
                  </>
                ) : (
                  <span>Select Original Photo</span>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: AI Studio Enhanced (White Backdrop) */}
          <div
            onClick={() => {
              if (enhancedPreview) onSelectEnhanced();
            }}
            className={`relative rounded-3xl p-4 border-2 transition-all flex flex-col justify-between ${isCard2Selected
              ? "border-[#15803D] bg-[#F0FDF4]/50 shadow-md ring-2 ring-[#15803D]/20 cursor-pointer"
              : enhancedPreview
                ? "border-[#EBE3D9] bg-white hover:border-[#D8CCC0] hover:bg-[#FAF7F2]/30 cursor-pointer"
                : "border-[#EBE3D9] bg-white"
              }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between min-h-[26px]">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FAF0EE] border border-[#F2DCD8] text-[#C98A84]">
                  <Sparkles className="w-3.5 h-3.5 text-[#C98A84]" />
                  <span>AI Enhanced </span>
                </span>
                {isCard2Selected && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded-full">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Selected
                  </span>
                )}
              </div>

              {/* State A: Currently Enhancing */}
              {isEnhancing && (
                <div className="relative aspect-square w-full max-h-[300px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#FAF7F2] to-[#F5ECE8] border border-[#EBE3D9] flex flex-col items-center justify-center p-6 text-center">
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#C98A84] to-transparent shadow-[0_0_12px_#C98A84] animate-pulse" />
                  <div className="w-12 h-12 rounded-full bg-[#FAF0EE] border border-[#F2DCD8] flex items-center justify-center text-[#C98A84] animate-spin mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-[#2D222A]">
                    KuttyStory Atelier at Work...
                  </h4>
                  <p className="text-[11px] text-[#7A6D77] mt-1 leading-relaxed max-w-xs">
                    Isolating clean white background and enhancing facial lighting.
                  </p>
                  <span className="mt-3 inline-block px-2.5 py-0.5 rounded-full bg-white text-[10px] font-semibold text-[#C98A84] border border-[#EBE3D9]">
                    Takes ~5-8 seconds
                  </span>
                </div>
              )}

              {/* State B: Error Enhancing */}
              {!isEnhancing && enhanceError && !enhancedPreview && (
                <div className="relative aspect-square w-full max-h-[300px] rounded-2xl overflow-hidden bg-[#FEF2F2] border border-[#FECACA] flex flex-col items-center justify-center p-6 text-center">
                  <AlertTriangle className="w-8 h-8 text-[#DC2626] mb-2" />
                  <p className="text-xs font-bold text-[#991B1B]">Enhancement Notice</p>
                  <p className="text-[11px] text-[#7F1D1D] mt-1 max-w-xs">{enhanceError}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetryEnhance();
                    }}
                    className="mt-3 px-4 py-1.5 rounded-full bg-[#DC2626] text-white text-xs font-semibold hover:bg-[#B91C1C] transition cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Enhancement</span>
                  </button>
                </div>
              )}

              {/* State C: Enhanced Image Ready */}
              {!isEnhancing && enhancedPreview && (
                <div className="relative aspect-square w-full max-h-[300px] rounded-2xl overflow-hidden bg-white flex items-center justify-center border border-[#EBE3D9] group shadow-inner">
                  <img
                    src={enhancedPreview}
                    alt="AI enhanced studio portrait"
                    className="w-full h-full object-contain p-2"
                  />

                </div>
              )}

            </div>

            {/* Confirmation CTA Button */}
            <div className="pt-3 border-t border-[#EBE3D9]/60 mt-3">
              <button
                type="button"
                disabled={isEnhancing || !enhancedPreview}
                onClick={(e) => {
                  e.stopPropagation();
                  if (enhancedPreview) onSelectEnhanced();
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${isCard2Selected
                  ? "bg-[#15803D] hover:bg-[#166534] text-white font-bold shadow-sm ring-1 ring-[#15803D]"
                  : !enhancedPreview
                    ? "bg-gray-100 text-gray-400 font-medium cursor-not-allowed"
                    : "bg-white border border-[#D8CCC0] text-[#5E515B] font-semibold hover:bg-[#FAF7F2]"
                  }`}
              >
                {isCard2Selected ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Selected (AI Enhanced)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#C98A84]" />
                    <span>Select Enhanced Portrait</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status Callout after Choice */}
        {selectedPortrait && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${selectedPortrait === "enhanced"
              ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]"
              : "bg-[#F7F3EC] border-[#EBE3D9] text-[#5E515B]"
              }`}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#15803D]" />
              <span className="font-semibold">
                {selectedPortrait === "enhanced"
                  ? "✓ AI Studio Enhanced Portrait Selected! Proceed below to choose character outfit."
                  : "✓ Original Photo Selected! Proceed below to choose character outfit."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4 Portrait Guidelines Section (Compact) */}
      <div className="pt-4 border-t border-[#F0EAE1]">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-[#2D222A]">
            Atelier Quality Verification
          </span>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] text-[#C98A84] hover:text-[#B87A74] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>{showDetails ? "Hide Guidelines" : "View Quality Guidelines"}</span>
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* 4 Mini Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${isFrontOk ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]" : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white shrink-0 text-[9px] ${isFrontOk ? "bg-[#22C55E]" : "bg-[#EF4444]"}`}>
              {isFrontOk ? "✓" : "✕"}
            </span>
            <span className="truncate">Front-Facing</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${isMouthOk ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]" : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white shrink-0 text-[9px] ${isMouthOk ? "bg-[#22C55E]" : "bg-[#EF4444]"}`}>
              {isMouthOk ? "✓" : "✕"}
            </span>
            <span className="truncate">Uncovered Face</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${isAccessoryOk ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]" : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white shrink-0 text-[9px] ${isAccessoryOk ? "bg-[#22C55E]" : "bg-[#EF4444]"}`}>
              {isAccessoryOk ? "✓" : "✕"}
            </span>
            <span className="truncate">No Sunglasses</span>
          </div>

          <div className={`p-2 rounded-xl border flex items-center gap-1.5 ${isFramingOk ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]" : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white shrink-0 text-[9px] ${isFramingOk ? "bg-[#22C55E]" : "bg-[#EF4444]"}`}>
              {isFramingOk ? "✓" : "✕"}
            </span>
            <span className="truncate">Close-Up Framing</span>
          </div>
        </div>

        {/* Collapsible Details */}
        {showDetails && validationReport && (
          <div className="mt-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-1.5 text-[11px] text-[#4E424B]">
            <p className="font-semibold text-[#2D222A]">Diagnostic Summary:</p>
            <p className="text-[11px] text-[#5E515B]">{validationReport.summary}</p>
            {validationReport.recommendations?.map((rec, i) => (
              <p key={i} className="text-[#991B1B]">• {rec}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
