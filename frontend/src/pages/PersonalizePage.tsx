import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import {
  Sparkles,
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  FlipHorizontal,
  RotateCcw,
  BookOpen,
  Layout,
  Lock,
  Shirt,
  ShieldCheck,
  Languages,
  Globe,
  Check
} from "lucide-react";
import { api, StoryTemplate, PersonalizationJob, GeneratedAsset } from "@/lib/api";
import { processSolidBackground } from "@/lib/imageProcessor";
import { validateChildPhoto, PhotoValidationReport } from "@/lib/photoValidator";
import PersonalizationRoadmap from "@/components/PersonalizationRoadmap";
import PhotoTipsGuide from "@/components/PhotoTipsGuide";
import PhotoValidationStatus from "@/components/PhotoValidationStatus";
import RealisticBookFlipViewer from "@/components/RealisticBookFlipViewer";
import StorybookMagicLoader from "@/components/StorybookMagicLoader";
import PaymentModal from "@/components/PaymentModal";
import PdfDownloadModal from "@/components/PdfDownloadModal";
import Seo from "@/seo/Seo";
import { getProductSeoConfig } from "@/seo/routes";
import { getProductSchema, getBreadcrumbSchema } from "@/seo/schema";
import FaqSection from "@/components/FaqSection";
import { PRODUCT_PAGE_FAQS } from "@/seo/faqs";
import { trackViewItem, trackPersonaliseStart, trackPreviewView } from "@/lib/analytics";

function base64ToBlob(base64Data: string): Blob {
  try {
    const parts = base64Data.split(",");
    const byteString = atob(parts[1] || parts[0]);
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  } catch (err) {
    console.error("base64ToBlob error:", err);
    return new Blob([], { type: "image/png" });
  }
}

function getStoryAgeRange(story: StoryTemplate | null): { minAge: number; maxAge: number } {
  let minAge = story?.min_age ?? 3;
  let maxAge = story?.max_age ?? 7;
  if (story?.age_range) {
    const match = story.age_range.match(/(\d+)\s*[-–to]\s*(\d+)/i);
    if (match) {
      const pMin = parseInt(match[1], 10);
      const pMax = parseInt(match[2], 10);
      if (
        story.min_age === undefined ||
        story.min_age === null ||
        (story.min_age === 2 && story.max_age === 13)
      ) {
        minAge = pMin;
        maxAge = pMax;
      }
    }
  }
  if (minAge > maxAge) {
    const tmp = minAge;
    minAge = maxAge;
    maxAge = tmp;
  }
  return { minAge: Math.max(1, minAge), maxAge: Math.min(18, maxAge) };
}

export default function PersonalizePage() {
  const params = useParams<{ slug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const slug = params?.slug || "unicorn-story";
  const urlJobId = searchParams.get("job_id");

  // Story & page state
  const [story, setStory] = useState<StoryTemplate | null>(null);
  const [defaultPdfPrice, setDefaultPdfPrice] = useState<number>(799);
  const [defaultHardcoverPrice, setDefaultHardcoverPrice] = useState<number>(1399);
  const [languageSurcharge, setLanguageSurcharge] = useState<number>(99);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states: Child profile details
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("5");
  const [childGender, setChildGender] = useState<"girl" | "boy">("girl");
  const [guardianConsent, setGuardianConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Compute story's fixed age range
  const { minAge: storyMinAge, maxAge: storyMaxAge } = useMemo(
    () => getStoryAgeRange(story),
    [story]
  );

  // Allowed age options strictly constrained to the story's configured min/max age
  const allowedAgeOptions = useMemo(() => {
    const list: number[] = [];
    for (let a = storyMinAge; a <= storyMaxAge; a++) {
      list.push(a);
    }
    return list;
  }, [storyMinAge, storyMaxAge]);

  // Photo input & live camera states
  const [inputMode, setInputMode] = useState<"upload" | "camera" | null>(null);
  const [rawPhotoFile, setRawPhotoFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);

  // Photo validation state
  const [validationReport, setValidationReport] = useState<PhotoValidationReport | null>(null);
  const [isValidatingPhoto, setIsValidatingPhoto] = useState(false);

  // Live camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Background removal / plain backdrop states
  const [useCleanBg, setUseCleanBg] = useState(false);
  const [selectedBackdropHex, setSelectedBackdropHex] = useState("#FAF7F2");
  const [cleanPreview, setCleanPreview] = useState<string | null>(null);
  const [cleanPhotoBlob, setCleanPhotoBlob] = useState<Blob | null>(null);
  const [isProcessingBg, setIsProcessingBg] = useState(false);

  // Studio AI Portrait Enhancement states
  const [enhancedPreview, setEnhancedPreview] = useState<string | null>(null);
  const [enhancedKey, setEnhancedKey] = useState<string | null>(null);
  const [enhancedPhotoBlob, setEnhancedPhotoBlob] = useState<Blob | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [selectedPortrait, setSelectedPortrait] = useState<"original" | "enhanced" | null>(null);

  // Character outfit style: "story" (story character costume) or "photo" (keep child's own clothes)
  const [outfitMode, setOutfitMode] = useState<"story" | "photo">("story");

  // Job & Preview states: URL query param is the single source of truth
  const [jobId, setJobId] = useState<string | null>(() => urlJobId || null);
  const [job, setJob] = useState<PersonalizationJob | null>(null);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [retryingAssetId, setRetryingAssetId] = useState<string | null>(null);
  const [viewerMode, setViewerMode] = useState<"flipbook" | "spread">("flipbook");
  // Payment modal is strictly manual: only opens when user explicitly clicks Unlock/Purchase
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Synchronize state with URL search param as the single source of truth:
  // - If urlJobId changes or is present: update jobId to urlJobId
  // - If urlJobId is absent (e.g., navigated to /personalize/:slug or clicked back): clear jobId and job
  useEffect(() => {
    if (urlJobId) {
      if (jobId !== urlJobId) {
        setJobId(urlJobId);
      }
    } else {
      if (jobId !== null) {
        setJobId(null);
        setJob(null);
        setCurrentPageIdx(0);
        setRawPhotoFile(null);
        setOriginalPreview(null);
        setCleanPreview(null);
        setEnhancedPreview(null);
        setValidationReport(null);
        setChildName("");
      }
    }
  }, [urlJobId]);

  // Keep last_storybook_url updated when viewing an active job
  useEffect(() => {
    if (jobId) {
      try {
        localStorage.setItem("last_storybook_url", window.location.href);
      } catch (e) { }
    }
  }, [jobId]);

  // Persist and restore payment modal state if user accidentally refreshes during checkout
  useEffect(() => {
    try {
      if (showPaymentModal && jobId) {
        sessionStorage.setItem("kuttystory_pending_payment", jobId);
      } else if (!showPaymentModal) {
        sessionStorage.removeItem("kuttystory_pending_payment");
      }
    } catch (e) { }
  }, [showPaymentModal, jobId]);

  useEffect(() => {
    try {
      const pendingJob = sessionStorage.getItem("kuttystory_pending_payment");
      if (pendingJob && pendingJob === jobId && job && !job.is_paid && !showPaymentModal) {
        setShowPaymentModal(true);
      }
    } catch (e) { }
  }, [jobId, job, showPaymentModal]);

  // PDF Download loading animation modal state
  const [downloadModal, setDownloadModal] = useState<{
    isOpen: boolean;
    url: string | null;
    filename?: string;
    formatTitle?: string;
  }>({
    isOpen: false,
    url: null,
  });

  const triggerPdfDownload = (url: string, filename: string, formatTitle: string) => {
    setDownloadModal({
      isOpen: true,
      url,
      filename,
      formatTitle,
    });
  };

  // Multi-Language Translation states
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  const handleLanguageChange = async (targetLang: string) => {
    setSelectedLanguage(targetLang);
    if (targetLang === "english") {
      setTranslations({});
      return;
    }
    if (!jobId) return;
    setIsTranslating(true);
    try {
      const res = await api.translateJob(jobId, targetLang);
      if (res && res.translations) {
        setTranslations(res.translations);
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };


  // Auto-load narrative translations for the reader when selectedLanguage is non-English
  useEffect(() => {
    if (job?.id && selectedLanguage && selectedLanguage !== "english") {
      setIsTranslating(true);
      api.translateJob(job.id, selectedLanguage)
        .then((res) => {
          if (res?.translations) {
            setTranslations(res.translations);
          }
        })
        .catch((err) => console.warn("Notice: Loading translation for reader:", err))
        .finally(() => setIsTranslating(false));
    }
  }, [job?.id, selectedLanguage]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch story template and scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    api.getAnnouncement().then((ann) => {
      if (ann?.default_pdf_price) {
        setDefaultPdfPrice(Number(ann.default_pdf_price));
      }
      if (ann?.default_hardcover_price) {
        setDefaultHardcoverPrice(Number(ann.default_hardcover_price));
      }
      if (ann?.regional_language_surcharge !== undefined && ann.regional_language_surcharge !== null) {
        setLanguageSurcharge(Number(ann.regional_language_surcharge));
      }
    }).catch(() => { });
    api.getStory(slug)
      .then((data) => {
        setStory(data);
        trackViewItem({
          item_id: data.slug,
          item_name: data.title,
          price: data.price_print || defaultHardcoverPrice,
          currency: data.currency || "INR",
          item_category: data.category,
        });
        const tg = (data.target_gender || "both").toLowerCase().trim();
        if (tg === "boy" || tg === "boys" || tg === "male") {
          setChildGender("boy");
        } else if (tg === "girl" || tg === "girls" || tg === "female") {
          setChildGender("girl");
        }
        const range = getStoryAgeRange(data);
        setChildAge((prev) => {
          const num = parseInt(prev, 10);
          if (isNaN(num) || num < range.minAge) return String(range.minAge);
          if (num > range.maxAge) return String(range.maxAge);
          return prev;
        });
      })
      .catch((err) => {
        console.error("Error loading story:", err);
        setError("Could not load story details.");
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Polling job progress when job is active (sequential in-flight guard, no request stacking)
  useEffect(() => {
    if (!jobId) return;

    let isMounted = true;
    let isFetching = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const pollJob = async () => {
      if (!isMounted || isFetching) return;
      isFetching = true;

      try {
        const updated = await api.getPersonalizationJob(jobId);
        if (!isMounted) return;
        setJob(updated);
        if (updated.language && updated.language !== "english" && selectedLanguage === "english") {
          setSelectedLanguage(updated.language);
        }

        if (updated.story_slug && updated.story_slug !== slug && (!story || story.slug !== updated.story_slug)) {
          api.getStory(updated.story_slug).then((s) => {
            if (isMounted) setStory(s);
          }).catch(() => { });
        }

        const statusLower = updated.status?.toLowerCase();
        const isDone = statusLower === "completed" || statusLower === "failed" || statusLower === "done";
        if (!isDone && isMounted) {
          // Schedule next poll ONLY after current response arrives (2.5s interval)
          timerId = setTimeout(pollJob, 2500);
        }
      } catch (err: any) {
        console.error("Polling error:", err);
        if (isMounted) {
          if (err?.status === 404 || err?.message?.toLowerCase()?.includes("not found")) {
            setError("The requested personalized story could not be found. You can start a new personalization below.");
            setJob(null);
            setJobId(null);
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.delete("job_id");
              return next;
            }, { replace: true });
            return;
          }
          // Back off on network error
          timerId = setTimeout(pollJob, 4000);
        }
      } finally {
        isFetching = false;
      }
    };

    pollJob();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [jobId, slug]);

  const previewTrackedRef = useRef(false);
  useEffect(() => {
    if (job?.assets && job.assets.length > 0 && !previewTrackedRef.current) {
      previewTrackedRef.current = true;
      trackPreviewView(story?.slug || slug || "unicorn-story");
    }
  }, [job?.assets, story?.slug, slug]);

  // Ensure currentPageIdx stays within page bounds (max 3 for unpaid preview, all for paid)
  useEffect(() => {
    const isPaid = Boolean(job?.is_paid || job?.is_purchased);
    const maxCount = isPaid ? (job?.assets || []).length : Math.min((job?.assets || []).length, 3);
    if (currentPageIdx >= maxCount && maxCount > 0) {
      setCurrentPageIdx(maxCount - 1);
    }
  }, [job?.assets, job?.is_paid, job?.is_purchased, currentPageIdx]);

  // Start live webcam stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        "Camera permission denied or camera not available. Please allow camera access in your browser or use the file upload option."
      );
      setIsCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Switch between front / back camera
  const switchCamera = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 150);
    }
  };

  // Take snapshot from live video
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Center-crop square from video feed
    const sx = ((video.videoWidth || 640) - size) / 2;
    const sy = ((video.videoHeight || 640) - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], "live_capture.jpg", { type: "image/jpeg" });
        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

        stopCamera();
        setRawPhotoFile(file);
        setOriginalPreview(dataUrl);

        // Photo validation (YuNet face landmark analysis + client fallback)
        setIsValidatingPhoto(true);
        validateChildPhoto(dataUrl, blob.size, blob)
          .then((report) => setValidationReport(report))
          .catch((err) => console.warn("Validation error:", err))
          .finally(() => setIsValidatingPhoto(false));

        // Trigger Studio AI Portrait Enhancement
        triggerEnhance(file);
      },
      "image/jpeg",
      0.95
    );
  };

  // Trigger Studio AI Portrait enhancement
  const triggerEnhance = async (fileOrBlob: File | Blob) => {
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      const res = await api.enhancePhoto(fileOrBlob);
      if (res && (res.enhanced_url || res.enhanced_base64)) {
        const previewUrl = res.enhanced_base64 || res.enhanced_url;
        setEnhancedPreview(previewUrl);
        if (res.enhanced_key) {
          setEnhancedKey(res.enhanced_key);
        }
        // In-memory synchronous conversion: guaranteed zero network/CORS issues!
        if (res.enhanced_base64) {
          const blob = base64ToBlob(res.enhanced_base64);
          if (blob && blob.size > 0) {
            setEnhancedPhotoBlob(blob);
          }
        }
      }
    } catch (err: any) {
      console.warn("Studio portrait enhancement notice:", err);
      setEnhanceError(err.message || "Enhancement unavailable. You can proceed with your original photo.");
      // keep selectedPortrait null
    } finally {
      setIsEnhancing(false);
    }
  };

  // Handle photo file selection (from Dropzone or Button)
  const handlePhotoSelect = async (file: File) => {
    setRawPhotoFile(file);
    setSelectedPortrait(null);
    const url = URL.createObjectURL(file);
    setOriginalPreview(url);

    // Run photo guidelines validation (YuNet face landmark analysis + client fallback)
    setIsValidatingPhoto(true);
    try {
      const report = await validateChildPhoto(url, file.size, file);
      setValidationReport(report);
    } catch (err) {
      console.warn("Validation error:", err);
    } finally {
      setIsValidatingPhoto(false);
    }

    // Trigger Studio AI Portrait Enhancement
    triggerEnhance(file);
  };

  // Handle file input event
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoSelect(e.target.files[0]);
    }
  };

  // Process solid background removal
  const processBgReplacement = async (imageSrc: string, bgHex: string) => {
    setIsProcessingBg(true);
    try {
      const res = await processSolidBackground(imageSrc, bgHex);
      setCleanPreview(res.dataUrl);
      setCleanPhotoBlob(res.blob);
    } catch (err) {
      console.error("Background processing error:", err);
    } finally {
      setIsProcessingBg(false);
    }
  };

  // Change solid background color preset
  const handleBackdropChange = (bgHex: string) => {
    setSelectedBackdropHex(bgHex);
    if (originalPreview) {
      processBgReplacement(originalPreview, bgHex);
    }
  };

  // Reset/retake photo
  const handleResetPhoto = () => {
    setRawPhotoFile(null);
    setOriginalPreview(null);
    setCleanPreview(null);
    setCleanPhotoBlob(null);
    setEnhancedPreview(null);
    setEnhancedKey(null);
    setEnhancedPhotoBlob(null);
    setEnhanceError(null);
    setSelectedPortrait(null);
    setValidationReport(null);
    if (inputMode === "camera") {
      startCamera();
    }
  };

  // Submit personalization job (Backend logic preserved exactly as requested!)
  const handleStartPersonalization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim()) {
      setError("Please enter your child's first name.");
      return;
    }
    if (!rawPhotoFile) {
      setError("Please upload or take a photograph of your child.");
      return;
    }

    trackPersonaliseStart(story?.slug || slug || "unicorn-story", story?.title);
    if (!selectedPortrait) {
      if (isEnhancing) {
        setError("Photo enhancement is in progress. Please select your Original Photo or wait for enhancement to complete.");
      } else {
        setError("Please select a reference portrait (Original Photo or Enhanced Portrait) to proceed.");
      }
      const photoSection = document.getElementById("photo-upload-section");
      if (photoSection) {
        photoSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    if (!guardianConsent) {
      setError("Parent or legal guardian consent is required to process the photograph.");
      return;
    }
    if (!story) return;

    // Enforce gender constraints
    const storyTargetGender = (story.target_gender || "both").toLowerCase().trim();
    if ((storyTargetGender === "boy" || storyTargetGender === "boys") && childGender !== "boy") {
      setError("This story is exclusively available for boys.");
      return;
    }
    if ((storyTargetGender === "girl" || storyTargetGender === "girls") && childGender !== "girl") {
      setError("This story is exclusively available for girls.");
      return;
    }

    // Enforce age constraints
    const ageNum = parseInt(childAge, 10);
    if (isNaN(ageNum) || ageNum < storyMinAge || ageNum > storyMaxAge) {
      setError(`This story is fixed for ages ${storyMinAge} to ${storyMaxAge}. Selected age (${childAge}) is out of range.`);
      return;
    }

    setError(null);
    setSubmitting(true);
    setShowPaymentModal(false);
    try {
      sessionStorage.removeItem("reopen_payment_modal");
    } catch (e) { }
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const formData = new FormData();
      formData.append("story_id", story.id);
      formData.append("child_name", childName.trim());
      formData.append("guardian_consent", "true");
      formData.append("outfit_mode", outfitMode);
      formData.append("child_gender", childGender);
      formData.append("child_age", childAge);
      formData.append("language", selectedLanguage);

      // Send the approved photo choice:
      // If customer selected "enhanced", send enhancedKey and the enhanced image blob
      if (selectedPortrait === "enhanced") {
        if (enhancedKey) {
          formData.append("photo_key", enhancedKey);
        }
        const photoToSend = enhancedPhotoBlob || rawPhotoFile;
        formData.append("photo", photoToSend, "enhanced_child_photo.png");
      } else {
        formData.append("photo", rawPhotoFile, "raw_child_photo.png");
      }

      const createdJob = await api.startPersonalization(formData);
      setJobId(createdJob.id);
      setJob(createdJob);
      try {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("job_id", createdJob.id);
          return next;
        }, { replace: true });
      } catch (e) { }
      if (createdJob.language) {
        setSelectedLanguage(createdJob.language);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Failed to start personalization.");
    } finally {
      setSubmitting(false);
    }
  };

  // Start fresh personalization for another child
  const handleStartNewStory = () => {
    if (window.confirm("Start fresh for another child? Your current storybook preview will remain saved in its direct link.")) {
      try {
        sessionStorage.removeItem("kuttystory_pending_payment");
      } catch (e) { }
      setJobId(null);
      setJob(null);
      setRawPhotoFile(null);
      setOriginalPreview(null);
      setCleanPreview(null);
      setEnhancedPreview(null);
      setChildName("");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("job_id");
        return next;
      }, { replace: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Single page retry
  const handleRetryPage = async (assetId: string) => {
    setRetryingAssetId(assetId);
    try {
      await api.retryAsset(assetId);
      if (jobId) {
        const refreshed = await api.getPersonalizationJob(jobId);
        setJob(refreshed);
      }
    } catch (err: any) {
      alert("Retry error: " + err.message);
    } finally {
      setRetryingAssetId(null);
    }
  };

  if (loading || (jobId && !job && !error)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#C98A84] font-medium">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Opening Story Atelier...</span>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-[#C98A84] mx-auto" />
        <h2 className="font-editorial-serif text-3xl font-bold text-[#2D222A]">Story Not Found</h2>
        <p className="text-sm text-[#695B64]">{error || "The requested story template could not be loaded."}</p>
        <Link to="/" className="inline-block px-6 py-2.5 rounded-full bg-[#C98A84] text-white text-xs font-semibold">
          Return to Story Catalog
        </Link>
      </div>
    );
  }

  // Active reference portrait honoring customer's studio selection
  const activeChildPhotoUrl =
    selectedPortrait === "enhanced"
      ? (enhancedPreview || job?.photo_url || originalPreview)
      : (originalPreview || job?.photo_url || enhancedPreview);

  const isPaidOrPurchased = Boolean(job?.is_paid || job?.is_purchased);
  const assets: GeneratedAsset[] = isPaidOrPurchased ? (job?.assets || []) : (job?.assets || []).slice(0, 3);
  const currentAsset = assets[currentPageIdx];

  const productSeo = getProductSeoConfig({
    title: story.title,
    category: story.category,
    description: story.description,
    slug: story.slug,
    cover_image_url: story.cover_image_url
  });
  const isFlowState = Boolean(jobId || urlJobId || job);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Search Engine Optimization & Product Structured Data */}
      <Seo
        config={productSeo}
        noindex={isFlowState}
        schemas={[
          getProductSchema({
            title: story.title,
            slug: story.slug,
            description: story.description,
            coverImageUrl: story.cover_image_url,
            priceDigital: story.price_digital || defaultPdfPrice,
            pricePrint: story.price_print || defaultHardcoverPrice,
            currency: story.currency || "INR",
            ageRange: story.age_range
          }),
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Stories", path: "/stories" },
            { name: story.title, path: `/personalize/${story.slug}` }
          ])
        ]}
      />

      {/* Hidden File Input for trigger buttons */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Breadcrumb & Title */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-[#695B64]">
          <Link to="/" className="hover:text-[#C98A84]">Home</Link>
          <span>/</span>
          <Link to="/stories" className="hover:text-[#C98A84]">Stories</Link>
          <span>/</span>
          <span className="text-[#2D222A] font-medium">{story.title}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-editorial-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D222A] tracking-tight">
              {story.title} — Personalised Story Book for Kids
            </h1>
          </div>
        </div>
      </div>

      {/* Product Content Block Above Form: About, Details, Special Features */}
      {!job && (
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EBE3D9] shadow-xs space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAEEED] text-xs font-semibold text-[#C98A84]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>About This Personalised Story</span>
              </div>
              <h2 className="font-editorial-serif text-2xl sm:text-3xl font-bold text-[#2D222A]">
                What Makes {story.title} Special
              </h2>
              <p className="text-xs sm:text-sm text-[#695B64] leading-relaxed">
                {story.description || `In ${story.title}, your child embarks on a luminous adventure that celebrates kindness, bravery, and friendship. Every page is tailored with their name and likeness across full-color illustrations.`}
              </p>
              <div className="pt-1 text-xs text-[#695B64]">
                <Link to="/how-it-works" className="text-[#C98A84] hover:text-[#B87A74] underline underline-offset-2">
                  Learn how book personalisation works →
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#FAF7F2] rounded-2xl p-5 border border-[#EBE3D9] space-y-2.5 text-xs text-[#2D222A]">
              <div className="font-editorial-serif text-sm font-bold text-[#2D222A] border-b border-[#EBE3D9] pb-2">
                Book Details &amp; Specifications
              </div>
              <div className="flex justify-between">
                <span className="text-[#695B64]">Trim Size:</span>
                <span className="font-medium">8 × 8 inch (203 × 203 mm)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#695B64]">Length:</span>
                <span className="font-medium">{story.page_count || 24} Full-Bleed Pages</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#695B64]">Target Age:</span>
                <span className="font-medium">{story.age_range || "Ages 3–8"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#695B64]">Formats:</span>
                <span className="font-medium">Instant PDF or Hardcover</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#695B64]">Price:</span>
                <span className="font-bold text-[#C98A84]">From ₹{story.price_digital || defaultPdfPrice}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ROADMAP DESIGN (1. Select Story -> 2. Upload Photo -> 3. Preview) */}
      <PersonalizationRoadmap
        currentStep={job ? 3 : 2}
      />

      {error && (
        <div className="p-4 rounded-xl bg-[#FAEEED] border border-[#C98A84]/40 text-[#2D222A] text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[#C98A84] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Wizard Form OR Active Progress / Book Viewer */}
      {!job ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Left Form: Personalization Wizard */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-9 rounded-3xl border border-[#EBE3D9] shadow-sm space-y-8">
            <form onSubmit={handleStartPersonalization} className="space-y-8">
              {/* 1. Child Details: Name, Age, Gender */}
              <div id="child-details-section" className="space-y-5">
                <div>
                  <label htmlFor="childName" className="block font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A]">
                    1. Child’s Details
                  </label>
                </div>

                {/* Child Name */}
                <div className="space-y-2">
                  <label htmlFor="childName" className="block text-sm font-semibold text-[#2D222A]">
                    Child’s First Name <span className="text-[#C98A84]">*</span>
                  </label>
                  <input
                    id="childName"
                    type="text"
                    required
                    placeholder="e.g. Mia, Lucas, Aria"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-[#D8CCC0] bg-[#FAF7F2] text-[#2D222A] text-base focus:outline-none focus:ring-2 focus:ring-[#C98A84] focus:border-[#C98A84] transition font-sans"
                  />
                </div>

                {/* Age & Gender Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Age Selector — Strictly bound to story's configured min/max age */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="childAge" className="block text-sm font-semibold text-[#2D222A]">
                        Child’s Age
                      </label>
                      <span className="inline-flex items-center text-xs font-extrabold text-[#9E362C] bg-[#FAEDE8] px-2.5 py-0.5 rounded-full border border-[#F0A9A0] shadow-2xs">
                        Ages {storyMinAge}–{storyMaxAge}
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        id="childAge"
                        value={childAge}
                        onChange={(e) => setChildAge(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-[#D8CCC0] bg-[#FAF7F2] text-[#2D222A] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C98A84] focus:border-[#C98A84] transition appearance-none cursor-pointer font-sans"
                      >
                        {allowedAgeOptions.map((age) => (
                          <option key={age} value={String(age)}>
                            {age} Years Old {age === 2 ? "(Toddler)" : (age === 5 ? "(Ideal for this tale)" : "")}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-[#695B64]">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>

                  {/* Gender Selector — Enforces Boy Only / Girl Only when configured */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-[#2D222A]">
                        Child’s Gender
                      </label>
                      {((story?.target_gender || "").toLowerCase().trim() === "boy" || (story?.target_gender || "").toLowerCase().trim() === "boys") && (
                        <span className="text-[10px] font-bold text-[#1D4ED8] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                          Boy Only Story
                        </span>
                      )}
                      {((story?.target_gender || "").toLowerCase().trim() === "girl" || (story?.target_gender || "").toLowerCase().trim() === "girls") && (
                        <span className="text-[10px] font-bold text-[#BE185D] bg-[#FDF2F8] px-2 py-0.5 rounded-full border border-[#FBCFE8]">
                          Girl Only Story
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={(story?.target_gender || "").toLowerCase().trim() === "boy" || (story?.target_gender || "").toLowerCase().trim() === "boys"}
                        onClick={() => {
                          const tg = (story?.target_gender || "").toLowerCase().trim();
                          if (tg !== "boy" && tg !== "boys") {
                            setChildGender("girl");
                          }
                        }}
                        title={((story?.target_gender || "").toLowerCase().trim() === "boy" || (story?.target_gender || "").toLowerCase().trim() === "boys") ? "This story is only available for boys" : undefined}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${((story?.target_gender || "").toLowerCase().trim() === "boy" || (story?.target_gender || "").toLowerCase().trim() === "boys")
                          ? "border-gray-200 bg-gray-100 text-gray-400 opacity-40 cursor-not-allowed"
                          : childGender === "girl"
                            ? "border-[#EC4899] bg-[#FDF2F8] text-[#BE185D] shadow-2xs ring-1 ring-[#EC4899] cursor-pointer"
                            : "border-[#D8CCC0] bg-[#FAF7F2] text-[#695B64] hover:bg-white cursor-pointer"
                          }`}
                      >
                        <span>👧</span>
                        <span>Girl</span>
                      </button>

                      <button
                        type="button"
                        disabled={(story?.target_gender || "").toLowerCase().trim() === "girl" || (story?.target_gender || "").toLowerCase().trim() === "girls"}
                        onClick={() => {
                          const tg = (story?.target_gender || "").toLowerCase().trim();
                          if (tg !== "girl" && tg !== "girls") {
                            setChildGender("boy");
                          }
                        }}
                        title={((story?.target_gender || "").toLowerCase().trim() === "girl" || (story?.target_gender || "").toLowerCase().trim() === "girls") ? "This story is only available for girls" : undefined}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${((story?.target_gender || "").toLowerCase().trim() === "girl" || (story?.target_gender || "").toLowerCase().trim() === "girls")
                          ? "border-gray-200 bg-gray-100 text-gray-400 opacity-40 cursor-not-allowed"
                          : childGender === "boy"
                            ? "border-[#3B82F6] bg-[#EFF6FF] text-[#1D4ED8] shadow-2xs ring-1 ring-[#3B82F6] cursor-pointer"
                            : "border-[#D8CCC0] bg-[#FAF7F2] text-[#695B64] hover:bg-white cursor-pointer"
                          }`}
                      >
                        <span>👦</span>
                        <span>Boy</span>
                      </button>
                    </div>

                    {((story?.target_gender || "").toLowerCase().trim() === "boy" || (story?.target_gender || "").toLowerCase().trim() === "boys") && (
                      <p className="text-[11px] text-blue-700/80 mt-0.5">
                        ✨ This story is exclusively crafted and illustrated for boys.
                      </p>
                    )}
                    {((story?.target_gender || "").toLowerCase().trim() === "girl" || (story?.target_gender || "").toLowerCase().trim() === "girls") && (
                      <p className="text-[11px] text-pink-700/80 mt-0.5">
                        ✨ This story is exclusively crafted and illustrated for girls.
                      </p>
                    )}
                  </div>
                </div>
                {/* Story Language Selection Option */}
                <div className="space-y-3 pt-3 border-t border-[#EBE3D9]/80">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-[#2D222A] flex items-center gap-1.5">
                      <Languages className="w-4 h-4 text-[#C98A84]" />
                      <span>Story Language</span>
                    </label>
                    <span className="inline-flex items-center text-xs font-bold text-[#873E38] bg-[#FAEEED] px-2.5 py-0.5 rounded-full border border-[#E2A6A0] shadow-2xs">
                      PDF &amp; Storybook Edition
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: "english", label: "English", native: "English" },
                      { id: "tamil", label: "Tamil", native: "தமிழ்" },
                      { id: "malayalam", label: "Malayalam", native: "മലയാളം" },
                      { id: "hindi", label: "Hindi", native: "हिंदी" },
                      { id: "marathi", label: "Marathi", native: "मराठी" },
                      { id: "telugu", label: "Telugu", native: "తెలుగు" },
                      { id: "kannada", label: "Kannada", native: "ಕನ್ನಡ" },
                    ].map((lang) => {
                      const isSelected = selectedLanguage === lang.id;
                      const isRegional = lang.id !== "english";
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setSelectedLanguage(lang.id)}
                          className={`group relative p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[76px] ${isSelected
                            ? "border-[#A6372D] bg-[#FAEEED]/85 text-[#9E4B43] shadow-xs ring-2 ring-[#C98A84]/40"
                            : "border-[#E8DEC8] bg-white hover:bg-[#FAF7F2] hover:border-[#C98A84]/70 hover:shadow-xs"
                            }`}
                        >
                          <div className="flex items-baseline justify-between gap-1">
                            <span className={`font-bold text-sm tracking-tight ${isSelected ? "text-[#9E4B43]" : "text-[#2D222A]"}`}>
                              {lang.native}
                            </span>
                            <span className={`text-[10px] font-semibold ${isSelected ? "text-[#9E4B43]" : "text-[#8C7A85]"}`}>
                              {lang.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] mt-1.5">
                            {isRegional ? (
                              <span
                                className={`inline-flex items-center text-[11px] font-extrabold px-2.5 py-0.5 rounded-full transition-all tracking-tight ${isSelected
                                  ? "bg-[#A6372D] text-white shadow-xs"
                                  : "bg-[#FAEDE8] text-[#9E362C] border border-[#F0A9A0] shadow-2xs group-hover:bg-[#F6DDD5] group-hover:border-[#C98A84] group-hover:text-[#872D24]"
                                  }`}
                              >
                                +₹{languageSurcharge}
                              </span>
                            ) : (
                              <span
                                className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors tracking-tight ${isSelected
                                  ? "bg-emerald-700 text-white shadow-xs"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-300 group-hover:bg-emerald-100 group-hover:border-emerald-400"
                                  }`}
                              >
                                Standard Rate
                              </span>
                            )}

                            {isSelected ? (
                              <span className="w-4 h-4 rounded-full bg-[#A6372D] text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border-2 border-[#D8CCC0] group-hover:border-[#A6372D] transition-colors shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedLanguage === "english" ? (
                    <div className="p-3 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC8] flex items-center justify-between text-xs text-[#695B64] animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>English edition is included at the standard book rate with no surcharge.</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ₹0 Extra
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FAEEED]/90 via-[#FAF7F2] to-amber-50/40 border border-[#C98A84]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#2D222A] animate-in fade-in duration-200 shadow-2xs">
                      <div className="flex items-start sm:items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-[#C98A84] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Languages className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#2D222A]">
                              {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)} Keepsake Edition
                            </span>
                            <span className="text-[11px] font-extrabold text-[#9E362C] bg-[#FAEDE8] px-2.5 py-0.5 rounded-full border border-[#F0A9A0] shadow-2xs">
                              +₹{languageSurcharge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#695B64] mt-0.5">
                            Formatted with authentic regional script typography, customized storytelling, and full-bleed high-res pages.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Photo Upload & Live Camera Options */}
              <div id="photo-upload-section" className="space-y-4 pt-4 border-t border-[#F0EAE1]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block font-editorial-serif text-xl sm:text-2xl font-bold text-[#2D222A]">
                      2. Child’s Reference Photograph
                    </label>
                    <p className="flex items-center gap-1.5 text-[11px] text-[#695B64] mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>100% Child Safe • Photos are encrypted &amp; never shared. <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#8B3DFF] underline hover:text-[#7828f7]">Privacy Charter</a></span>
                    </p>
                  </div>

                  {/* Mode Selector Tabs: Live Camera (1st with clean floating badge) vs Upload File */}
                  {!originalPreview && (
                    <div className="relative pt-3 shrink-0 self-start sm:self-auto">
                      {/* Floating Micro-Badge anchored directly above Live Camera */}
                      <span className="absolute top-0 left-3 z-10 px-2.5 py-0.5 rounded-full bg-[#9E362C] text-white text-[9px] font-extrabold uppercase tracking-wider shadow-xs flex items-center gap-1 pointer-events-none whitespace-nowrap">
                        <Sparkles className="w-2.5 h-2.5 text-amber-300 fill-amber-300" />
                        <span>Best Results</span>
                      </span>

                      <div className="inline-flex items-center gap-2 p-1.5 rounded-full bg-[#FAF7F2] border border-[#E8DEC8]">
                        {/* 1. Live Camera */}
                        <button
                          type="button"
                          onClick={() => {
                            setInputMode("camera");
                            startCamera();
                          }}
                          className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer text-xs font-bold whitespace-nowrap bg-white ${inputMode === "camera"
                            ? "text-[#873E38] border-2 border-[#873E38] shadow-xs ring-2 ring-[#873E38]/20"
                            : "text-[#2D222A] border border-[#E0D5C7] hover:border-[#873E38]/60 hover:text-[#873E38] shadow-2xs"
                            }`}
                        >
                          <Camera className={`w-3.5 h-3.5 ${inputMode === "camera" ? "text-[#873E38]" : "text-[#2D222A]"}`} />
                          <span>Live Camera</span>
                        </button>

                        {/* 2. Upload File */}
                        <button
                          type="button"
                          onClick={() => {
                            setInputMode("upload");
                            stopCamera();
                            fileInputRef.current?.click();
                          }}
                          className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 cursor-pointer text-xs font-bold whitespace-nowrap bg-white ${inputMode === "upload"
                            ? "text-[#873E38] border-2 border-[#873E38] shadow-xs ring-2 ring-[#873E38]/20"
                            : "text-[#2D222A] border border-[#E0D5C7] hover:border-[#873E38]/60 hover:text-[#873E38] shadow-2xs"
                            }`}
                        >
                          <Upload className={`w-3.5 h-3.5 ${inputMode === "upload" ? "text-[#873E38]" : "text-[#2D222A]"}`} />
                          <span>Upload File</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SUB-VIEW A: TIPS Guide with 4 Visual Circles & Upload Button (Matching Image 2) */}
                {!originalPreview && inputMode !== "camera" && (
                  <PhotoTipsGuide
                    onPhotoSelected={handlePhotoSelect}
                    onActivateCamera={() => {
                      setInputMode("camera");
                      startCamera();
                    }}
                    isProcessing={isValidatingPhoto || isProcessingBg}
                  />
                )}

                {/* SUB-VIEW B: Live Camera Viewfinder */}
                {!originalPreview && inputMode === "camera" && (
                  <div className="relative rounded-3xl overflow-hidden border-2 border-[#EBE3D9] bg-black/90 p-4 flex flex-col items-center justify-center">
                    {cameraError ? (
                      <div className="p-6 text-center space-y-3">
                        <AlertCircle className="w-8 h-8 text-[#C98A84] mx-auto" />
                        <p className="text-xs text-white max-w-sm leading-relaxed">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setInputMode("upload")}
                          className="px-4 py-2 rounded-full bg-white text-[#2D222A] text-xs font-semibold"
                        >
                          Switch to File Upload
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover mirror-mode"
                        />

                        {/* Oval Face Guide Overlay */}
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                          <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex items-center justify-center">
                            <span className="text-[10px] text-white/90 bg-black/50 px-2 py-0.5 rounded-full font-medium">
                              Position face here
                            </span>
                          </div>
                        </div>

                        {/* Camera Top Controls */}
                        <div className="absolute top-3 right-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={switchCamera}
                            title="Flip Camera"
                            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition"
                          >
                            <FlipHorizontal className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Capture Shutter Bar */}
                        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="px-6 py-3 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold flex items-center gap-2 shadow-lg transition transform hover:scale-105 cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Capture Photo</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-VIEW C: Uploaded Photo Validation Card (Shows Valid/Invalid like Ref Image 2) */}
                {originalPreview && (
                  <PhotoValidationStatus
                    originalPreview={originalPreview}
                    enhancedPreview={enhancedPreview}
                    isEnhancing={isEnhancing}
                    enhanceError={enhanceError}
                    selectedPortrait={selectedPortrait}
                    onSelectEnhanced={() => {
                      setSelectedPortrait("enhanced");
                      if (error && (error.includes("portrait") || error.includes("enhancement"))) setError(null);
                    }}
                    onSelectOriginal={() => {
                      setSelectedPortrait("original");
                      if (error && (error.includes("portrait") || error.includes("enhancement"))) setError(null);
                    }}
                    onRetryEnhance={() => {
                      if (rawPhotoFile) triggerEnhance(rawPhotoFile);
                    }}
                    validationReport={validationReport}
                    onResetPhoto={handleResetPhoto}
                    onChangePhotoClick={() => fileInputRef.current?.click()}
                    onCameraClick={() => {
                      setInputMode("camera");
                      startCamera();
                    }}
                  />
                )}

                {/* SUB-VIEW D: Character Outfit Style (Appears after photo is uploaded) */}
                {originalPreview && (
                  <div className="rounded-3xl border border-[#EBE3D9] bg-white p-5 sm:p-7 shadow-sm space-y-5">
                    {/* Section Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F0EAE1] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-[#FAEEED] border border-[#F2DCD8] flex items-center justify-center text-[#873E38] shrink-0 shadow-2xs">
                          <Sparkles className="w-5 h-5 text-[#873E38]" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-bold text-[#2D222A] tracking-tight">
                            Choose Character Outfit Style
                          </h3>
                          <p className="text-xs text-[#695B64] mt-0.5">
                            Decide how your child appears dressed inside the storybook:
                          </p>
                        </div>
                      </div>

                      <span className="self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full border shadow-2xs transition-colors flex items-center gap-1.5 bg-[#FAF7F2] text-[#873E38] border-[#E8DEC8]">
                        {outfitMode === "story" ? (
                          <>
                            <span>🎭</span>
                            <span>Story Character Costume Selected</span>
                          </>
                        ) : (
                          <>
                            <span>👕</span>
                            <span>Child's Own Clothes Selected</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Symmetrical High-Visibility Comparison Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-1">
                      {/* Option 1: Story Character Costume (Face Swap) */}
                      <button
                        type="button"
                        onClick={() => setOutfitMode("story")}
                        className={`group text-left p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden ${outfitMode === "story"
                            ? "border-[#873E38] bg-gradient-to-b from-[#FFFBFB] to-[#FAF7F2] shadow-md ring-2 ring-[#873E38]/20"
                            : "border-[#E8DEC8] bg-white hover:border-[#C98A84] hover:shadow-xs hover:bg-[#FAF7F2]/40"
                          }`}
                      >
                        <div className="space-y-3.5 w-full">
                          {/* Card Top Row: Badge & Radio Selection */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide transition-all ${outfitMode === "story"
                                  ? "bg-[#873E38] text-white shadow-2xs"
                                  : "bg-[#FAEEED] text-[#873E38] border border-[#F0A9A0]"
                                }`}
                            >
                              <span>🎭</span>
                              <span>Face Swap</span>
                            </span>

                            {/* Selected Badge vs Hollow Radio */}
                            {outfitMode === "story" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#873E38] bg-[#FAEEED] border border-[#873E38] px-2.5 py-0.5 rounded-full shadow-2xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Selected</span>
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border-2 border-[#D8CCC0] bg-white group-hover:border-[#873E38] transition shrink-0" />
                            )}
                          </div>

                          {/* Card Title & Headline */}
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-[#2D222A] group-hover:text-[#873E38] transition-colors">
                              Story Character Costume
                            </h4>
                            <p className="text-[11px] text-[#695B64] mt-0.5 font-medium">
                              Child is illustrated wearing the fairytale character's magical outfit &amp; gown
                            </p>
                          </div>

                          {/* Visual Preview Image with High-Contrast Floating Overlay Tag */}
                          <div className="relative aspect-[888/380] w-full rounded-2xl overflow-hidden border border-[#E8DEC8] bg-[#FAF7F2] shadow-inner">
                            <img
                              src="/examples/outfit_faceswap_unicorn.jpg?v=4"
                              alt="Face Swap Example: Child in Story Character Costume"
                              className="w-full h-full object-cover object-center transition duration-300 group-hover:scale-105"
                            />
                            {/* Visual Tag directly on image */}
                            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 text-white backdrop-blur-md text-[10px] font-bold shadow-md">
                                <span>✨</span>
                                <span>Wears Storybook Costume</span>
                              </span>
                            </div>
                          </div>

                          {/* Formula Comparison Pill */}
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#695B64] flex-wrap pt-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#2D222A] border border-[#E0D7CD]">
                              Child's Face
                            </span>
                            <span className="text-[#873E38] font-black">+</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#FAEEED] text-[#873E38] border border-[#F2DCD8]">
                              Storybook Costume
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-[#5E515B] leading-relaxed">
                            Your child's real facial likeness is seamlessly blended onto the story character’s fantasy wardrobe, armor, or dress.
                          </p>
                        </div>
                      </button>

                      {/* Option 2: Child's Own Clothes (Body Swap) */}
                      <button
                        type="button"
                        onClick={() => setOutfitMode("photo")}
                        className={`group text-left p-4 sm:p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden ${outfitMode === "photo"
                            ? "border-[#873E38] bg-gradient-to-b from-[#FFFBFB] to-[#FAF7F2] shadow-md ring-2 ring-[#873E38]/20"
                            : "border-[#E8DEC8] bg-white hover:border-[#C98A84] hover:shadow-xs hover:bg-[#FAF7F2]/40"
                          }`}
                      >
                        <div className="space-y-3.5 w-full">
                          {/* Card Top Row: Badge & Radio Selection */}
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide transition-all ${outfitMode === "photo"
                                  ? "bg-[#873E38] text-white shadow-2xs"
                                  : "bg-[#FAEEED] text-[#873E38] border border-[#F0A9A0]"
                                }`}
                            >
                              <Shirt className="w-3.5 h-3.5" />
                              <span>Body Swap</span>
                            </span>

                            {/* Selected Badge vs Hollow Radio */}
                            {outfitMode === "photo" ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#873E38] bg-[#FAEEED] border border-[#873E38] px-2.5 py-0.5 rounded-full shadow-2xs">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Selected</span>
                              </span>
                            ) : (
                              <span className="w-4 h-4 rounded-full border-2 border-[#D8CCC0] bg-white group-hover:border-[#873E38] transition shrink-0" />
                            )}
                          </div>

                          {/* Card Title & Headline */}
                          <div>
                            <h4 className="text-sm sm:text-base font-bold text-[#2D222A] group-hover:text-[#873E38] transition-colors">
                              Child's Own Clothes
                            </h4>
                            <p className="text-[11px] text-[#695B64] mt-0.5 font-medium">
                              Keeps 100% of your child's real clothes, colors &amp; style from your photo
                            </p>
                          </div>

                          {/* Visual Preview Image with High-Contrast Floating Overlay Tag */}
                          <div className="relative aspect-[888/380] w-full rounded-2xl overflow-hidden border border-[#E8DEC8] bg-[#FAF7F2] shadow-inner">
                            <img
                              src="/examples/outfit_bodyswap_unicorn.jpg?v=4"
                              alt="Body Swap Example: Child in Own Real Clothes"
                              className="w-full h-full object-cover object-center transition duration-300 group-hover:scale-105"
                            />
                            {/* Visual Tag directly on image */}
                            <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 text-white backdrop-blur-md text-[10px] font-bold shadow-md">
                                <span>📸</span>
                                <span>Keeps Real Everyday Clothes</span>
                              </span>
                            </div>
                          </div>

                          {/* Formula Comparison Pill */}
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#695B64] flex-wrap pt-0.5">
                            <span className="px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#2D222A] border border-[#E0D7CD]">
                              Child's Face
                            </span>
                            <span className="text-[#873E38] font-black">+</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#FAEEED] text-[#873E38] border border-[#F2DCD8]">
                              Real Photo Clothes
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-[#5E515B] leading-relaxed">
                            Your child's real clothes, t-shirt, dress, and colors are preserved in every illustration exactly as photographed.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Guardian Consent & Submit */}
              <div id="book-review-section" className="p-4 sm:p-5 rounded-2xl bg-[#F7F3EC] border border-[#EBE3D9] space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={guardianConsent}
                    onChange={(e) => setGuardianConsent(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-[#C98A84] text-[#C98A84] focus:ring-[#C98A84]"
                  />
                  <div className="text-xs text-[#4E424B] leading-relaxed">
                    <span className="font-semibold text-[#2D222A] block">Parent / Legal Guardian Consent</span>
                    I confirm that I am the parent or legal guardian of this child. I authorize the processing of this photograph solely for creating personalized illustrations in this storybook. I acknowledge that the photograph will be stored privately and never used for public training.
                  </div>
                </label>
              </div>

              {/* Error Callout above Submit */}
              {error && (
                <div className="p-4 rounded-2xl bg-[#FAEEED] border border-[#C98A84]/40 text-[#2D222A] text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[#C98A84] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-base font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Preparing Personalization...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Free Book Preview</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Card: Story Information */}
          <div className="lg:col-span-5 space-y-6">
            <div className="editorial-card p-6 bg-white space-y-5 sticky top-28">
              <div className="aspect-square rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#EBE3D9] shadow-xs">
                <img
                  src={story.cover_image_url}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#695B64]">
                  <span>Square 8×8 mm Trim</span>
                  <span className="text-[#8F9E8B] font-semibold">{story.page_count} Pages</span>
                </div>
                <h3 className="font-editorial-serif text-2xl font-bold text-[#2D222A]">
                  {story.title}
                </h3>
                <p className="text-xs text-[#695B64] leading-relaxed">
                  {story.description}
                </p>
              </div>

              <div className="pt-4 border-t border-[#EBE3D9] space-y-2 text-xs text-[#4E424B]">
                <div className="flex justify-between">
                  <span>Digital Illustrated Edition:</span>
                  <span className="font-semibold text-[#2D222A]">₹{story.price_digital ? Number(story.price_digital).toLocaleString("en-IN") : defaultPdfPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Heirloom Hardcover Print:</span>
                  <span className="font-semibold text-[#2D222A]">₹{story.price_print ? Number(story.price_print).toLocaleString("en-IN") : defaultHardcoverPrice.toLocaleString("en-IN")}</span>
                </div>
                {selectedLanguage !== "english" && (
                  <div className="flex justify-between text-purple-700 font-semibold pt-1 border-t border-dashed border-[#EBE3D9]">
                    <span className="flex items-center gap-1">
                      <Languages className="w-3.5 h-3.5 text-purple-600" />
                      <span>{selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)} Edition Surcharge:</span>
                    </span>
                    <span>+₹{languageSurcharge}</span>
                  </div>
                )}
              </div>

              {/* Personalization Summary Badge */}
              <div className="p-3 rounded-xl bg-[#FAF5FF] border border-[#E9D5FF] text-[11px] text-[#6B21A8] space-y-1">
                <div className="flex items-center justify-between">
                  <span>Story Language:</span>
                  <strong className="font-bold">
                    {selectedLanguage.toUpperCase()} {selectedLanguage !== "english" ? `(+₹${languageSurcharge})` : "(Standard Rate)"}
                  </strong>
                </div>
                {childName && (
                  <div className="flex items-center justify-between pt-1 border-t border-[#E9D5FF]/60">
                    <span>Child:</span>
                    <strong className="font-bold">{childName} ({childAge} yrs, {childGender === "girl" ? "Girl" : "Boy"})</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Progress & Completed Book Viewer */
        <div className="space-y-8">
          {/* Status Bar */}
          <div className="editorial-card p-6 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {(() => {
                const statusLower = job.status?.toLowerCase();
                const isJobCompleted = statusLower === "completed" || statusLower === "done";
                const isJobFailed = statusLower === "failed";
                return (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isJobCompleted
                    ? "bg-[#EEF4ED] text-[#8F9E8B]"
                    : isJobFailed
                      ? "bg-[#FEF2F2] text-[#EF4444]"
                      : "bg-[#FAEEED] text-[#C98A84] ring-4 ring-[#C98A84]/15 shadow-xs"
                    }`}>
                    {isJobCompleted ? (
                      <CheckCircle className="w-6 h-6 text-[#8F9E8B]" />
                    ) : isJobFailed ? (
                      <AlertCircle className="w-6 h-6 text-[#C98A84]" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-[#C98A84] animate-spin" style={{ animationDuration: "5s" }} />
                    )}
                  </div>
                );
              })()}
              <div>
                <div className="text-xs uppercase tracking-wider text-[#695B64] font-medium">
                  Personalization for {job.child_name}
                </div>
                <div className="font-editorial-serif text-2xl font-bold text-[#2D222A]">
                  {job.current_stage}
                </div>
              </div>
            </div>

            {/* Right Status Badges & CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleStartNewStory}
                className="px-3 py-1.5 rounded-full border border-[#EBE3D9] text-[#695B64] hover:text-[#2D222A] hover:bg-[#FAF7F2] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Create a new storybook for another child"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start Fresh</span>
              </button>

              <div className="text-right hidden sm:block">
                <span className="text-xs text-[#695B64] block">Progress</span>
                <span className="font-editorial-serif text-lg font-bold text-[#2D222A]">
                  {job.is_paid || job.is_purchased
                    ? `${job.completed_pages || assets.length} of ${job.total_pages || story?.page_count || assets.length} Pages`
                    : `${Math.min(job.completed_pages, assets.length || 3)} of ${Math.min(job.total_pages || 3, 3)} Pages`}
                </span>
              </div>

              {(job.status?.toLowerCase() === "completed" || job.status?.toLowerCase() === "done") && (
                <>
                  {!job.is_paid ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          triggerPdfDownload(
                            `/api/v1/personalization/${job.id}/pdf?lang=${selectedLanguage}`,
                            `${(job.child_name || "Child").replace(/\s+/g, "_")}_Preview_3Pages.pdf`,
                            "3-Page Preview Storybook PDF"
                          )
                        }
                        className="px-4 py-2 rounded-full border border-[#EBE3D9] hover:bg-[#FAF7F2] text-[#4E424B] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Download free 3-page preview watermarked PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-[#695B64]" />
                        <span>Preview PDF</span>
                      </button>

                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#C98A84] hover:from-[#7828f7] hover:to-[#B87A74] text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-[#8B3DFF]/20 hover:shadow-lg transition cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock Full Storybook</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>Unlocked</span>
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          triggerPdfDownload(
                            `/api/v1/personalization/${job.id}/pdf?mode=full&lang=${selectedLanguage}`,
                            `${(job.child_name || "Child").replace(/\s+/g, "_")}_${(story?.title || "Storybook").replace(/\s+/g, "_")}_Full_Storybook.pdf`,
                            `Full Illustrated Storybook PDF (${selectedLanguage.toUpperCase()})`
                          )
                        }
                        className="px-5 py-2.5 rounded-full bg-[#8B3DFF] hover:bg-[#7828f7] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Full PDF ({selectedLanguage.toUpperCase()})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          triggerPdfDownload(
                            `/api/v1/personalization/${job.id}/print-pdf?size=8x8&color=rgb&lang=${selectedLanguage}`,
                            `${(job.child_name || "Child").replace(/\s+/g, "_")}_${(story?.title || "Storybook").replace(/\s+/g, "_")}_Print_8x8.pdf`,
                            "Print-Ready 8×8 Keepsake PDF"
                          )
                        }
                        className="px-4 py-2 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                        title="Complete print-ready 8×8 RGB PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Print PDF (8×8)</span>
                      </button>

                      {(job.format_type === "print_hardcover" || job.format_type === "hardcover" || (job as any).is_hardcover) && (job.status === "completed" || (job.completed_pages || 0) >= 24) && (
                        <button
                          type="button"
                          onClick={() =>
                            triggerPdfDownload(
                              `/api/v1/personalization/${job.id}/cover-page?format=pdf`,
                              `${(job.child_name || "Child").replace(/\s+/g, "_")}_${(story?.title || "Storybook").replace(/\s+/g, "_")}_Cover_Page.pdf`,
                              "Personalized Hard Copy Cover Page PDF"
                            )
                          }
                          className="px-4 py-2 rounded-full border border-[#8B3DFF] text-[#8B3DFF] hover:bg-purple-50 text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
                          title="Download personalized Hard Copy Wrap Cover Page PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Cover Page PDF</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 3D Realistic Book Flip Viewer & Editorial Spread Viewer */}
          {assets.length > 0 ? (
            <div className="space-y-4">
              {/* Preview Mode Selector */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#695B64]">
                  Personalized Book Preview
                </span>
                <div className="inline-flex rounded-full p-1 bg-[#F5EEDB] border border-[#DDD6C0] text-xs">
                  <button
                    onClick={() => setViewerMode("flipbook")}
                    className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition cursor-pointer font-medium ${viewerMode === "flipbook"
                      ? "bg-[#C98A84] text-white shadow-xs"
                      : "text-[#695B64] hover:text-[#2D222A]"
                      }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>3D Realistic Flipbook</span>
                  </button>
                  <button
                    onClick={() => setViewerMode("spread")}
                    className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition cursor-pointer font-medium ${viewerMode === "spread"
                      ? "bg-[#C98A84] text-white shadow-xs"
                      : "text-[#695B64] hover:text-[#2D222A]"
                      }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>Editorial Spread</span>
                  </button>
                </div>
              </div>

              {viewerMode === "flipbook" ? (
                <RealisticBookFlipViewer
                  assets={assets}
                  currentPageIdx={currentPageIdx}
                  onPageChange={(idx) => setCurrentPageIdx(idx)}
                  childPhotoUrl={activeChildPhotoUrl}
                  childName={job.child_name || childName || "Your Child"}
                  storyTitle={story?.title || "Storybook"}
                  onRetryPage={handleRetryPage}
                  isRetrying={Boolean(retryingAssetId)}
                  selectedLanguage={selectedLanguage}
                  translatedTexts={translations}
                  isTranslating={isTranslating}
                  isPaid={Boolean(job.is_paid)}
                  onUnlockStorybook={() => setShowPaymentModal(true)}
                />
              ) : (
                <div className="editorial-card p-8 bg-white space-y-6">


                  <div className="flex items-center justify-between border-b border-[#EBE3D9] pb-4">
                    <div>
                      <h3 className="font-editorial-serif text-2xl font-bold text-[#2D222A]">
                        Interactive Book Preview
                      </h3>
                      <span className="text-xs text-[#695B64]">
                        Page {currentPageIdx + 1} of {assets.length} (Page #{currentAsset?.page_number})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPageIdx((prev) => Math.max(0, prev - 1))}
                        disabled={currentPageIdx === 0}
                        className="p-2 rounded-full border border-[#EBE3D9] hover:bg-[#FAF7F2] text-[#2D222A] disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentPageIdx((prev) => Math.min(assets.length - 1, prev + 1))}
                        disabled={currentPageIdx === assets.length - 1}
                        className="p-2 rounded-full border border-[#EBE3D9] hover:bg-[#FAF7F2] text-[#2D222A] disabled:opacity-30 cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Large Spread Viewer */}
                  {currentAsset && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                      {/* Left: Illustration */}
                      <div className="md:col-span-7">
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg border border-[#EBE3D9] bg-[#FAF7F2]">
                          <img
                            src={currentAsset.image_url}
                            alt={`Page ${currentAsset.page_number}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#FAEEED]/90 backdrop-blur-md text-[#C98A84] text-[10px] font-bold tracking-wider">
                            PERSONALIZED PREVIEW
                          </div>
                        </div>
                      </div>

                      {/* Right: Narrative text & Metadata */}
                      <div className="md:col-span-5 space-y-6">
                        <div className="p-6 rounded-2xl bg-[#F7F3EC] border border-[#EBE3D9] space-y-3">
                          <span className="text-[11px] uppercase tracking-wider text-[#C98A84] font-semibold">
                            Story Narrative ({selectedLanguage.toUpperCase()})
                          </span>
                          <p className="font-editorial-serif text-xl text-[#2D222A] leading-relaxed italic">
                            "{(() => {
                              if (translations[currentAsset.id]) return translations[currentAsset.id];
                              let text = currentAsset.story_text || currentAsset.prompt_used || "";
                              const cleanChild = (job?.child_name || childName || "Your Child").trim();
                              ["[Name]", "[name]", "{name}", "[child_name]", "{child_name}"].forEach((tag) => {
                                text = text.split(tag).join(cleanChild);
                              });
                              return text;
                            })()}"
                          </p>
                        </div>



                      </div>
                    </div>
                  )}

                  {/* Thumbnails strip */}
                  <div className="pt-6 border-t border-[#EBE3D9] flex gap-3 overflow-x-auto pb-2">
                    {assets.map((ast, idx) => (
                      <button
                        key={ast.id}
                        onClick={() => setCurrentPageIdx(idx)}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition cursor-pointer ${currentPageIdx === idx ? "border-[#C98A84] shadow-md scale-105" : "border-[#EBE3D9] opacity-70 hover:opacity-100"
                          }`}
                      >
                        <img src={ast.image_url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded">
                          #{ast.page_number}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paywall Lock Banner as specified in Step A */}
              {!job.is_paid ? (
                <div className="editorial-card p-6 sm:p-8 bg-gradient-to-br from-[#2D222A] via-[#382633] to-[#2D222A] text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 relative overflow-hidden">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#C98A84] text-[11px] font-bold tracking-wider uppercase border border-white/10">
                      <Lock className="w-3.5 h-3.5" />
                      <span>3-Page Free Preview Completed</span>
                    </div>
                    <h3 className="font-editorial-serif text-2xl sm:text-3xl font-bold text-[#FAF7F2]">
                      Unlock {job.child_name || "Your Child"}'s Full Adventure
                    </h3>
                    <p className="text-xs sm:text-sm text-[#EBE3D9] leading-relaxed">
                      You have viewed the first 3 preview pages of {job.child_name || "your child"}'s adventure! Unlock all 26+ pages and get your print-ready PDF.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#8B3DFF] to-[#C98A84] hover:from-[#7828f7] hover:to-[#B87A74] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#8B3DFF]/30 hover:shadow-xl transition cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Unlock Full Storybook</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="editorial-card p-6 sm:p-7 bg-[#ECFDF5] border border-[#A7F3D0] rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Full Storybook Unlocked</span>
                    </div>
                    <h4 className="font-editorial-serif text-xl font-bold text-[#065F46]">
                      All 26+ Pages & Print Files Ready for {job.child_name}
                    </h4>
                    <p className="text-xs text-emerald-800/80">
                      High-resolution deterministic PDF files are generated and ready for instant reading or printing.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() =>
                        triggerPdfDownload(
                          `/api/v1/personalization/${job.id}/pdf?mode=full&lang=${selectedLanguage}`,
                          `${(job.child_name || "Child").replace(/\s+/g, "_")}_${(story?.title || "Storybook").replace(/\s+/g, "_")}_Full_Storybook.pdf`,
                          `Full Illustrated Storybook PDF (${selectedLanguage.toUpperCase()})`
                        )
                      }
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#8B3DFF] hover:bg-[#7828f7] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Full PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        triggerPdfDownload(
                          `/api/v1/personalization/${job.id}/print-pdf?size=8x8&color=rgb&lang=${selectedLanguage}`,
                          `${(job.child_name || "Child").replace(/\s+/g, "_")}_${(story?.title || "Storybook").replace(/\s+/g, "_")}_Print_8x8.pdf`,
                          "Print-Ready 8×8 Keepsake PDF"
                        )
                      }
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Print PDF</span>
                    </button>
                    {(job.format_type === "print_hardcover" || job.format_type === "hardcover" || (job as any).is_hardcover) && (job.status === "completed" || (job.completed_pages || 0) >= 24) && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerPdfDownload(
                            `/api/v1/personalization/${job.id}/cover-page?format=pdf`,
                            `${(job.child_name || "Child").replace(/\s+/g, "_")}_${(story?.title || "Storybook").replace(/\s+/g, "_")}_Cover_Page.pdf`,
                            "Personalized Hard Copy Cover Page PDF"
                          )
                        }
                        className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-[#8B3DFF] text-[#8B3DFF] hover:bg-purple-50 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Cover Page PDF</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Interactive Enchanted Storybook Atelier Generation Stage */
            <StorybookMagicLoader
              job={job}
              storyTitle={story?.title || "The Girl and the Magical Unicorn"}
              childPhotoUrl={activeChildPhotoUrl}
              childName={job.child_name || childName || "Your Child"}
            />
          )}
        </div>
      )}

      {/* Product FAQ Accordion (Public product landing state only) */}
      {!job && (
        <FaqSection
          id="product-faq"
          title={`Frequently Asked Questions About ${story.title}`}
          subtitle="Everything you need to know about photo guidelines, page previews, formats, and delivery."
          items={PRODUCT_PAGE_FAQS}
          className="mt-12"
        />
      )}

      {/* Payment & Checkout Modal */}
      {job && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          job={job}
          story={story}
          selectedLanguage={selectedLanguage}
          onPaymentSuccess={() => {
            if (jobId) {
              api.getPersonalizationJob(jobId).then((updated) => setJob(updated));
            }
          }}
        />
      )}

      {/* PDF Download Loading Animation & Progress Modal */}
      {job && (
        <PdfDownloadModal
          isOpen={downloadModal.isOpen}
          onClose={() => setDownloadModal((prev) => ({ ...prev, isOpen: false }))}
          downloadUrl={downloadModal.url}
          filename={downloadModal.filename}
          childName={job.child_name}
          storyTitle={story?.title}
          formatTitle={downloadModal.formatTitle}
          language={selectedLanguage}
        />
      )}
    </div>
  );
}
