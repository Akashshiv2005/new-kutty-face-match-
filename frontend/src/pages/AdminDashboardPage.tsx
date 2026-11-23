import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Seo from "@/seo/Seo";
import {
  LayoutDashboard,
  Menu,
  ChevronLeft,
  Package,
  Sparkles,
  BookOpen,
  FileEdit,
  Settings,
  LogOut,
  RefreshCw,
  Plus,
  Search,
  CheckCircle,
  Save,
  Cpu,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Wand2,
  ChevronDown,
  Check,
  Upload,
  Eye,
  Layers,
  Type,
  Sliders,
  HelpCircle,
  AlertCircle,
  Download,
  Feather,
  Heart,
  MapPin,
  GraduationCap,
  MessageSquareHeart,
  Video,
  Pencil,
  CreditCard,
  Star,
  Languages,
  Globe,
  Truck,
  Megaphone,
  ArrowRight,
  Tag,
  Copy,
  Smile,
  Clock,
} from "lucide-react";
import { GiftBoxIcon, CornerLeavesLeft, CornerLeavesRight, renderFormattedNotice } from "@/components/Layout";

const SHIPPING_CARRIERS = [
  { id: "delhivery", name: "Delhivery", urlTpl: "https://www.delhivery.com/track/package/{tracking}" },
  { id: "bluedart", name: "Blue Dart", urlTpl: "https://www.bluedart.com/tracking?trackNumber={tracking}" },
  { id: "dtdc", name: "DTDC", urlTpl: "https://www.dtdc.in/tracking.asp" },
  { id: "indiapost", name: "India Post (Speed Post)", urlTpl: "https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx" },
  { id: "shadowfax", name: "Shadowfax", urlTpl: "https://tracker.shadowfax.in/track?order_id={tracking}" },
  { id: "xpressbees", name: "Xpressbees", urlTpl: "https://www.xpressbees.com/track?tracking_id={tracking}" },
  { id: "ekart", name: "Ekart Logistics", urlTpl: "https://ekartlogistics.com/shipmenttrack/{tracking}" },
  { id: "professional", name: "Professional Couriers", urlTpl: "https://www.tpcindia.com" },
  { id: "dhl", name: "DHL Express", urlTpl: "https://www.dhl.com/in-en/home/tracking/tracking-express.html?submit=1&tracking-id={tracking}" },
  { id: "fedex", name: "FedEx", urlTpl: "https://www.fedex.com/fedextrack/?trknbr={tracking}" },
  { id: "other", name: "Other Courier", urlTpl: "" },
];
import {
  api,
  authService,
  isLogoStory,
  UserProfile,
  AdminDashboardData,
  Order,
  PaymentTransaction,
  StoryTemplate,
  StoryPage,
  AISettings,
  PersonalizationJob,
  ChildStory,
  FeedbackItem,
  NoticeItem,
  KuttysStoryItem,
  ParentingRoutineStage,
} from "@/lib/api";
import { KidCartoonAvatar } from "./KuttysStoryPage";

type TabType = "dashboard" | "orders" | "payments" | "previews" | "stories" | "page_editor" | "settings" | "child_stories" | "feedback" | "kuttys_story" | "parenting_routine";

// Utility to convert hex color and opacity into rgba
function hexToRgba(hex: string, opacity: number = 0.85): string {
  if (!hex || hex === "transparent") return "transparent";
  if (hex.startsWith("rgba")) return hex;
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.substring(0, 2), 16) || 255;
  const g = parseInt(c.substring(2, 4), 16) || 255;
  const b = parseInt(c.substring(4, 6), 16) || 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}

function formatAdminTimestamp(dateVal?: string | Date | null, fallbackFormatted?: string): string {
  if (dateVal) {
    try {
      let str = typeof dateVal === "string" ? dateVal.trim() : dateVal.toISOString();
      if (!str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
        str = str + "Z";
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("en-US", {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    } catch {
      // fallback
    }
  }
  return fallbackFormatted || "Recently";
}

interface AdminTablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function AdminTablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: AdminTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize && currentPage === 1) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="px-5 py-3.5 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
      <div className="text-gray-500 font-medium text-[11px] sm:text-xs">
        Showing <span className="font-semibold text-gray-800">{totalItems > 0 ? startIdx : 0}</span> to{" "}
        <span className="font-semibold text-gray-800">{endIdx}</span> of{" "}
        <span className="font-semibold text-gray-800">{totalItems}</span> entries
      </div>
      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition text-xs cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === "number" ? (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer ${p === currentPage
                  ? "bg-[#C98A84] text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100 border border-transparent"
                  }`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="w-6 text-center text-gray-400">
                ...
              </span>
            )
          )}
        </div>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition text-xs cursor-pointer"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

interface CmsLanguage {
  id: string;
  label: string;
  native: string;
  code: string;
}

const CMS_SUPPORTED_LANGUAGES: CmsLanguage[] = [
  { id: "english", label: "English", native: "English", code: "en" },
  { id: "tamil", label: "Tamil", native: "தமிழ்", code: "ta" },
  { id: "malayalam", label: "Malayalam", native: "മലയാളം", code: "ml" },
  { id: "hindi", label: "Hindi", native: "हिंदी", code: "hi" },
  { id: "marathi", label: "Marathi", native: "मराठी", code: "mr" },
  { id: "telugu", label: "Telugu", native: "తెలుగు", code: "te" },
  { id: "kannada", label: "Kannada", native: "ಕನ್ನಡ", code: "kn" },
];

export default function AdminDashboardPage({ initialTab }: { initialTab?: TabType }) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getUser());

  // Initialize tab from prop or URL
  const getInitialTab = (): TabType => {
    if (initialTab) return initialTab;
    const path = window.location.pathname.toLowerCase();
    if (path.includes("/feedback")) return "feedback";
    if (path.includes("/payments")) return "payments";
    if (path.includes("/child_stories") || path.includes("/child-stories")) return "child_stories";
    if (path.includes("/stories")) return "stories";
    if (path.includes("/orders")) return "orders";
    if (path.includes("/previews")) return "previews";
    if (path.includes("/page_editor")) return "page_editor";
    if (path.includes("/settings")) return "settings";
    if (path.includes("/kuttys-story") || path.includes("/kuttys_story")) return "kuttys_story";
    if (path.includes("/parenting-routine") || path.includes("/parenting_routine")) return "parenting_routine";
    return "dashboard";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Pagination states
  const ITEMS_PER_PAGE = 10;
  const [previewPage, setPreviewPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [childStoryPage, setChildStoryPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Orders Management Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");

  const handleOrderSearchChange = (val: string) => {
    setOrderSearch(val);
    setOrderPage(1);
  };
  const handleOrderStatusChange = (val: string) => {
    setOrderStatusFilter(val);
    setOrderPage(1);
  };
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  // Shipping Modal state
  const [shippingModal, setShippingModal] = useState<{
    isOpen: boolean;
    order: Order | null;
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
  }>({
    isOpen: false,
    order: null,
    carrier: "Delhivery",
    trackingNumber: "",
    trackingUrl: "",
  });
  const [submittingShipping, setSubmittingShipping] = useState(false);

  // New Order Form state
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newAmount, setNewAmount] = useState("1299");
  const [newStatus, setNewStatus] = useState("Paid");
  const [newFormat, setNewFormat] = useState("print_hardcover");
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Payments & Transactions Data
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Stories & Page Editor Data
  const [stories, setStories] = useState<StoryTemplate[]>([]);
  const [storySearch, setStorySearch] = useState("");
  const [storyCategoryFilter, setStoryCategoryFilter] = useState("all");
  const [storyStatusFilter, setStoryStatusFilter] = useState("all");

  // Create a Book Modal state
  const [showNewBookModal, setShowNewBookModal] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookSlug, setNewBookSlug] = useState("");
  const [newBookSlugTouched, setNewBookSlugTouched] = useState(false);
  const [newBookCategory, setNewBookCategory] = useState("ADVENTURE");
  const [newBookMinAge, setNewBookMinAge] = useState(3);
  const [newBookMaxAge, setNewBookMaxAge] = useState(7);
  const [newBookPdfPrice, setNewBookPdfPrice] = useState(799);
  const [newBookPrintPrice, setNewBookPrintPrice] = useState(1399);
  const [newBookTotalPages, setNewBookTotalPages] = useState(28);
  const [newBookTagline, setNewBookTagline] = useState("");
  const [newBookCoverUrl, setNewBookCoverUrl] = useState("");
  const [newBookPdfFile, setNewBookPdfFile] = useState<File | null>(null);
  const [creatingBook, setCreatingBook] = useState(false);
  const [bookError, setBookError] = useState("");

  // Edit Age Range & Pricing Modal state
  const [showEditAgeModal, setShowEditAgeModal] = useState(false);
  const [storyToEdit, setStoryToEdit] = useState<StoryTemplate | null>(null);
  const [editMinAge, setEditMinAge] = useState(3);
  const [editMaxAge, setEditMaxAge] = useState(7);
  const [editPdfPrice, setEditPdfPrice] = useState(799);
  const [editPrintPrice, setEditPrintPrice] = useState(1399);
  const [editCategory, setEditCategory] = useState("ADVENTURE");
  const [editHighlight, setEditHighlight] = useState<"latest" | "best_seller" | "popular" | null>(null);
  const [editInHeroCarousel, setEditInHeroCarousel] = useState(false);
  const [savingAgeEdit, setSavingAgeEdit] = useState(false);

  const [selectedStory, setSelectedStory] = useState<StoryTemplate | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [pageEditText, setPageEditText] = useState("");
  // Multilingual Page Editor CMS States
  const [pageTranslations, setPageTranslations] = useState<Record<string, string>>({});
  const [selectedEditorLanguage, setSelectedEditorLanguage] = useState<string>("english");
  const [isTranslatingPage, setIsTranslatingPage] = useState<boolean>(false);
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [showAllLanguagesView, setShowAllLanguagesView] = useState<boolean>(false);

  const [pageEditScene, setPageEditScene] = useState("");
  const [pageEditPrompt, setPageEditPrompt] = useState("");
  const [savingPage, setSavingPage] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Page Editor (CMS) Extended States matching reference screenshots
  const [selectedGender, setSelectedGender] = useState<"boy" | "girl">("boy");
  const [targetGender, setTargetGender] = useState<"boy" | "girl" | "both">("both");
  const [bookMinAge, setBookMinAge] = useState<number>(2);
  const [bookMaxAge, setBookMaxAge] = useState<number>(13);
  const [ageSavedBadge, setAgeSavedBadge] = useState<boolean>(true);

  // Current page inspector fields
  const [pageNumberInput, setPageNumberInput] = useState<number>(1);
  const [pageStylePrompt, setPageStylePrompt] = useState<string>("children's storybook illustration, soft colours, consistent character, clean line art");
  const [facePoints, setFacePoints] = useState<[number, number][]>([]);
  const [personalizationRequired, setPersonalizationRequired] = useState<boolean>(true);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [autoTracing, setAutoTracing] = useState<boolean>(false);
  const [autoTracingAll, setAutoTracingAll] = useState<boolean>(false);
  const [textX, setTextX] = useState<number>(50.0);
  const [textY, setTextY] = useState<number>(89.5);
  const [fontSize, setFontSize] = useState<number>(15);
  const [fontColor, setFontColor] = useState<string>("#000000");
  const [fontFamily, setFontFamily] = useState<string>("Sans (DejaVu Bold)");
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [strokeColor, setStrokeColor] = useState<string>("#FFFFFF");
  const [strokeWidth, setStrokeWidth] = useState<number>(0);
  const [hasShadow, setHasShadow] = useState<boolean>(false);
  const [softLineBreak, setSoftLineBreak] = useState<boolean>(true);
  const [hasBackgroundBox, setHasBackgroundBox] = useState<boolean>(true);
  const [boxBgColor, setBoxBgColor] = useState<string>("#FAF4E6");
  const [boxBorderColor, setBoxBorderColor] = useState<string>("#E8DEC8");
  const [boxBorderWidth, setBoxBorderWidth] = useState<number>(1);
  const [boxBorderRadius, setBoxBorderRadius] = useState<number>(16);
  const [boxBgOpacity, setBoxBgOpacity] = useState<number>(0.90);
  const [boxLayout, setBoxLayout] = useState<"banner" | "custom">("banner");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");
  const [warpStyle, setWarpStyle] = useState<string>("None");
  const [uploadingBaseArt, setUploadingBaseArt] = useState<boolean>(false);
  const [editorNotice, setEditorNotice] = useState<string>("");

  const baseArtFileRef = useRef<HTMLInputElement | null>(null);
  const coverPageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingCoverPage, setUploadingCoverPage] = useState<boolean>(false);
  const [isViewingCoverSpread, setIsViewingCoverSpread] = useState<boolean>(false);
  const [autoTracingCover, setAutoTracingCover] = useState<boolean>(false);
  const canvasSvgRef = useRef<SVGSVGElement | null>(null);

  // Previews / Jobs Data
  const [jobs, setJobs] = useState<PersonalizationJob[]>([]);
  const [previewFilter, setPreviewFilter] = useState<"all" | "purchased">("all");
  const [showTestRenderModal, setShowTestRenderModal] = useState(false);
  const [testRenderStoryId, setTestRenderStoryId] = useState("");
  const [testRenderChildName, setTestRenderChildName] = useState("");
  const [testRenderPhotoFile, setTestRenderPhotoFile] = useState<File | null>(null);
  const [submittingTestRender, setSubmittingTestRender] = useState(false);
  const [selectedJobForPhotos, setSelectedJobForPhotos] = useState<PersonalizationJob | null>(null);
  const [generatingFullJob, setGeneratingFullJob] = useState<PersonalizationJob | null>(null);

  // Provider settings
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [aiProvider, setAiProvider] = useState("huggingface");
  const [aiModel, setAiModel] = useState("stabilityai/stable-diffusion-xl-base-1.0");
  const [previewLimit, setPreviewLimit] = useState(5);
  const [budgetCap, setBudgetCap] = useState(2.5);
  const [savingAi, setSavingAi] = useState(false);

  // Announcement bar settings
  const [announcementActive, setAnnouncementActive] = useState(true);
  const [announcementBadge, setAnnouncementBadge] = useState("WELCOME OFFER");
  const [announcementText, setAnnouncementText] = useState("Get 20% off your child's first personalized storybook with code WELCOME20");
  const [announcementCoupon, setAnnouncementCoupon] = useState("WELCOME20");
  const [announcementLinkLabel, setAnnouncementLinkLabel] = useState("Claim Offer");
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState("/storybooks");
  const [announcementNotices, setAnnouncementNotices] = useState<NoticeItem[]>([]);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [announcementSavedToast, setAnnouncementSavedToast] = useState(false);
  const [adminPreviewIdx, setAdminPreviewIdx] = useState(0);

  const adminPreviewList = useMemo(() => {
    const list: NoticeItem[] = [
      {
        badge: announcementBadge,
        text: announcementText,
        coupon_code: announcementCoupon,
        link_label: announcementLinkLabel,
        link_url: announcementLinkUrl,
      },
    ];
    (announcementNotices || []).forEach((n) => {
      if (n.text && n.text.trim()) list.push(n);
    });
    return list;
  }, [announcementBadge, announcementText, announcementCoupon, announcementLinkLabel, announcementLinkUrl, announcementNotices]);

  useEffect(() => {
    if (adminPreviewList.length <= 1) return;
    const t = setInterval(() => {
      setAdminPreviewIdx((prev) => (prev + 1) % adminPreviewList.length);
    }, 4500);
    return () => clearInterval(t);
  }, [adminPreviewList.length]);

  useEffect(() => {
    if (adminPreviewIdx >= adminPreviewList.length) {
      setAdminPreviewIdx(0);
    }
  }, [adminPreviewList.length, adminPreviewIdx]);

  const currentAdminPreview = adminPreviewList[adminPreviewIdx] || adminPreviewList[0];

  // Payment, Surcharge & Gift Wrap Settings (Offers & Banner tab)
  const [settingDefaultPdfPrice, setSettingDefaultPdfPrice] = useState<number>(799);
  const [settingDefaultHardcoverPrice, setSettingDefaultHardcoverPrice] = useState<number>(1399);
  const [settingLanguageSurcharge, setSettingLanguageSurcharge] = useState<number>(99);
  const [settingGiftWrapFee, setSettingGiftWrapFee] = useState<number>(20);
  const [settingGiftWrapEnabled, setSettingGiftWrapEnabled] = useState<boolean>(true);

  // Children's Written Stories Data
  const [adminChildStories, setAdminChildStories] = useState<ChildStory[]>([]);
  const [childStoryFilter, setChildStoryFilter] = useState("all");
  const [childStorySearch, setChildStorySearch] = useState("");
  const [selectedAdminChildStory, setSelectedAdminChildStory] = useState<ChildStory | null>(null);
  const [loadingChildStories, setLoadingChildStories] = useState(false);

  const fetchAdminChildStories = async (statusOverride?: string) => {
    setLoadingChildStories(true);
    try {
      const st = statusOverride !== undefined ? statusOverride : childStoryFilter;
      const data = await api.getAllChildStoriesAdmin(st);
      setAdminChildStories(data);
    } catch (err) {
      console.error("Error loading child stories:", err);
    } finally {
      setLoadingChildStories(false);
    }
  };

  const handleUpdateChildStoryStatus = async (id: string, newStatus: "approved" | "pending" | "featured" | "rejected") => {
    try {
      await api.updateChildStoryAdmin(id, { status: newStatus });
      fetchAdminChildStories();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteChildStory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this story submission?")) return;
    try {
      await api.deleteChildStoryAdmin(id);
      fetchAdminChildStories();
      if (selectedAdminChildStory?.id === id) {
        setSelectedAdminChildStory(null);
      }
    } catch (err: any) {
      alert("Failed to delete story: " + err.message);
    }
  };

  // Customer Feedback Management Data
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);
  const [viewingMedia, setViewingMedia] = useState<{ url: string; type?: string; author: string } | null>(null);
  const [editFeedbackForm, setEditFeedbackForm] = useState({ name: "", place: "", rating: 5, review_text: "" });
  const [savingFeedbackEdit, setSavingFeedbackEdit] = useState(false);

  const fetchAdminFeedbacks = async (statusOverride?: "all" | "pending" | "approved" | "rejected") => {
    setLoadingFeedbacks(true);
    try {
      const st = statusOverride !== undefined ? statusOverride : feedbackFilter;
      const data = await api.getAdminFeedbacks(st === "all" ? undefined : st);
      setFeedbacks(data);
    } catch (err: any) {
      console.error("Error loading feedbacks:", err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const syncFeedbackUpdate = () => {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("kutty_feedback_sync");
        channel.postMessage({ type: "FEEDBACK_UPDATED", timestamp: Date.now() });
        channel.close();
      }
      localStorage.setItem("kuttystory_feedback_updated", Date.now().toString());
    } catch {
      // ignore
    }
  };

  const handleTogglePublish = async (fb: FeedbackItem) => {
    const isCurrentlyApproved = fb.status === "approved";
    const targetStatus = isCurrentlyApproved ? "pending" : "approved";
    try {
      await api.updateFeedbackStatus(fb.id, targetStatus);
      await fetchAdminFeedbacks();
      syncFeedbackUpdate();
      const message =
        targetStatus === "approved"
          ? `Published: Review by ${fb.name} is now live in the Foot Steps "Heartfelt Memories" section.`
          : `Unpublished: Review by ${fb.name} has been unpublished from the Foot Steps page.`;
      setFeedbackNotice(message);
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to update publication status: " + (err.message || err));
    }
  };

  const handleUpdateFeedbackStatus = async (id: string, newStatus: "approved" | "pending" | "rejected", authorName?: string) => {
    try {
      await api.updateFeedbackStatus(id, newStatus);
      await fetchAdminFeedbacks();
      syncFeedbackUpdate();
      const actionLabel =
        newStatus === "approved"
          ? "approved & published to Foot Steps"
          : newStatus === "rejected"
            ? "marked as Rejected"
            : "set to Pending";
      setFeedbackNotice(`Review${authorName ? ` by ${authorName}` : ""} has been ${actionLabel}.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to update feedback status: " + (err.message || err));
    }
  };

  const handleDeleteFeedback = async (id: string, authorName?: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete the feedback submission${authorName ? ` by ${authorName}` : ""
        }? This destructive action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.deleteFeedback(id);
      await fetchAdminFeedbacks();
      syncFeedbackUpdate();
      setFeedbackNotice(`Review by ${authorName || "customer"} permanently deleted.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to delete feedback: " + (err.message || err));
    }
  };

  const startEditFeedback = (fb: FeedbackItem) => {
    setEditingFeedback(fb);
    setEditFeedbackForm({
      name: fb.name,
      place: fb.place,
      rating: fb.rating,
      review_text: fb.review_text || "",
    });
  };

  const handleSaveFeedbackEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeedback) return;
    if (!editFeedbackForm.name.trim() || !editFeedbackForm.place.trim()) {
      alert("Please fill in author name and place.");
      return;
    }
    setSavingFeedbackEdit(true);
    try {
      await api.editFeedback(editingFeedback.id, {
        name: editFeedbackForm.name.trim(),
        place: editFeedbackForm.place.trim(),
        rating: editFeedbackForm.rating,
        review_text: editFeedbackForm.review_text.trim(),
      });
      setEditingFeedback(null);
      await fetchAdminFeedbacks();
      syncFeedbackUpdate();
      setFeedbackNotice(`Updated review details for ${editFeedbackForm.name.trim()}.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      alert("Failed to update feedback: " + (err.message || err));
    } finally {
      setSavingFeedbackEdit(false);
    }
  };

  // Kutty's Story Management State & Handlers
  const [adminKuttysStories, setAdminKuttysStories] = useState<KuttysStoryItem[]>([]);
  const [loadingKuttysStories, setLoadingKuttysStories] = useState(false);
  const [kuttysStoryModalOpen, setKuttysStoryModalOpen] = useState(false);
  const [editingKuttysStory, setEditingKuttysStory] = useState<Partial<KuttysStoryItem> | null>(null);
  const [savingKuttysStory, setSavingKuttysStory] = useState(false);
  const [kuttysStoryFilter, setKuttysStoryFilter] = useState<string>("all");
  const [kuttysStorySearch, setKuttysStorySearch] = useState<string>("");

  const fetchAdminKuttysStories = async () => {
    setLoadingKuttysStories(true);
    try {
      const data = await api.getAdminKuttysStories();
      setAdminKuttysStories(data || []);
    } catch (err) {
      console.error("Failed to load Kutty's stories:", err);
    } finally {
      setLoadingKuttysStories(false);
    }
  };

  const handleOpenAddKuttysStory = () => {
    setEditingKuttysStory({
      child_name: "",
      child_age: "5 yrs",
      child_title: "Chief Adventurer 🌟",
      city: "",
      storybook_title: "Dinosaur",
      storybook_slug: "dinosaur",
      kid_quote: "",
      parent_note: "",
      avatar_preset: "cartoon_dino_boy",
      avatar_url: "",
      stars: 5,
      rating_label: "1,000,000 / 10 ⭐",
      badge: "✨ Little Hero",
      accent_color: "#C98A84",
      is_active: true,
      display_order: adminKuttysStories.length + 1,
      likes_count: 50,
    });
    setKuttysStoryModalOpen(true);
  };

  const handleOpenEditKuttysStory = (story: KuttysStoryItem) => {
    setEditingKuttysStory({ ...story });
    setKuttysStoryModalOpen(true);
  };

  const handleSaveKuttysStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKuttysStory || !editingKuttysStory.child_name?.trim() || !editingKuttysStory.kid_quote?.trim()) {
      alert("Please provide child name and kid feedback quote.");
      return;
    }
    setSavingKuttysStory(true);
    try {
      if (editingKuttysStory.id) {
        await api.updateKuttysStory(editingKuttysStory.id, editingKuttysStory);
      } else {
        await api.createKuttysStory(editingKuttysStory);
      }
      await fetchAdminKuttysStories();
      setKuttysStoryModalOpen(false);
      setEditingKuttysStory(null);
    } catch (err: any) {
      console.error("Failed to save Kutty's story:", err);
      alert("Failed to save story: " + (err.message || err));
    } finally {
      setSavingKuttysStory(false);
    }
  };

  const handleDeleteKuttysStory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete Kutty's Story for "${name}"?`)) return;
    try {
      await api.deleteKuttysStory(id);
      setAdminKuttysStories((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      alert("Failed to delete story: " + (err.message || err));
    }
  };

  const handleToggleKuttysStoryActive = async (story: KuttysStoryItem) => {
    try {
      const updated = await api.updateKuttysStory(story.id, { is_active: !story.is_active });
      setAdminKuttysStories((prev) => prev.map((s) => (s.id === story.id ? updated : s)));
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || err));
    }
  };

  const handleResetKuttysStoryDefaults = async () => {
    if (!confirm("Restore default preset Kutty's stories? This will reset all current entries to the default collection.")) return;
    try {
      setLoadingKuttysStories(true);
      const res = await api.resetKuttysStoriesDefaults();
      setAdminKuttysStories(res.stories || []);
    } catch (err: any) {
      alert("Failed to reset defaults: " + (err.message || err));
    } finally {
      setLoadingKuttysStories(false);
    }
  };

  // 24-Hour Parenting Routine State & Handlers
  const [adminRoutineStages, setAdminRoutineStages] = useState<ParentingRoutineStage[]>([]);
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [editingRoutineStage, setEditingRoutineStage] = useState<ParentingRoutineStage | null>(null);

  const fetchAdminParentingRoutine = async () => {
    setLoadingRoutine(true);
    try {
      const data = await api.getParentingRoutine();
      setAdminRoutineStages(data || []);
    } catch (err) {
      console.error("Failed to load parenting routine:", err);
    } finally {
      setLoadingRoutine(false);
    }
  };

  const handleSaveRoutineStage = async (stage: ParentingRoutineStage) => {
    setSavingRoutine(true);
    try {
      const updated = adminRoutineStages.map((s) => (s.id === stage.id ? stage : s));
      await api.updateParentingRoutine(updated);
      setAdminRoutineStages(updated);
      setEditingRoutineStage(null);
    } catch (err: any) {
      alert("Failed to save routine stage: " + (err.message || err));
    } finally {
      setSavingRoutine(false);
    }
  };

  const handleResetRoutineDefaults = async () => {
    if (!confirm("Are you sure you want to reset the 24-hour routine to original defaults?")) return;
    setLoadingRoutine(true);
    try {
      await api.resetParentingRoutine();
      const data = await api.getParentingRoutine();
      setAdminRoutineStages(data || []);
    } catch (err: any) {
      alert("Failed to reset routine defaults: " + (err.message || err));
    } finally {
      setLoadingRoutine(false);
    }
  };

  useEffect(() => {
    // Check whether an existing session actually expired versus user simply not being logged in yet
    const wasExpired = authService.isSessionExpired();
    const user = authService.getUser();
    if (!user) {
      if (wasExpired) {
        navigate("/admin_login?reason=session_expired");
      } else {
        navigate("/admin_login");
      }
      return;
    }
    setCurrentUser(user);
    loadAllData();

    // Track user interaction to maintain active session
    const handleActivity = () => {
      authService.recordActivity();
    };

    window.addEventListener("mousemove", handleActivity, { passive: true });
    window.addEventListener("keydown", handleActivity, { passive: true });
    window.addEventListener("click", handleActivity, { passive: true });
    window.addEventListener("scroll", handleActivity, { passive: true });

    // Periodic check every 15 seconds to auto-logout if session expires while idle
    const timeoutCheckTimer = setInterval(() => {
      if (!authService.isAuthenticated()) {
        navigate("/admin_login?reason=session_expired");
      }
    }, 15000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      clearInterval(timeoutCheckTimer);
    };
  }, [navigate]);

  // Refs to track active generation state without dependency churn
  const generatingFullJobRef = useRef<PersonalizationJob | null>(generatingFullJob);
  generatingFullJobRef.current = generatingFullJob;

  const selectedJobForPhotosRef = useRef<PersonalizationJob | null>(selectedJobForPhotos);
  selectedJobForPhotosRef.current = selectedJobForPhotos;

  // Polling for active background HD rendering jobs - sequential without request flooding
  useEffect(() => {
    // Only poll if user is actively generating a full job OR has a recently active rendering job (<10 mins old)
    const hasActiveRendering = Boolean(generatingFullJob) || jobs.some(j => {
      const isRendering = j.status?.toLowerCase().includes("rendering") || j.status === "in_progress";
      if (!isRendering) return false;
      const jobTime = j.updated_at ? new Date(j.updated_at).getTime() : (j.created_at ? new Date(j.created_at).getTime() : 0);
      return Date.now() - jobTime < 10 * 60 * 1000;
    });

    if (!hasActiveRendering) return;

    let isMounted = true;
    let isFetching = false;
    let timerId: any = null;

    const poll = async () => {
      if (!isMounted || isFetching) return;
      isFetching = true;

      try {
        const updatedJobs = await api.getJobs();
        if (!isMounted) return;

        setJobs(updatedJobs);

        const activeGen = generatingFullJobRef.current;
        if (activeGen) {
          const match = updatedJobs.find(j => j.id === activeGen.id);
          if (match) {
            setGeneratingFullJob(match);
            if (match.completed_pages >= match.total_pages && (match.status === "completed" || !match.status.includes("Rendering"))) {
              const adminTok = encodeURIComponent(authService.getToken() || "");
              const rawUrl = match.print_pdf_url
                ? (match.print_pdf_url.includes("token=") ? match.print_pdf_url : `${match.print_pdf_url}&token=${adminTok}`)
                : `/api/v1/personalization/${match.id}/print-pdf?size=8x8&color=rgb&token=${adminTok}`;
              const url = api.resolveUrl(rawUrl);
              window.open(url, "_blank");
              setTimeout(() => {
                if (isMounted) setGeneratingFullJob(null);
              }, 2500);
            }
          }
        }

        const activeModal = selectedJobForPhotosRef.current;
        if (activeModal) {
          const matchModal = updatedJobs.find(j => j.id === activeModal.id);
          if (matchModal) {
            setSelectedJobForPhotos(matchModal);
          }
        }

        // Check if any job is still actively rendering
        const stillRendering = Boolean(generatingFullJobRef.current) || updatedJobs.some(j => {
          const isRendering = j.status?.toLowerCase().includes("rendering") || j.status === "in_progress";
          if (!isRendering) return false;
          const jobTime = j.updated_at ? new Date(j.updated_at).getTime() : (j.created_at ? new Date(j.created_at).getTime() : 0);
          return Date.now() - jobTime < 10 * 60 * 1000;
        });

        if (isMounted && stillRendering) {
          timerId = setTimeout(poll, 4000);
        }
      } catch (err) {
        console.error("Polling error:", err);
        if (isMounted) {
          timerId = setTimeout(poll, 6000);
        }
      } finally {
        isFetching = false;
      }
    };

    timerId = setTimeout(poll, 4000);

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [Boolean(generatingFullJob)]);

  const fetchPaymentTransactions = async () => {
    setLoadingPayments(true);
    try {
      const data = await api.getPaymentTransactions();
      setPaymentTransactions(data || []);
    } catch (err) {
      console.error("Error loading payment transactions:", err);
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [dash, storiesData, aiData, jobsData, ordersList, childStoriesData, feedbacksData, annData, kuttysStoriesData] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getAdminStories().catch(() => []),
        api.getAISettings().catch(() => null),
        api.getJobs().catch(() => []),
        api.getOrders().catch(() => []),
        api.getAllChildStoriesAdmin().catch(() => []),
        api.getAdminFeedbacks().catch(() => []),
        api.getAnnouncement().catch(() => null),
        api.getAdminKuttysStories().catch(() => []),
      ]);

      if (dash) setDashboardData(dash);
      if (storiesData) {
        setStories(storiesData);
        if (storiesData.length > 0) {
          const firstStory = storiesData[0];
          setSelectedStory(firstStory);
          if (firstStory.pages?.length > 0) {
            syncPageForm(firstStory.pages[0]);
          }
        }
      }
      if (aiData) {
        setAiSettings(aiData);
        setAiProvider(aiData.active_image_provider);
        setAiModel(aiData.active_model);
        setPreviewLimit(aiData.preview_page_limit);
        setBudgetCap(aiData.per_book_budget);
      }
      if (annData) {
        setAnnouncementActive(Boolean(annData.is_active));
        if (annData.badge) setAnnouncementBadge(annData.badge);
        if (annData.text) setAnnouncementText(annData.text);
        if (annData.coupon_code) setAnnouncementCoupon(annData.coupon_code);
        if (annData.link_label) setAnnouncementLinkLabel(annData.link_label);
        if (annData.link_url) setAnnouncementLinkUrl(annData.link_url);
        if (annData.notices && Array.isArray(annData.notices)) {
          setAnnouncementNotices(annData.notices);
        }
        if (annData.default_pdf_price !== undefined && annData.default_pdf_price !== null) {
          setSettingDefaultPdfPrice(Number(annData.default_pdf_price));
        }
        if (annData.default_hardcover_price !== undefined && annData.default_hardcover_price !== null) {
          setSettingDefaultHardcoverPrice(Number(annData.default_hardcover_price));
        }
        if (annData.regional_language_surcharge !== undefined && annData.regional_language_surcharge !== null) {
          setSettingLanguageSurcharge(Number(annData.regional_language_surcharge));
        }
        if (annData.gift_wrap_fee !== undefined && annData.gift_wrap_fee !== null) {
          setSettingGiftWrapFee(Number(annData.gift_wrap_fee));
        }
        if (annData.gift_wrap_enabled !== undefined && annData.gift_wrap_enabled !== null) {
          setSettingGiftWrapEnabled(Boolean(annData.gift_wrap_enabled));
        }
      }
      if (jobsData) setJobs(jobsData);
      if (ordersList) setOrders(ordersList);
      if (childStoriesData) setAdminChildStories(childStoriesData);
      if (feedbacksData) setFeedbacks(feedbacksData);
      if (kuttysStoriesData) setAdminKuttysStories(kuttysStoriesData);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const dash = await api.getDashboard();
      setDashboardData(dash);
      const ordersList = await api.getOrders();
      setOrders(ordersList);
      const txns = await api.getPaymentTransactions();
      setPaymentTransactions(txns);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const getCssFontFamily = (font: string) => {
    if (font.includes("Serif") || font.includes("Merriweather")) return "'Merriweather', Georgia, serif";
    if (font.includes("Playful") || font.includes("Fredoka")) return "'Fredoka', cursive, sans-serif";
    if (font.includes("Handwritten") || font.includes("Caveat")) return "'Caveat', cursive, sans-serif";
    if (font.includes("Comic") || font.includes("Balsamiq")) return "'Balsamiq Sans', cursive, sans-serif";
    return "'Plus Jakarta Sans', 'Inter', 'DejaVu Sans', sans-serif";
  };

  const formatStoryText = (text: string, childName: string, softBreak: boolean) => {
    if (!text) return "";
    let res = text.replace(/\{\{name\}\}/gi, childName).replace(/\{child_name\}/gi, childName).replace(/\{name\}/gi, childName);
    if (softBreak) {
      res = res.replace(/([.!?])\s+/g, "$1\n");
    }
    return res;
  };

  const syncPageForm = (page: StoryPage) => {
    setPageEditText(page.story_text || "");
    if (page.translations) {
      try {
        const trans = typeof page.translations === "string" ? JSON.parse(page.translations) : page.translations;
        setPageTranslations(typeof trans === "object" && trans !== null ? trans : {});
      } catch {
        setPageTranslations({});
      }
    } else {
      setPageTranslations({});
    }
    setPageEditScene(page.scene_description || "");
    setPageEditPrompt(page.prompt_template || "");
    setPageStylePrompt(page.character_guidance || "children's storybook illustration, soft colours, consistent character, clean line art");
    setPageNumberInput(page.page_number || 1);
    setTextX(page.text_x !== undefined && page.text_x !== null ? page.text_x : 50.0);
    setTextY(page.text_y !== undefined && page.text_y !== null ? page.text_y : 89.5);
    setFontSize(page.font_size || 15);
    setFontFamily(page.font_family || "Sans (DejaVu Bold)");
    setFontColor(page.font_color || "#000000");
    setLetterSpacing(page.letter_spacing || 0);
    setStrokeColor(page.stroke_color || "#FFFFFF");
    setStrokeWidth(page.stroke_width !== undefined && page.stroke_width !== null ? page.stroke_width : 0);
    setHasShadow(page.has_shadow !== undefined && page.has_shadow !== null ? page.has_shadow : false);
    setSoftLineBreak(page.soft_line_break !== undefined ? page.soft_line_break : true);
    setHasBackgroundBox(page.has_background_box !== undefined && page.has_background_box !== null ? page.has_background_box : true);
    setBoxBgColor(page.box_bg_color || "#FAF4E6");
    setBoxBorderColor(page.box_border_color || "#E8DEC8");
    setBoxBorderWidth(page.box_border_width !== undefined && page.box_border_width !== null ? page.box_border_width : 1);
    setTextAlign((page.text_align as "left" | "center" | "right") || "center");
    setBoxLayout((page.box_layout as "banner" | "custom") || "banner");
    setBoxBorderRadius(page.box_border_radius !== undefined && page.box_border_radius !== null ? page.box_border_radius : 16);
    setBoxBgOpacity(page.box_bg_opacity !== undefined && page.box_bg_opacity !== null ? page.box_bg_opacity : 0.90);
    setWarpStyle(page.warp_style || "None");
    setSelectedGender((page.gender_variant as "boy" | "girl") || "boy");

    if (page.face_outline_points) {
      try {
        const pts = typeof page.face_outline_points === "string" ? JSON.parse(page.face_outline_points) : page.face_outline_points;
        if (Array.isArray(pts) && pts.length > 0) {
          setFacePoints(pts);
          setPersonalizationRequired(page.personalization_required !== undefined && page.personalization_required !== null ? Boolean(page.personalization_required) : true);
        } else {
          setFacePoints([]);
          setPersonalizationRequired(false);
        }
      } catch {
        setFacePoints([]);
        setPersonalizationRequired(false);
      }
    } else {
      setFacePoints([]);
      setPersonalizationRequired(false);
    }
    setSaveSuccess(false);
  };

  useEffect(() => {
    if (selectedStory) {
      let minA = selectedStory.min_age;
      let maxA = selectedStory.max_age;
      if (selectedStory.age_range) {
        const match = selectedStory.age_range.match(/(\d+)\s*[-–to]\s*(\d+)/i);
        if (match && (minA === undefined || minA === null || (minA === 2 && maxA === 13))) {
          minA = parseInt(match[1], 10);
          maxA = parseInt(match[2], 10);
        }
      }
      setBookMinAge(minA ?? 3);
      setBookMaxAge(maxA ?? 7);
      const rawTG = (selectedStory.target_gender || "both").toLowerCase().trim();
      setTargetGender(rawTG === "boy" || rawTG === "boys" ? "boy" : (rawTG === "girl" || rawTG === "girls" ? "girl" : "both"));
    }
  }, [selectedStory]);

  const handleSelectStory = (storyId: string) => {
    const s = stories.find(item => item.id === storyId);
    if (s) {
      setSelectedStory(s);
      setSelectedPageIndex(0);
      setIsViewingCoverSpread(false);
      if (s.pages && s.pages.length > 0) {
        syncPageForm(s.pages[0]);
      }
    }
  };

  const handleSelectPage = (idx: number) => {
    setIsViewingCoverSpread(false);
    setSelectedPageIndex(idx);
    if (selectedStory?.pages && selectedStory.pages[idx]) {
      syncPageForm(selectedStory.pages[idx]);
    }
  };

  const handleAutoTranslateCurrentLang = async (langId: string) => {
    const textToTranslate = pageEditText.trim();
    if (!textToTranslate) {
      alert("Please enter English narrative text first to translate.");
      return;
    }
    setTranslatingLang(langId);
    try {
      const res = await api.translateAdminText(textToTranslate, langId);
      if (res && res.translations && res.translations[langId]) {
        setPageTranslations(prev => ({
          ...prev,
          [langId]: res.translations[langId]
        }));
        const langObj = CMS_SUPPORTED_LANGUAGES.find(l => l.id === langId);
        setEditorNotice(`Auto-translated to ${langObj?.native || langId} successfully!`);
        setTimeout(() => setEditorNotice(""), 3000);
      }
    } catch (err: any) {
      alert("Translation failed: " + err.message);
    } finally {
      setTranslatingLang(null);
    }
  };

  const handleAutoTranslateAllLanguages = async () => {
    const textToTranslate = pageEditText.trim();
    if (!textToTranslate) {
      alert("Please enter English narrative text first to translate.");
      return;
    }
    setIsTranslatingPage(true);
    try {
      const res = await api.translateAdminText(textToTranslate, "all");
      if (res && res.translations) {
        setPageTranslations(prev => ({
          ...prev,
          ...res.translations
        }));
        setEditorNotice("Auto-translated into all 6 Indian regional languages!");
        setTimeout(() => setEditorNotice(""), 3500);
      }
    } catch (err: any) {
      alert("Translation failed: " + err.message);
    } finally {
      setIsTranslatingPage(false);
    }
  };

  const handleSavePage = async () => {
    if (!selectedStory || !selectedStory.pages || !selectedStory.pages[selectedPageIndex]) return;
    const page = selectedStory.pages[selectedPageIndex];
    setSavingPage(true);
    try {
      const updated = await api.updateStoryPage(page.id, {
        page_number: Number(pageNumberInput),
        story_text: pageEditText,
        translations: JSON.stringify(pageTranslations),
        scene_description: pageEditScene,
        prompt_template: pageEditPrompt,
        character_guidance: pageStylePrompt || page.character_guidance || "",
        personalization_required: facePoints.length > 0,
        face_outline_points: facePoints.length > 0 ? JSON.stringify(facePoints) : "[]",
        text_x: Number(textX),
        text_y: Number(textY),
        font_size: Number(fontSize),
        font_family: fontFamily,
        font_color: fontColor,
        letter_spacing: Number(letterSpacing),
        stroke_color: strokeColor,
        stroke_width: Number(strokeWidth),
        has_shadow: hasShadow,
        soft_line_break: softLineBreak,
        has_background_box: hasBackgroundBox,
        box_bg_color: boxBgColor,
        box_border_color: boxBorderColor,
        box_border_width: Number(boxBorderWidth),
        box_border_radius: Number(boxBorderRadius),
        box_bg_opacity: Number(boxBgOpacity),
        box_layout: boxLayout,
        text_align: textAlign,
        warp_style: warpStyle,
        gender_variant: selectedGender,
      });

      const updatedPages = [...selectedStory.pages];
      updatedPages[selectedPageIndex] = updated;
      const updatedStory = { ...selectedStory, pages: updatedPages };
      setSelectedStory(updatedStory);
      setStories(stories.map(s => s.id === selectedStory.id ? updatedStory : s));
      setSaveSuccess(true);
      setEditorNotice("Page saved successfully!");
      setTimeout(() => {
        setSaveSuccess(false);
        setEditorNotice("");
      }, 3000);
    } catch (err: any) {
      alert("Error saving page: " + err.message);
    } finally {
      setSavingPage(false);
    }
  };

  const handleSaveAvailability = async (newGender: "boy" | "girl" | "both", minA: number, maxA: number) => {
    if (!selectedStory) return;
    try {
      const updated = await api.updateAdminStory(selectedStory.id, {
        target_gender: newGender,
        min_age: minA,
        max_age: maxA,
        age_range: `Ages ${minA}-${maxA}`
      });
      setSelectedStory(updated);
      setStories(stories.map(s => s.id === updated.id ? updated : s));
      setAgeSavedBadge(true);
      setEditorNotice("Storefront availability saved!");
      setTimeout(() => setEditorNotice(""), 3000);
    } catch (err: any) {
      console.error("Failed to update book availability", err);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    setIsDrawing(true);
    setFacePoints([[x, y]]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
    setFacePoints((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(last[0] - x, last[1] - y) < 0.6) return prev;
      return [...prev, [x, y]];
    });
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleAutoTracePage = async () => {
    if (!activePage) return;
    setAutoTracing(true);
    try {
      const updated = await api.autoTracePage(activePage.id);
      if (updated.face_outline_points && updated.face_outline_points !== "[]") {
        const pts = JSON.parse(updated.face_outline_points);
        if (Array.isArray(pts) && pts.length > 0) {
          setFacePoints(pts);
          setPersonalizationRequired(true);
          setEditorNotice(`Auto-detected face outline generated (${pts.length} points) ✓`);
          setTimeout(() => setEditorNotice(""), 3500);
          return;
        }
      }
      setEditorNotice("No character face detected. Please drag on preview to trace manually.");
      setTimeout(() => setEditorNotice(""), 4000);
    } catch {
      setEditorNotice("No face detected automatically. Please drag on preview to trace manually.");
      setTimeout(() => setEditorNotice(""), 4000);
    } finally {
      setAutoTracing(false);
    }
  };

  const handleAutoTraceAll = async () => {
    if (!selectedStory) return;
    setAutoTracingAll(true);
    try {
      const res = await api.autoTraceAllPages(selectedStory.id);
      setEditorNotice(res.message || "Auto-traced character faces on pages ✓");
      setTimeout(() => setEditorNotice(""), 4000);
      const refreshed = await api.getAdminStories();
      const s = refreshed.find((item: any) => item.id === selectedStory.id);
      if (s) {
        setSelectedStory(s);
        if (s.pages && s.pages[selectedPageIndex]) {
          syncPageForm(s.pages[selectedPageIndex]);
        }
      }
    } catch (err: any) {
      alert("Auto-trace error: " + err.message);
    } finally {
      setAutoTracingAll(false);
    }
  };

  const handleReplaceBaseArt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePage || !selectedStory) return;
    setUploadingBaseArt(true);
    try {
      const updated = await api.uploadPageBaseArt(activePage.id, file);
      const updatedPages = [...selectedStory.pages];
      updatedPages[selectedPageIndex] = updated;
      const updatedStory = {
        ...selectedStory,
        pages: updatedPages,
        ...(selectedPageIndex === 0
          ? { cover_image_path: updated.original_image_path, cover_image_url: updated.original_image_url }
          : {})
      };
      setSelectedStory(updatedStory);
      setStories(stories.map(s => s.id === selectedStory.id ? updatedStory : s));
      setEditorNotice("Base illustration replaced successfully!");
      setTimeout(() => setEditorNotice(""), 3500);
    } catch (err: any) {
      alert("Failed to upload base illustration: " + err.message);
    } finally {
      setUploadingBaseArt(false);
    }
  };

  const handleCoverPageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStory) return;
    try {
      setUploadingCoverPage(true);
      setEditorNotice("Uploading cover page spread and scanning character faces...");
      const updated = await api.uploadCoverPage(selectedStory.id, file);
      setSelectedStory(updated);
      setStories(stories.map(s => s.id === updated.id ? updated : s));
      setIsViewingCoverSpread(true);
      setEditorNotice("Cover page uploaded successfully! Character faces auto-detected ✓");
      setTimeout(() => setEditorNotice(""), 4000);
    } catch (err: any) {
      alert("Failed to upload cover page: " + (err.message || "Unknown error"));
      setEditorNotice("Failed to upload cover page: " + err.message);
    } finally {
      setUploadingCoverPage(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleAutoTraceCoverPage = async () => {
    if (!selectedStory) return;
    try {
      setAutoTracingCover(true);
      setEditorNotice("Scanning cover page for character faces with YuNet...");
      const updated = await api.autoTraceCoverPage(selectedStory.id);
      setSelectedStory(updated);
      setStories(stories.map(s => s.id === updated.id ? updated : s));
      setEditorNotice("Cover page character faces auto-detected successfully! ✓");
      setTimeout(() => setEditorNotice(""), 4000);
    } catch (err: any) {
      alert("Failed to auto-trace cover: " + (err.message || "Unknown error"));
    } finally {
      setAutoTracingCover(false);
    }
  };

  const handleMakeCover = async (role: "front_cover" | "back_cover") => {
    if (!activePage || !selectedStory) return;
    try {
      setEditorNotice(role === "front_cover" ? "Moving page to Front Cover..." : "Moving page to Back Cover...");
      const updatedStory = await api.setPageRole(selectedStory.id, activePage.id, role);
      setSelectedStory(updatedStory);
      setStories(stories.map(s => s.id === updatedStory.id ? updatedStory : s));

      const newIdx = role === "front_cover" ? 0 : (updatedStory.pages?.length || 1) - 1;
      setSelectedPageIndex(newIdx);
      if (updatedStory.pages?.[newIdx]) {
        syncPageForm(updatedStory.pages[newIdx]);
      }
      setEditorNotice(role === "front_cover" ? "Page designated as Front Cover!" : "Page designated as Back Cover!");
      setTimeout(() => setEditorNotice(""), 3500);
    } catch (err: any) {
      alert("Failed to update cover role: " + err.message);
      setEditorNotice("");
    }
  };

  const handleAddPage = async (pageType: string = "story") => {
    if (!selectedStory) return;
    try {
      await api.addStoryPage(selectedStory.id, {
        page_type: "story",
        gender_variant: selectedGender,
        story_text: `Story narrative for page ${(selectedStory.pages?.length || 0)}`,
      });
      // Fetch refreshed story from backend with correct sequence (new page inserted before Back Cover)
      const updatedStory = await api.getStory(selectedStory.id);
      setSelectedStory(updatedStory);
      setStories(stories.map(s => s.id === updatedStory.id ? updatedStory : s));
      // Select the newly inserted page (right before the Back Cover)
      const newIdx = Math.max(0, (updatedStory.pages?.length || 1) - 2);
      setSelectedPageIndex(newIdx);
      if (updatedStory.pages?.[newIdx]) {
        syncPageForm(updatedStory.pages[newIdx]);
      }
      setEditorNotice("Added new story page!");
      setTimeout(() => setEditorNotice(""), 3500);
    } catch (err: any) {
      alert("Failed to add page: " + err.message);
    }
  };

  const handleDeleteCurrentPage = async () => {
    if (!activePage || !selectedStory) return;
    if (selectedStory.pages.length <= 1) {
      alert("Cannot delete the only page in the story.");
      return;
    }
    if (!confirm(`Are you sure you want to delete Page ${activePage.page_number}?`)) return;
    try {
      await api.deleteStoryPage(activePage.id);
      // Fetch refreshed story from backend with re-indexed pages
      const updatedStory = await api.getStory(selectedStory.id);
      setSelectedStory(updatedStory);
      setStories(stories.map(s => s.id === updatedStory.id ? updatedStory : s));
      const nextIdx = Math.min(selectedPageIndex, (updatedStory.pages?.length || 1) - 1);
      setSelectedPageIndex(nextIdx);
      if (updatedStory.pages?.[nextIdx]) {
        syncPageForm(updatedStory.pages[nextIdx]);
      }
      setEditorNotice("Page deleted.");
      setTimeout(() => setEditorNotice(""), 3500);
    } catch (err: any) {
      alert("Failed to delete page: " + err.message);
    }
  };


  const handleOpenTestRenderModal = () => {
    if (stories.length > 0 && !testRenderStoryId) {
      setTestRenderStoryId(stories[0].id);
    }
    setShowTestRenderModal(true);
  };

  const handleCreateTestRender = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRenderStoryId || !testRenderChildName) {
      alert("Please select a story and enter child name");
      return;
    }
    setSubmittingTestRender(true);
    try {
      const newJob = await api.testRenderBook({
        story_id: testRenderStoryId,
        child_name: testRenderChildName,
        photo: testRenderPhotoFile || undefined,
      });
      setJobs((prev) => [newJob, ...prev]);
      setShowTestRenderModal(false);
      setTestRenderPhotoFile(null);
      setEditorNotice(`✨ Test render session created for ${testRenderChildName}!`);
      setTimeout(() => setEditorNotice(""), 3500);
    } catch (err: any) {
      alert("Error creating test render: " + err.message);
    } finally {
      setSubmittingTestRender(false);
    }
  };

  const handleDownloadPdf = async (job: PersonalizationJob, mode: "print" | "preview" = "print") => {
    if (mode === "preview") {
      const rawUrl = job.pdf_download_url || `/api/v1/personalization/${job.id}/pdf`;
      const url = api.resolveUrl(rawUrl);
      window.open(url, "_blank");
      return;
    }

    // Print PDF (8x8 RGB - ALL 24 Pages):
    const total = job.total_pages || 24;
    const completed = job.completed_pages || 0;
    const isAlreadyFull = completed >= total || job.is_paid || (job.current_stage && job.current_stage.toLowerCase().includes("downloaded"));

    // If all pages haven't been rendered yet or currently rendering, launch live generator modal
    if (!isAlreadyFull && (completed < total || job.status?.toLowerCase().includes("rendering"))) {
      try {
        await api.triggerFullGeneration(job.id);
      } catch (err) {
        console.warn("Notice triggering full generation:", err);
      }
      setGeneratingFullJob({
        ...job,
        status: "Rendering · " + Math.round((completed / total) * 100) + "%",
        completed_pages: completed,
        total_pages: total
      });
      return;
    }

    // Directly download the complete print-ready PDF containing all pages with vivid colors
    const adminTok = encodeURIComponent(authService.getToken() || "");
    const rawUrl = job.print_pdf_url
      ? (job.print_pdf_url.includes("token=") ? job.print_pdf_url : `${job.print_pdf_url}&token=${adminTok}`)
      : `/api/v1/personalization/${job.id}/print-pdf?size=8x8&color=rgb&token=${adminTok}`;
    const url = api.resolveUrl(rawUrl);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${(job.child_name || "Child").replace(/\s+/g, "_")}_Full_Print.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCover = (job: PersonalizationJob) => {
    const adminTok = encodeURIComponent(authService.getToken() || "");
    const rawUrl = `/api/v1/personalization/${job.id}/cover-page?format=pdf&token=${adminTok}`;
    const url = api.resolveUrl(rawUrl);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${(job.child_name || "Child").replace(/\s+/g, "_")}_Cover_Page_46.6x27.6cm.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAiSettings = async () => {
    setSavingAi(true);
    try {
      const updated = await api.updateAISettings({
        active_image_provider: aiProvider,
        active_model: aiModel,
        preview_page_limit: Number(previewLimit),
        per_book_budget: Number(budgetCap),
      });
      setAiSettings(updated);
      alert("Provider Settings updated successfully.");
    } catch (err: any) {
      alert("Error updating settings: " + err.message);
    } finally {
      setSavingAi(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    try {
      await api.updateAnnouncement({
        is_active: announcementActive,
        badge: announcementBadge,
        text: announcementText,
        coupon_code: announcementCoupon,
        link_label: announcementLinkLabel,
        link_url: announcementLinkUrl,
        notices: announcementNotices,
        default_pdf_price: Number(settingDefaultPdfPrice) || 799,
        default_hardcover_price: Number(settingDefaultHardcoverPrice) || 1399,
        regional_language_surcharge: Number(settingLanguageSurcharge) || 0,
        gift_wrap_fee: Number(settingGiftWrapFee) || 0,
        gift_wrap_enabled: settingGiftWrapEnabled,
      });
      setAnnouncementSavedToast(true);
      setTimeout(() => setAnnouncementSavedToast(false), 3000);
    } catch (err: any) {
      alert("Error updating announcement: " + err.message);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName) {
      alert("Please enter customer name");
      return;
    }
    setCreatingOrder(true);
    try {
      await api.createOrder({
        customer_name: newCustomerName,
        customer_email: newCustomerEmail || `${newCustomerName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        amount: parseFloat(newAmount) || 1299,
        currency: "INR",
        status: newStatus,
        payment_status: newStatus === "Pending" ? "unpaid" : "paid",
        format_type: newFormat,
      });
      setShowNewOrderModal(false);
      setNewCustomerName("");
      setNewCustomerEmail("");
      await handleRefresh();
    } catch (err: any) {
      alert("Failed to create order: " + err.message);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleCarrierChange = (newCarrierName: string) => {
    const carrierObj = SHIPPING_CARRIERS.find((c) => c.name === newCarrierName);
    let newUrl = shippingModal.trackingUrl;
    if (carrierObj?.urlTpl && shippingModal.trackingNumber.trim()) {
      newUrl = carrierObj.urlTpl.replace("{tracking}", encodeURIComponent(shippingModal.trackingNumber.trim()));
    } else if (carrierObj?.urlTpl && !carrierObj.urlTpl.includes("{tracking}")) {
      newUrl = carrierObj.urlTpl;
    }
    setShippingModal((prev) => ({
      ...prev,
      carrier: newCarrierName,
      trackingUrl: newUrl,
    }));
  };

  const handleTrackingNumberChange = (newTracking: string) => {
    const carrierObj = SHIPPING_CARRIERS.find((c) => c.name === shippingModal.carrier);
    let newUrl = shippingModal.trackingUrl;
    if (carrierObj?.urlTpl && newTracking.trim()) {
      newUrl = carrierObj.urlTpl.replace("{tracking}", encodeURIComponent(newTracking.trim()));
    }
    setShippingModal((prev) => ({
      ...prev,
      trackingNumber: newTracking,
      trackingUrl: newUrl,
    }));
  };

  const handleConfirmShipping = async () => {
    if (!shippingModal.order) return;
    if (!shippingModal.trackingNumber.trim()) {
      alert("Please enter a tracking / AWB number.");
      return;
    }
    setSubmittingShipping(true);
    try {
      const updated = await api.updateOrderStatus(shippingModal.order.id, "Shipped", {
        tracking_number: shippingModal.trackingNumber.trim(),
        shipping_carrier: shippingModal.carrier.trim(),
        tracking_url: shippingModal.trackingUrl.trim() || undefined,
      });
      await handleRefresh();
      if (selectedOrder && selectedOrder.id === shippingModal.order.id) {
        setSelectedOrder({ ...selectedOrder, ...updated, status: "Shipped" });
      }
      setShippingModal({ isOpen: false, order: null, carrier: "Delhivery", trackingNumber: "", trackingUrl: "" });
    } catch (err: any) {
      alert("Failed to update shipping details: " + err.message);
    } finally {
      setSubmittingShipping(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    if (status === "Shipped") {
      const targetOrder = orders.find((o) => o.id === orderId) || selectedOrder;
      setShippingModal({
        isOpen: true,
        order: targetOrder || null,
        carrier: targetOrder?.shipping_carrier || "Delhivery",
        trackingNumber: targetOrder?.tracking_number || "",
        trackingUrl: targetOrder?.tracking_url || "",
      });
      return;
    }

    try {
      const updated = await api.updateOrderStatus(orderId, status);
      await handleRefresh();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updated, status });
      }
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      await api.deleteOrder(orderId);
      setSelectedOrder(null);
      await handleRefresh();
    } catch (err: any) {
      alert("Failed to delete order: " + err.message);
    }
  };

  // Story management handlers
  const handleTitleChange = (val: string) => {
    setNewBookTitle(val);
    if (!newBookSlugTouched) {
      const slug = val
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setNewBookSlug(slug);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) {
      setBookError("Title is required");
      return;
    }
    setCreatingBook(true);
    setBookError("");
    try {
      const created = await api.createAdminStory({
        title: newBookTitle.trim(),
        slug: newBookSlug.trim() || undefined,
        category: newBookCategory,
        min_age: Number(newBookMinAge) || 3,
        max_age: Number(newBookMaxAge) || 7,
        age_range: `Ages ${newBookMinAge}-${newBookMaxAge}`,
        price_digital: Number(newBookPdfPrice) || 799,
        price_print: Number(newBookPrintPrice) || 1399,
        page_count: Number(newBookTotalPages) || 28,
        description: newBookTagline.trim() || undefined,
        cover_image_url: newBookCoverUrl.trim() || undefined,
        status: "published",
      }, newBookPdfFile);
      setStories((prev) => [created, ...prev]);
      setShowNewBookModal(false);
      setNewBookTitle("");
      setNewBookSlug("");
      setNewBookSlugTouched(false);
      setNewBookTagline("");
      setNewBookCoverUrl("");
      setNewBookPdfFile(null);
    } catch (err: any) {
      setBookError(err.message || "Failed to create book");
    } finally {
      setCreatingBook(false);
    }
  };

  const handleToggleStatus = async (story: StoryTemplate) => {
    try {
      const updated = await api.toggleStoryStatus(story.id);
      setStories((prev) => prev.map((s) => (s.id === story.id ? updated : s)));
    } catch (err: any) {
      alert("Failed to toggle status: " + (err.message || "Unknown error"));
    }
  };

  const handleDeleteStory = async (story: StoryTemplate) => {
    if (!confirm(`Are you sure you want to delete "${story.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteAdminStory(story.id);
      setStories((prev) => prev.filter((s) => s.id !== story.id));
      if (selectedStory?.id === story.id) {
        setSelectedStory(stories.find((s) => s.id !== story.id) || null);
      }
    } catch (err: any) {
      alert("Failed to delete story: " + (err.message || "Unknown error"));
    }
  };

  const handleAuthorPages = (story: StoryTemplate) => {
    setSelectedStory(story);
    if (story.pages && story.pages.length > 0) {
      syncPageForm(story.pages[0]);
      setSelectedPageIndex(0);
    }
    setActiveTab("page_editor"); setIsMobileMenuOpen(false);
  };

  const handleOpenEditAge = (story: StoryTemplate) => {
    setStoryToEdit(story);
    const matches = story.age_range ? story.age_range.match(/(\d+)\s*[-–to]\s*(\d+)/i) : null;
    const minA = matches ? parseInt(matches[1]) : 3;
    const maxA = matches ? parseInt(matches[2]) : 7;
    setEditMinAge(minA);
    setEditMaxAge(maxA);
    setEditPdfPrice(story.price_digital || 799);
    setEditPrintPrice(story.price_print || 1399);
    setEditCategory(story.category || "ADVENTURE");
    setEditHighlight((story.highlight as "latest" | "best_seller" | "popular" | null) || null);
    setEditInHeroCarousel(Boolean(story.in_hero_carousel));
    setShowEditAgeModal(true);
  };

  const handleSaveAgeEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyToEdit) return;
    const activeHeroCount = stories.filter((s) => s.in_hero_carousel && s.id !== storyToEdit.id).length;
    if (editInHeroCarousel && activeHeroCount >= 5) {
      alert("Only 5 slides can be active in the Hero Carousel at a time. Please remove one before adding another.");
      return;
    }
    setSavingAgeEdit(true);
    try {
      const updated = await api.updateAdminStory(storyToEdit.id, {
        min_age: editMinAge,
        max_age: editMaxAge,
        age_range: `Ages ${editMinAge}-${editMaxAge}`,
        price_digital: editPdfPrice,
        price_print: editPrintPrice,
        category: editCategory,
        highlight: editHighlight,
        in_hero_carousel: editInHeroCarousel,
      });
      setStories((prev) => prev.map((s) => (s.id === storyToEdit.id ? updated : s)));
      setShowEditAgeModal(false);
    } catch (err: any) {
      alert("Failed to update book: " + (err.message || "Unknown error"));
    } finally {
      setSavingAgeEdit(false);
    }
  };

  const handleToggleHeroCarousel = async (story: StoryTemplate) => {
    const isCurrentlyIn = Boolean(story.in_hero_carousel);
    const activeHeroCount = stories.filter((s) => s.in_hero_carousel).length;

    if (!isCurrentlyIn && activeHeroCount >= 5) {
      alert("The Hero Carousel is limited to 5 slides maximum. Please remove a book from the carousel first.");
      return;
    }

    const nextState = !isCurrentlyIn;
    // Optimistic local state update
    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, in_hero_carousel: nextState } : s))
    );

    try {
      await api.updateAdminStory(story.id, { in_hero_carousel: nextState });
    } catch (err: any) {
      console.error("Failed to toggle hero carousel:", err);
      // Revert on error
      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? { ...s, in_hero_carousel: isCurrentlyIn } : s))
      );
      alert("Failed to update Hero Carousel: " + (err.message || "Unknown error"));
    }
  };

  const handleSetHighlight = async (story: StoryTemplate, newHighlight: "latest" | "best_seller" | "popular" | null) => {
    const finalHighlight = story.highlight === newHighlight ? null : newHighlight;
    // Optimistic local state update
    setStories((prev) =>
      prev.map((s) => (s.id === story.id ? { ...s, highlight: finalHighlight } : s))
    );

    try {
      await api.updateAdminStory(story.id, { highlight: finalHighlight });
    } catch (err: any) {
      console.error("Failed to update story highlight:", err);
      // Revert on error
      setStories((prev) =>
        prev.map((s) => (s.id === story.id ? { ...s, highlight: story.highlight } : s))
      );
      alert("Failed to update highlight badge: " + (err.message || "Unknown error"));
    }
  };

  // Helper for Status Badge Styling matching reference image
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "In Production":
        return "bg-[#FEF3C7] text-[#D97706]";
      case "Paid":
        return "bg-[#DCFCE7] text-[#16A34A]";
      case "Delivered":
        return "bg-[#D1FAE5] text-[#059669]";
      case "Shipped":
        return "bg-[#EEF2FF] text-[#4F46E5]";
      case "Pending":
        return "bg-[#F1F5F9] text-[#64748B]";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Filtered orders for the Orders tab
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customer_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.order_number?.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.id?.toLowerCase().includes(orderSearch.toLowerCase());
    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredJobs = jobs.filter((job) => {
    if (previewFilter === "purchased") {
      return job.is_purchased === true;
    }
    return true;
  });

  const activePage = selectedStory?.pages?.[selectedPageIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-[#C98A84]/20 border-t-[#C98A84] animate-spin" />
          <span className="text-[#C98A84] font-semibold text-sm">Loading Kutty Story Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col lg:flex-row text-[#2D222A] font-sans antialiased">
      <Seo title="Admin Dashboard | KuttyStory" noindex={true} />
      {/* Mobile Sticky Navigation Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white border border-gray-100 p-0.5 shadow-xs overflow-hidden flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Kutty Story Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-[#C98A84] text-base tracking-tight">Kutty Story</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FAEEED] text-[#C98A84] capitalize">
            {activeTab.replace("_", " ")}
          </span>
        </div>
      </header>

      {/* Backdrop for mobile drawer */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* 1. Left Sidebar Navigation (Desktop Fixed / Mobile Sliding Drawer) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100/90 flex flex-col shrink-0 min-h-screen lg:min-h-screen lg:sticky lg:top-0 lg:h-screen transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Brand Logo Header */}
        <div className="px-6 pt-7 pb-6 flex items-center justify-between">
          <Link to="/admin_dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 p-0.5 shadow-xs overflow-hidden flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img src="/logo.png" alt="Kutty Story Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-[#C98A84] font-sans">
              Kutty Story
            </h1>
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Navigation Items */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <button
            onClick={() => {
              setActiveTab("dashboard"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin");
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "dashboard"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("orders"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/orders");
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "orders"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Orders</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("payments"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/payments");
              fetchPaymentTransactions();
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "payments"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Payments</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("previews"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/previews");
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "previews"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Previews</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("stories"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/stories");
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "stories"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Stories</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("page_editor"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/page_editor");
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "page_editor"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <FileEdit className="w-4 h-4 shrink-0" />
            <span>Page Editor</span>
          </button>

          {/* <button
            onClick={() => {
              setActiveTab("child_stories"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/child_stories");
              fetchAdminChildStories();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "child_stories"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <Feather className="w-4 h-4 shrink-0" />
              <span>Children's Stories</span>
            </div>
            {adminChildStories.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === "child_stories"
                  ? "bg-white/20 text-white"
                  : "bg-[#FAEEED] text-[#C98A84]"
                  }`}
              >
                {adminChildStories.length}
              </span>
            )}
          </button> */}

          <button
            onClick={() => {
              setActiveTab("feedback"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/feedback");
              fetchAdminFeedbacks();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "feedback"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <MessageSquareHeart className="w-4 h-4 shrink-0" />
              <span>Feedback</span>
            </div>
            {feedbacks.filter((f) => f.status === "pending").length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === "feedback"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
                  }`}
              >
                {feedbacks.filter((f) => f.status === "pending").length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("settings"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/settings");
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "settings"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <Megaphone className="w-4 h-4 shrink-0" />
            <span>Offers & Banner</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("kuttys_story"); setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/kuttys-story");
              fetchAdminKuttysStories();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "kuttys_story"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <Smile className="w-4 h-4 shrink-0" />
              <span>Kutty's Story</span>
            </div>
            {adminKuttysStories.length > 0 && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === "kuttys_story"
                  ? "bg-white/20 text-white"
                  : "bg-[#FAEEED] text-[#C98A84]"
                  }`}
              >
                {adminKuttysStories.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveTab("parenting_routine");
              setIsMobileMenuOpen(false);
              window.history.pushState(null, "", "/admin/parenting-routine");
              fetchAdminParentingRoutine();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === "parenting_routine"
              ? "bg-[#C98A84] text-white shadow-sm shadow-[#C98A84]/20"
              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <Clock className="w-4 h-4 shrink-0" />
              <span>24h Routine</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FAF0E6] text-[#A85341]">
              11
            </span>
          </button>
        </nav>

        {/* Sidebar Footer with Logged in User & Sign out */}
        <div className="p-4 mt-auto border-t border-gray-100 space-y-2">
          {currentUser && (
            <div className="px-2 py-1.5 flex items-center gap-2.5 bg-gray-50/70 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#FAEEED] text-[#C98A84] flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-800 truncate">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{currentUser.email}</p>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              authService.logout();
              navigate("/admin_login");
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50/60 rounded-xl transition"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Dashboard Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10 overflow-y-auto">
        {/* TAB 1: DASHBOARD VIEW (Exact match to reference screenshot) */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header with Title & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[28px] font-bold tracking-tight text-[#111827]">
                Dashboard
              </h2>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200/80 text-gray-600 text-xs font-medium hover:bg-gray-50 flex items-center gap-1.5 shadow-xs transition"
                  title="Refresh Dashboard Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${refreshing ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => setShowNewOrderModal(true)}
                  className="px-4 py-1.5 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-medium flex items-center gap-1 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Order</span>
                </button>
              </div>
            </div>

            {/* 4 Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Revenue */}
              <div className="bg-white rounded-3xl p-7 shadow-xs border border-gray-100 hover:shadow-sm transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] flex items-center justify-center text-[#10B981] font-bold text-xl">
                  ₹
                </div>
                <div className="text-[30px] font-bold tracking-tight text-[#111827] mt-5 mb-0.5">
                  {dashboardData?.revenue_formatted ?? "₹0"}
                </div>
                <div className="text-sm font-medium text-gray-400">
                  Revenue
                </div>
              </div>

              {/* Card 2: Paid orders */}
              <div className="bg-white rounded-3xl p-7 shadow-xs border border-gray-100 hover:shadow-sm transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#FAEEED] flex items-center justify-center text-[#C98A84]">
                  <Package className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-[30px] font-bold tracking-tight text-[#111827] mt-5 mb-0.5">
                  {dashboardData?.paid_orders ?? 0}
                </div>
                <div className="text-sm font-medium text-gray-400">
                  Paid orders
                </div>
              </div>

              {/* Card 3: Previews created */}
              <div className="bg-white rounded-3xl p-7 shadow-xs border border-gray-100 hover:shadow-sm transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#FEF8E7] flex items-center justify-center text-[#D97706]">
                  <Sparkles className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-[30px] font-bold tracking-tight text-[#111827] mt-5 mb-0.5">
                  {dashboardData?.previews_created ?? 0}
                </div>
                <div className="text-sm font-medium text-gray-400">
                  Previews created
                </div>
              </div>

              {/* Card 4: Live stories */}
              <div className="bg-white rounded-3xl p-7 shadow-xs border border-gray-100 hover:shadow-sm transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#FDF0F6] flex items-center justify-center text-[#DB2777]">
                  <BookOpen className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="text-[30px] font-bold tracking-tight text-[#111827] mt-5 mb-0.5">
                  {dashboardData?.live_stories ?? 0}
                </div>
                <div className="text-sm font-medium text-gray-400">
                  Live stories
                </div>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#111827]">
                  Recent orders
                </h3>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="text-xs font-semibold text-[#C98A84] hover:underline flex items-center gap-1"
                >
                  <span>View all ({orders.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Table Container */}
              <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
                        <th className="py-4 px-6 font-semibold">ORDER</th>
                        <th className="py-4 px-6 font-semibold">CUSTOMER</th>
                        <th className="py-4 px-6 font-semibold">TOTAL</th>
                        <th className="py-4 px-6 font-semibold">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80 text-sm">
                      {(dashboardData?.recent_orders || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-gray-400 text-xs">
                            <Package className="w-8 h-8 mx-auto text-gray-300 mb-2 stroke-1" />
                            <p className="font-semibold text-gray-600">No recent orders</p>
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              Orders placed by customers or created manually will appear here.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        dashboardData!.recent_orders.slice(0, 6).map((order) => (
                          <tr
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                          >
                            {/* ORDER ID */}
                            <td className="py-4 px-6 font-mono text-[13px] text-gray-700">
                              {order.order_number || order.id}
                            </td>

                            {/* CUSTOMER */}
                            <td className="py-4 px-6 text-gray-800 font-normal">
                              {order.customer_name}
                            </td>

                            {/* TOTAL */}
                            <td className="py-4 px-6 font-medium text-gray-900">
                              ₹{order.amount ? Number(order.amount).toLocaleString("en-IN") : "0"}
                            </td>

                            {/* STATUS BADGE */}
                            <td className="py-4 px-6">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(
                                  order.status
                                )}`}
                              >
                                {order.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT VIEW */}
        {activeTab === "orders" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Orders Management</h2>
                <p className="text-xs text-gray-500 mt-1">Review orders, filter statuses, and track fulfillment.</p>
              </div>

              <button
                onClick={() => setShowNewOrderModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Order</span>
              </button>
            </div>

            {/* Search & Status Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by customer or order #..."
                  value={orderSearch}
                  onChange={(e) => handleOrderSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-medium">
                {["all", "In Production", "Paid", "Delivered", "Shipped", "Pending"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-full transition capitalize shrink-0 ${orderStatusFilter === st
                      ? "bg-[#C98A84] text-white font-semibold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {st === "all" ? "All Orders" : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Full Orders Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-100/80 overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs shadow-xs border-b border-gray-100">
                    <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 tracking-wider uppercase">
                      <th className="py-4 px-6 font-semibold bg-white">ORDER</th>
                      <th className="py-4 px-6 font-semibold bg-white">CUSTOMER</th>
                      <th className="py-4 px-6 font-semibold bg-white">FORMAT</th>
                      <th className="py-4 px-6 font-semibold bg-white">TOTAL</th>
                      <th className="py-4 px-6 font-semibold bg-white">STATUS</th>
                      <th className="py-4 px-6 font-semibold text-right bg-white">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80 text-sm">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                          No orders found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders
                        .slice((orderPage - 1) * ITEMS_PER_PAGE, orderPage * ITEMS_PER_PAGE)
                        .map((order) => (
                          <tr
                            key={order.id}
                            className="hover:bg-gray-50/60 transition-colors"
                          >
                            <td className="py-4 px-6 font-medium text-gray-800">
                              {order.order_number || order.id}
                            </td>
                            <td className="py-4 px-6 text-gray-800 font-medium">
                              <div>{order.customer_name}</div>
                              {order.customer_email && (
                                <div className="text-[11px] text-gray-400">{order.customer_email}</div>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {order.format_type === "digital" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                                  <BookOpen className="w-3 h-3 text-blue-600" />
                                  <span>Digital PDF</span>
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                                    <Package className="w-3 h-3 text-amber-600" />
                                    <span>Hardcover Book</span>
                                  </span>
                                  {order.shipping_address && (() => {
                                    try {
                                      const parsed = JSON.parse(order.shipping_address);
                                      if (parsed.state || parsed.city) {
                                        return (
                                          <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <MapPin className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                                            <span className="truncate max-w-[130px] font-medium">{parsed.city ? `${parsed.city}, ` : ""}{parsed.state || ""}</span>
                                          </div>
                                        );
                                      }
                                    } catch (e) { }
                                    return null;
                                  })()}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 font-semibold text-gray-900">
                              ₹{order.amount ? Number(order.amount).toLocaleString("en-IN") : "0"}
                            </td>
                            <td className="py-4 px-6">
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border-0 outline-none ${getStatusBadgeClass(
                                  order.status
                                )}`}
                              >
                                <option value="In Production">In Production</option>
                                <option value="Paid">Paid</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Pending">Pending</option>
                              </select>
                              {order.status === "Shipped" && (order.shipping_carrier || order.tracking_number) && (
                                <div className="mt-1 text-[11px] text-gray-500 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-[#B87A74]">{order.shipping_carrier || "Shipped"}:</span>
                                  <span className="font-mono text-gray-700 font-medium">{order.tracking_number}</span>
                                  {order.tracking_url && (
                                    <a
                                      href={order.tracking_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-[#C98A84] hover:underline font-bold inline-flex items-center gap-0.5 ml-1"
                                      title="Open live tracking page"
                                    >
                                      <span>Track</span>
                                      <ExternalLink className="w-3 h-3 inline" />
                                    </a>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="text-xs text-[#C98A84] hover:underline font-semibold mr-3"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="text-xs text-red-500 hover:text-red-700"
                                title="Delete Order"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
              <AdminTablePagination
                currentPage={orderPage}
                totalItems={filteredOrders.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={setOrderPage}
              />
            </div>
          </div>
        )}

        {/* TAB: PAYMENTS & RAZORPAY TRANSACTIONS VIEW */}
        {activeTab === "payments" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Payments & Transactions</h2>
                <p className="text-xs text-gray-500 mt-1">
                  Razorpay payment gateway logs, customer checkout verification, and transaction history.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={fetchPaymentTransactions}
                  disabled={loadingPayments}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-gray-200/80 text-gray-600 text-xs font-medium hover:bg-gray-50 flex items-center gap-1.5 shadow-xs transition"
                  title="Refresh Payment Records"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${loadingPayments ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>

                <a
                  href="https://dashboard.razorpay.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-1.5 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Razorpay Dashboard</span>
                </a>
              </div>
            </div>

            {/* 4 Summary Stat Cards */}
            {(() => {
              const capturedTxns = paymentTransactions.filter(t => t.status?.toLowerCase() === "captured");
              const totalCapturedAmount = capturedTxns.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
              const digitalCount = paymentTransactions.filter(t => t.format_type === "digital").length;
              const printCount = paymentTransactions.filter(t => t.format_type === "print_hardcover").length;

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-400 font-medium">Total Captured Volume</span>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      ₹{totalCapturedAmount.toLocaleString("en-IN")}
                    </h3>
                    <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                      {capturedTxns.length} Successful checkouts
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-400 font-medium">Digital PDF Editions</span>
                    <h3 className="text-2xl font-bold text-blue-700 mt-1">{digitalCount}</h3>
                    <span className="text-[11px] text-gray-400 mt-1 block">Instant high-res downloads</span>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-400 font-medium">Hardcover Keepsakes</span>
                    <h3 className="text-2xl font-bold text-amber-700 mt-1">{printCount}</h3>
                    <span className="text-[11px] text-gray-400 mt-1 block">Printed heirloom books</span>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
                    <span className="text-xs text-gray-400 font-medium">Gateway Success Rate</span>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                      {paymentTransactions.length > 0
                        ? `${Math.round((capturedTxns.length / paymentTransactions.length) * 100)}%`
                        : "100%"}
                    </h3>
                    <span className="text-[11px] text-gray-400 mt-1 block">Razorpay Checkout SDK</span>
                  </div>
                </div>
              );
            })()}

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100/80 shadow-xs flex flex-col md:flex-row items-center gap-4 justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by customer, payment ID, or title..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-medium">
                {["all", "captured", "created", "failed"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPaymentStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-full transition capitalize shrink-0 ${paymentStatusFilter === st
                      ? "bg-[#C98A84] text-white font-semibold"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                  >
                    {st === "all" ? "All Transactions" : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-2xl shadow-xs border border-gray-100/80 overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs shadow-xs border-b border-gray-100">
                    <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-500 tracking-wider uppercase">
                      <th className="py-4 px-6 font-semibold bg-white">TRANSACTION / PAYMENT ID</th>
                      <th className="py-4 px-6 font-semibold bg-white">CUSTOMER</th>
                      <th className="py-4 px-6 font-semibold bg-white">STORY</th>
                      <th className="py-4 px-6 font-semibold bg-white">EDITION</th>
                      <th className="py-4 px-6 font-semibold bg-white">AMOUNT</th>
                      <th className="py-4 px-6 font-semibold bg-white">STATUS</th>
                      <th className="py-4 px-6 font-semibold bg-white">DATE & TIME</th>
                      <th className="py-4 px-6 font-semibold text-right bg-white">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/80 text-sm">
                    {(() => {
                      const filtered = paymentTransactions.filter((txn) => {
                        const searchLower = paymentSearch.toLowerCase();
                        const matchesSearch =
                          !paymentSearch ||
                          (txn.id && txn.id.toLowerCase().includes(searchLower)) ||
                          (txn.razorpay_payment_id && txn.razorpay_payment_id.toLowerCase().includes(searchLower)) ||
                          (txn.customer_name && txn.customer_name.toLowerCase().includes(searchLower)) ||
                          (txn.customer_email && txn.customer_email.toLowerCase().includes(searchLower)) ||
                          (txn.story_title && txn.story_title.toLowerCase().includes(searchLower)) ||
                          (txn.child_name && txn.child_name.toLowerCase().includes(searchLower));

                        const matchesStatus =
                          paymentStatusFilter === "all" ||
                          txn.status?.toLowerCase() === paymentStatusFilter.toLowerCase();

                        return matchesSearch && matchesStatus;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-gray-400 text-xs">
                              {loadingPayments
                                ? "Loading transactions..."
                                : "No payment transactions found matching criteria."}
                            </td>
                          </tr>
                        );
                      }

                      return filtered
                        .slice((paymentPage - 1) * ITEMS_PER_PAGE, paymentPage * ITEMS_PER_PAGE)
                        .map((txn) => {
                          const isCaptured = txn.status?.toLowerCase() === "captured";
                          const isFailed = txn.status?.toLowerCase() === "failed";
                          const createdDate = txn.created_at ? new Date(txn.created_at) : null;
                          const dateFormatted = createdDate
                            ? createdDate.toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                            : "Recently";

                          return (
                            <tr key={txn.id} className="hover:bg-gray-50/60 transition-colors text-xs">
                              <td className="py-4 px-6 font-medium text-gray-800">
                                <div className="font-mono text-gray-900 font-semibold">{txn.razorpay_payment_id || "Awaiting Payment"}</div>
                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                  Ref: {txn.order_number || txn.razorpay_order_id || txn.id.substring(0, 12)}
                                </div>
                              </td>

                              <td className="py-4 px-6">
                                <div className="font-semibold text-gray-900">{txn.customer_name || "Valued Customer"}</div>
                                {txn.customer_email && (
                                  <div className="text-[11px] text-gray-400">{txn.customer_email}</div>
                                )}
                              </td>

                              <td className="py-4 px-6 text-gray-700">
                                <div className="font-medium text-gray-900">{txn.story_title || "Personalized Story"}</div>
                                {txn.child_name && (
                                  <div className="text-[11px] text-[#B87A74] font-medium">For: {txn.child_name}</div>
                                )}
                              </td>

                              <td className="py-4 px-6">
                                {txn.format_type === "digital" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <BookOpen className="w-3 h-3 text-blue-600" />
                                    <span>Digital PDF</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                    <Package className="w-3 h-3 text-amber-600" />
                                    <span>Hardcover Keepsake</span>
                                  </span>
                                )}
                              </td>

                              <td className="py-4 px-6 font-bold text-gray-900 text-sm">
                                ₹{Number(txn.amount || 0).toLocaleString("en-IN")}
                              </td>

                              <td className="py-4 px-6">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${isCaptured
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : isFailed
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : "bg-gray-100 text-gray-600 border border-gray-200"
                                    }`}
                                >
                                  {isCaptured && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                                  <span>{txn.status || "created"}</span>
                                </span>
                              </td>

                              <td className="py-4 px-6 text-gray-500 text-[11px]">
                                {dateFormatted}
                              </td>

                              <td className="py-4 px-6 text-right">
                                {txn.razorpay_payment_id && !txn.razorpay_payment_id.startsWith("pay_test_") ? (
                                  <a
                                    href={`https://dashboard.razorpay.com/app/payments/${txn.razorpay_payment_id}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-[#FAEEED] text-gray-700 hover:text-[#C98A84] text-[11px] font-semibold transition"
                                    title="View on Razorpay Dashboard"
                                  >
                                    <span>Razorpay</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-[11px] text-gray-400 font-mono">Sandbox Log</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                    })()}
                  </tbody>
                </table>
              </div>
              <AdminTablePagination
                currentPage={paymentPage}
                totalItems={
                  paymentTransactions.filter((txn) => {
                    const searchLower = paymentSearch.toLowerCase();
                    const matchesSearch =
                      !paymentSearch ||
                      (txn.id && txn.id.toLowerCase().includes(searchLower)) ||
                      (txn.razorpay_payment_id && txn.razorpay_payment_id.toLowerCase().includes(searchLower)) ||
                      (txn.customer_name && txn.customer_name.toLowerCase().includes(searchLower)) ||
                      (txn.customer_email && txn.customer_email.toLowerCase().includes(searchLower)) ||
                      (txn.story_title && txn.story_title.toLowerCase().includes(searchLower)) ||
                      (txn.child_name && txn.child_name.toLowerCase().includes(searchLower));

                    const matchesStatus =
                      paymentStatusFilter === "all" ||
                      txn.status?.toLowerCase() === paymentStatusFilter.toLowerCase();

                    return matchesSearch && matchesStatus;
                  }).length
                }
                pageSize={ITEMS_PER_PAGE}
                onPageChange={setPaymentPage}
              />
            </div>
          </div>
        )}

        {/* TAB 3: PREVIEWS & PERSONALIZATION JOBS (Matching Reference Image) */}
        {activeTab === "previews" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bar Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#111827]">
                  Previews
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Every generated book session. Download the complete 8×8 RGB print PDF with all pages, or inspect generated plates.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Filter Pills: All | Purchased */}
                <div className="inline-flex items-center bg-gray-100/60 p-1 rounded-xl border border-gray-200/60 gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("all")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${previewFilter === "all"
                      ? "bg-[#C98A84] text-white shadow-xs"
                      : "bg-transparent text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter("purchased")}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${previewFilter === "purchased"
                      ? "bg-[#C98A84] text-white shadow-xs"
                      : "bg-transparent text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    Purchased
                  </button>
                </div>
              </div>
            </div>

            {/* Table Container matching screenshot */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs shadow-xs border-b border-gray-100">
                    <tr className="border-b border-gray-100">
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white">
                        CHILD
                      </th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white">
                        STORY
                      </th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white">
                        STATUS
                      </th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white">
                        PAGES
                      </th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white">
                        CREATED
                      </th>
                      <th className="py-4 px-6 text-[11px] font-bold text-gray-500 uppercase tracking-wider bg-white">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredJobs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 text-xs">
                          No preview sessions found matching this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredJobs
                        .slice((previewPage - 1) * ITEMS_PER_PAGE, previewPage * ITEMS_PER_PAGE)
                        .map((job) => {
                          const isRendering =
                            job.status?.toLowerCase().includes("rendering") ||
                            job.status === "processing" ||
                            job.status === "in_progress";
                          const isCompleted =
                            job.status?.toLowerCase() === "completed" ||
                            job.status?.toLowerCase().includes("complete");

                          return (
                            <tr
                              key={job.id}
                              className="hover:bg-gray-50/60 transition duration-150 group"
                            >
                              {/* CHILD */}
                              <td className="py-4 px-6">
                                <span className="font-bold text-gray-900 text-sm">
                                  {job.child_name || "Child"}
                                </span>
                              </td>

                              {/* STORY */}
                              <td className="py-4 px-6">
                                <span className="text-xs text-gray-500 font-medium">
                                  {job.story_title || "Personalized Story"}
                                </span>
                              </td>

                              {/* STATUS */}
                              <td className="py-4 px-6">
                                {isRendering ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-semibold text-gray-800">
                                      Rendering
                                    </span>
                                    <span className="text-gray-400 text-xs font-medium">·</span>
                                    <span className="text-xs font-semibold text-[#C98A84]">
                                      {job.status.includes("%") ? job.status.split("·")[1]?.trim() || "In progress" : (job.completed_pages && job.total_pages ? `${Math.round((job.completed_pages / job.total_pages) * 100)}%` : "In progress")}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#C98A84] animate-pulse" />
                                  </div>
                                ) : job.status === "interrupted" ? (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="Generation was paused due to server reload. Click Print PDF to resume and complete all pages.">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span>Incomplete ({job.completed_pages || 0}/{job.total_pages || 26})</span>
                                  </div>
                                ) : (
                                  <span className="text-xs font-medium text-gray-700">
                                    {isCompleted ? "Completed" : job.status}
                                  </span>
                                )}
                              </td>

                              {/* PAGES */}
                              <td className="py-4 px-6">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-semibold text-gray-800">
                                    All {job.total_pages && job.total_pages > 5 ? job.total_pages : 24} pages
                                  </span>
                                  {job.current_stage && job.current_stage.toLowerCase().includes("downloaded by customer") ? (
                                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1" title={job.current_stage}>
                                      <Check className="w-3 h-3 text-emerald-600 inline shrink-0" />
                                      <span>{job.current_stage}</span>
                                    </span>
                                  ) : (job.completed_pages && job.completed_pages >= (job.total_pages && job.total_pages > 5 ? job.total_pages : 24)) ? (
                                    <span className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 text-purple-600 inline shrink-0" />
                                      <span>All {job.completed_pages} pages ready</span>
                                    </span>
                                  ) : job.is_paid ? (
                                    <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                      <span>Generating ({job.completed_pages || 0}/{job.total_pages && job.total_pages > 5 ? job.total_pages : 24} pages)</span>
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-gray-400 font-normal">
                                      {job.completed_pages || 3} free preview
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* CREATED */}
                              <td className="py-4 px-6">
                                <span className="text-xs text-gray-400 font-normal whitespace-nowrap">
                                  {formatAdminTimestamp(job.created_at, job.created_formatted)}
                                </span>
                              </td>

                              {/* ACTIONS: [ ⤓ PDF ] [ 🖼 Photos ] [ ↗ View ] */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  {/* PDF Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(job, "print")}
                                    title="Download complete print-ready PDF (All pages • 8×8 RGB)"
                                    className="px-2.5 py-1.5 rounded-lg border border-[#C98A84]/40 text-[#C98A84] hover:bg-[#FAEEED] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Print PDF</span>
                                  </button>

                                  {/* Download Cover Page Button - ONLY for Hard Copy orders after personalization is generated */}
                                  {(job.format_type === "print_hardcover" || job.format_type === "hardcover" || (job as any).is_hardcover) && (job.status === "completed" || (job.completed_pages || 0) >= 24) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadCover(job)}
                                      title="Download Hard Copy Cover Page Wrap (46.6×27.6 cm with 3mm bleed • Front + Spine + Back)"
                                      className="px-2.5 py-1.5 rounded-lg border border-[#8B3DFF]/40 text-[#8B3DFF] hover:bg-[#8B3DFF]/10 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>Cover Page</span>
                                    </button>
                                  )}

                                  {/* Photos Button */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedJobForPhotos(job)}
                                    title="View uploaded child reference photo & generated plates"
                                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5 text-gray-500" />
                                    <span>Photos</span>
                                  </button>

                                  {/* View Button */}
                                  <a
                                    href={`/personalize/${job.story_slug || ""}?job_id=${job.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open book preview player in new tab"
                                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer inline-flex"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
                                    <span>View</span>
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
              <AdminTablePagination
                currentPage={previewPage}
                totalItems={filteredJobs.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={setPreviewPage}
              />
            </div>
          </div>
        )}

        {/* TAB 4: STORIES MANAGER (Matching reference design) */}
        {activeTab === "stories" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Bar matching screenshot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Story Library</h1>
                <p className="text-xs text-gray-500 mt-1">Manage, publish, and author personalized storybooks for children.</p>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-500 tracking-tight">
                  {stories.filter((s) => s.status === "published").length}/{stories.length} live
                </span>
                <button
                  onClick={() => {
                    setShowNewBookModal(true);
                    setBookError("");
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-semibold text-xs sm:text-sm shadow-md shadow-[#C98A84]/25 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>New book</span>
                </button>
              </div>
            </div>

            {/* HERO CAROUSEL CURATION BANNER (Max 5 Slides) */}
            {(() => {
              const carouselStories = stories.filter((s) => s.in_hero_carousel);
              return (
                <div className="bg-gradient-to-r from-rose-50/80 via-white to-amber-50/60 p-5 rounded-3xl border border-[#C98A84]/25 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#C98A84]/15 text-[#C98A84] flex items-center justify-center shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-gray-900">Homepage Hero Carousel</h2>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${carouselStories.length === 5
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : carouselStories.length > 0
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                              }`}
                          >
                            {carouselStories.length} / 5 slides selected
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {carouselStories.length === 0
                            ? "No custom slides chosen yet. Homepage is showing the 5 newest stories automatically. Click '+ Add to Carousel' on any story below to curate."
                            : carouselStories.length === 5
                              ? "Maximum capacity reached (5 slides). To add another story, remove one of the slides below."
                              : `You can select up to ${5 - carouselStories.length} more stories for the hero slider.`}
                        </p>
                      </div>
                    </div>

                    <a
                      href="/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 shadow-2xs transition shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                      <span>Preview Homepage</span>
                    </a>
                  </div>

                  {/* Horizontal slides tray */}
                  {carouselStories.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                      {carouselStories.map((story, idx) => (
                        <div
                          key={story.id}
                          className="bg-white rounded-2xl p-2.5 border border-gray-200 shadow-xs relative group flex flex-col justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-12 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                              {story.cover_image_url ? (
                                <img
                                  src={story.cover_image_url}
                                  alt={story.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                                  <BookOpen className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                                Slide #{idx + 1}
                              </span>
                              <h4 className="text-xs font-bold text-gray-900 truncate" title={story.title}>
                                {isLogoStory(story) ? "Brand Logo" : story.title}
                              </h4>
                              {isLogoStory(story) ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-700">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" /> Brand Slide
                                </span>
                              ) : story.highlight === "latest" ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#C98A84]">
                                  <Sparkles className="w-2.5 h-2.5" /> Latest
                                </span>
                              ) : story.highlight === "best_seller" ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Best Seller
                                </span>
                              ) : story.highlight === "popular" ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-700">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" /> Popular
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-400">Standard</span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleHeroCarousel(story)}
                            className="mt-2 w-full py-1 rounded-lg border border-gray-200 bg-gray-50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-[10px] font-semibold text-gray-600 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Remove from Hero Carousel"
                          >
                            <X className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ))}

                      {/* Empty slots placeholders up to 5 */}
                      {Array.from({ length: Math.max(0, 5 - carouselStories.length) }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          className="rounded-2xl border-2 border-dashed border-gray-200 p-3 flex flex-col items-center justify-center text-center min-h-[92px] bg-white/40"
                        >
                          <Plus className="w-4 h-4 text-gray-300 mb-1" />
                          <span className="text-[10px] font-semibold text-gray-400">Empty Slot</span>
                          <span className="text-[9px] text-gray-400">Add from books below</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={storySearch}
                  onChange={(e) => setStorySearch(e.target.value)}
                  placeholder="Search books by title, theme, or category..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {["all", "ADVENTURE", "LEARNING", "BEDTIME", "FANTASY"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setStoryCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${storyCategoryFilter === cat
                      ? "bg-[#C98A84] text-white shadow-xs"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-100"
                      }`}
                  >
                    {cat === "all" ? "All Categories" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Stories Grid matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stories
                .filter((story) => {
                  const matchesSearch =
                    !storySearch ||
                    story.title.toLowerCase().includes(storySearch.toLowerCase()) ||
                    (story.category && story.category.toLowerCase().includes(storySearch.toLowerCase())) ||
                    (story.description && story.description.toLowerCase().includes(storySearch.toLowerCase()));

                  const matchesCategory =
                    storyCategoryFilter === "all" ||
                    (story.category && story.category.toUpperCase() === storyCategoryFilter.toUpperCase());

                  const matchesStatus =
                    storyStatusFilter === "all" ||
                    (storyStatusFilter === "live" && story.status === "published") ||
                    (storyStatusFilter === "hidden" && story.status !== "published");

                  return matchesSearch && matchesCategory && matchesStatus;
                })
                .map((story) => (
                  <div
                    key={story.id}
                    className="bg-white rounded-3xl p-4 border border-gray-100 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                  >
                    {/* Top Cover area */}
                    <div className="space-y-3">
                      <div className="relative aspect-[4/5] rounded-2xl bg-gray-100 overflow-hidden border border-gray-100">
                        {/* Category Badge on top left of image */}
                        <span className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded shadow-xs">
                          {story.category || "ADVENTURE"}
                        </span>

                        {/* Top-right badges */}
                        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                          {story.in_hero_carousel && (
                            <span className="bg-[#C98A84] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5" />
                              Hero Slide
                            </span>
                          )}
                          {story.highlight === "latest" && (
                            <span className="bg-white/95 text-[#C98A84] border border-[#C98A84]/40 text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Latest
                            </span>
                          )}
                          {story.highlight === "best_seller" && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              Best Seller
                            </span>
                          )}
                          {story.highlight === "popular" && (
                            <span className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Popular
                            </span>
                          )}
                        </div>

                        {story.cover_image_url ? (
                          <img
                            src={story.cover_image_url}
                            alt={story.title}
                            className="w-full h-full object-cover group-hover:scale-102 transition duration-300"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : null}

                        {/* Fallback placeholder when no cover or image error */}
                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#FAEEED] via-white to-pink-50">
                          <BookOpen className="w-10 h-10 text-[#C98A84]/40 mb-2" />
                          <span className="text-xs font-bold text-gray-700 line-clamp-2">{story.title}</span>
                          <span className="text-[10px] text-gray-400 mt-1">Author front cover page</span>
                        </div>
                      </div>

                      {/* Book Info */}
                      <div className="space-y-1">
                        <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1">{story.title}</h3>
                        <p className="text-xs text-gray-500 font-medium">
                          {story.age_range || "Ages 3-7"} · ₹{story.price_digital ? Math.round(story.price_digital).toLocaleString("en-IN") : Math.round(settingDefaultPdfPrice).toLocaleString("en-IN")} / ₹{story.price_print ? Math.round(story.price_print).toLocaleString("en-IN") : Math.round(settingDefaultHardcoverPrice).toLocaleString("en-IN")}
                        </p>
                        <div className="flex items-center justify-between pt-0.5">
                          <button
                            onClick={() => handleOpenEditAge(story)}
                            className="text-xs font-semibold text-[#C98A84] hover:text-[#B87A74] hover:underline cursor-pointer"
                          >
                            Edit age & pricing
                          </button>
                        </div>

                        {/* Quick Hero Carousel & Highlight Controls */}
                        <div className="pt-2 mt-1.5 border-t border-gray-100 space-y-2">
                          {/* Carousel Switch */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-gray-600 flex items-center gap-1">
                              <Layers className="w-3 h-3 text-[#C98A84]" />
                              Hero Carousel:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleHeroCarousel(story)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer ${story.in_hero_carousel
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-rose-50 hover:text-[#C98A84] hover:border-[#C98A84]/40"
                                }`}
                            >
                              {story.in_hero_carousel ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>In Carousel</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Add to Carousel</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Highlight Badge Buttons */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-gray-600">Badge:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSetHighlight(story, null)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition cursor-pointer ${!story.highlight
                                  ? "bg-gray-800 text-white"
                                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                  }`}
                                title="No highlight badge"
                              >
                                None
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetHighlight(story, "latest")}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer ${story.highlight === "latest"
                                  ? "bg-[#C98A84] text-white shadow-2xs"
                                  : "bg-gray-100 text-gray-600 hover:bg-[#FAEEED] hover:text-[#C98A84]"
                                  }`}
                                title="Mark as Latest"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                Latest
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetHighlight(story, "best_seller")}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition flex items-center gap-1 cursor-pointer ${story.highlight === "best_seller"
                                  ? "bg-amber-500 text-white shadow-2xs"
                                  : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                                  }`}
                                title="Mark as Best Seller"
                              >
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Best Seller
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Footer Actions */}
                    <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between gap-1.5">
                      {/* Live / Hidden Badge */}
                      <div>
                        {story.status === "published" ? (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                            <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                            Hidden
                          </span>
                        )}
                      </div>

                      {/* Buttons: Hide/Publish, Delete */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleToggleStatus(story)}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition cursor-pointer"
                        >
                          {story.status === "published" ? "Hide" : "Publish"}
                        </button>
                        <button
                          onClick={() => handleDeleteStory(story)}
                          title="Delete story"
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {stories.length === 0 && (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="font-bold text-gray-800 text-base">No books in library</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Click "+ New book" to create your first storybook.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: STORY PAGE EDITOR (CMS) */}
        {activeTab === "page_editor" && selectedStory && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Notification Toast */}
            {editorNotice && (
              <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-gray-900/90 text-white shadow-xl backdrop-blur-md flex items-center gap-3 text-xs animate-in slide-in-from-top-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{editorNotice}</span>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={baseArtFileRef}
              onChange={handleReplaceBaseArt}
              accept="image/*"
              className="hidden"
            />

            {/* 1. Header Bar with CMS Title, Actions, and Book Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-[28px] font-extrabold tracking-tight text-[#111827]">
                  Page Editor (CMS)
                </h2>
              </div>

              {/* Actions & Book Dropdown */}
              <div className="flex items-center gap-2.5">
                {/* Upload Cover Page Option Button */}
                <button
                  type="button"
                  onClick={() => coverPageFileInputRef.current?.click()}
                  disabled={uploadingCoverPage}
                  title="Upload Hard Copy / Hardcover wrap cover spread"
                  className="px-3.5 py-2 rounded-xl bg-[#C98A84] text-white hover:bg-[#B87A74] font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingCoverPage ? "Uploading..." : "Upload Cover Page"}</span>
                </button>
                <input
                  type="file"
                  ref={coverPageFileInputRef}
                  accept="image/*"
                  onChange={handleCoverPageUpload}
                  className="hidden"
                />

                {/* Book Dropdown */}
                <div className="relative">
                  <select
                    value={selectedStory.id}
                    onChange={(e) => handleSelectStory(e.target.value)}
                    className="appearance-none pl-4 pr-9 py-2 rounded-xl border border-gray-200 bg-white font-bold text-xs text-gray-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] cursor-pointer"
                  >
                    {stories.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* 2. Availability Strip (Target Gender & Age Range) */}
            <div className="bg-white rounded-2xl border border-gray-200/70 p-3.5 px-5 flex flex-wrap items-center justify-between gap-4 text-xs shadow-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span className="font-semibold text-gray-700">Available for</span>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={targetGender === "boy"}
                    onChange={(e) => {
                      const val = e.target.checked ? "boy" : "both";
                      setTargetGender(val);
                      if (val === "boy") setSelectedGender("boy");
                      handleSaveAvailability(val, bookMinAge, bookMaxAge);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#C98A84] focus:ring-[#C98A84] cursor-pointer"
                  />
                  <span>Boy Only</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={targetGender === "girl"}
                    onChange={(e) => {
                      const val = e.target.checked ? "girl" : "both";
                      setTargetGender(val);
                      if (val === "girl") setSelectedGender("girl");
                      handleSaveAvailability(val, bookMinAge, bookMaxAge);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#C98A84] focus:ring-[#C98A84] cursor-pointer"
                  />
                  <span>Girl Only</span>
                </label>

                <span className="text-gray-400 italic text-[11px]">
                  {targetGender === "boy"
                    ? "✓ Exclusively available for boys on the storefront."
                    : targetGender === "girl"
                      ? "✓ Exclusively available for girls on the storefront."
                      : "Neither ticked — offered for both boys and girls."}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">Ages</span>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={bookMinAge}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(18, Number(e.target.value) || 1));
                    setBookMinAge(v);
                    const safeMax = Math.max(v, bookMaxAge);
                    if (safeMax !== bookMaxAge) setBookMaxAge(safeMax);
                    handleSaveAvailability(targetGender, v, safeMax);
                  }}
                  className="w-12 px-2 py-1 text-center rounded-lg border border-gray-200 bg-white font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
                <span className="text-gray-500 font-medium">to</span>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={bookMaxAge}
                  onChange={(e) => {
                    const v = Math.max(1, Math.min(18, Number(e.target.value) || 1));
                    setBookMaxAge(v);
                    const safeMin = Math.min(v, bookMinAge);
                    if (safeMin !== bookMinAge) setBookMinAge(safeMin);
                    handleSaveAvailability(targetGender, safeMin, v);
                  }}
                  className="w-12 px-2 py-1 text-center rounded-lg border border-gray-200 bg-white font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />

                <span className="px-2.5 py-1 rounded-full bg-[#C98A84] text-white font-bold text-[10px] uppercase tracking-wide">
                  Saved
                </span>

                <span className="text-gray-400 text-[11px] ml-1">
                  shown on the storefront as &quot;Ages {bookMinAge}-{bookMaxAge}&quot;
                </span>
              </div>
            </div>

            {/* 3. Pages Navigation Strip */}
            <div className="space-y-3">
              {/* Horizontal Page Pills Strip */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedStory.pages?.map((p, idx) => {
                  const isFrontCover = idx === 0;
                  const isBackCover = idx === (selectedStory.pages?.length || 1) - 1 && (selectedStory.pages?.length || 0) > 1;
                  const label = isFrontCover ? "Front Cover" : isBackCover ? "Back Cover" : `${idx}`;
                  const isPill = isFrontCover || isBackCover;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setIsViewingCoverSpread(false);
                        handleSelectPage(idx);
                      }}
                      className={`h-9 ${isPill ? "px-3" : "w-9"} rounded-xl font-bold text-xs flex items-center justify-center transition-all ${!isViewingCoverSpread && selectedPageIndex === idx
                        ? "bg-[#C98A84] text-white shadow-sm ring-2 ring-[#C98A84]/20"
                        : "bg-white border border-gray-200 hover:border-[#C98A84]/40 text-gray-700 hover:bg-[#FAEEED]/30"
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}

                {/* Hard Copy Cover Page Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedStory.hardcover_cover_image_url) {
                      coverPageFileInputRef.current?.click();
                    } else {
                      setIsViewingCoverSpread(true);
                    }
                  }}
                  title={selectedStory.hardcover_cover_image_url ? "View & manage Hard Copy Cover Page" : "Upload Hard Copy Cover Page"}
                  className={`h-9 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${isViewingCoverSpread
                    ? "bg-[#8B3DFF] text-white shadow-sm ring-2 ring-[#8B3DFF]/20"
                    : selectedStory.hardcover_cover_image_url
                      ? "bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100"
                      : "bg-white border border-dashed border-[#8B3DFF] text-[#8B3DFF] hover:bg-[#8B3DFF]/10"
                    }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Cover Page</span>
                </button>

                {/* Action Button: Add Page (+ only) */}
                <button
                  type="button"
                  onClick={() => handleAddPage("story")}
                  title="Add new story page"
                  className="h-9 px-3 rounded-xl border border-dashed border-[#C98A84] bg-white text-[#C98A84] hover:bg-[#FAEEED] text-xs font-bold flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* 4. Two-Column Editor Layout: Cover Page Wrap Spread View */}
            {isViewingCoverSpread && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-150">
                {/* LEFT COLUMN: Cover Page Controls */}
                <div className="lg:col-span-6 bg-white p-7 rounded-3xl border border-gray-100 shadow-xs space-y-6 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500">Role:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold text-xs flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Cover Page (Hard Copy Wrap Spread)</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsViewingCoverSpread(false)}
                      className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                    >
                      ← Back to Story Pages
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAEEED]/40 border border-[#EBE3D9] space-y-2">
                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <span>📖</span>
                      <span>Hardcover Wrap-around Cover Specification</span>
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-xs">
                      This wide spread contains the <strong>Back Cover</strong>, <strong>Book Spine</strong>, and <strong>Front Cover</strong>.
                      When customers choose the physical <strong>Hard Copy Keepsake</strong> edition, both character illustrations are automatically personalized with the child&apos;s real face.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <label className="block font-bold text-gray-800">
                      Cover Page Spread Artwork
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => coverPageFileInputRef.current?.click()}
                        disabled={uploadingCoverPage}
                        className="flex-1 py-3 px-4 rounded-xl border border-dashed border-[#8B3DFF] text-[#8B3DFF] hover:bg-purple-50 font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{uploadingCoverPage ? "Uploading..." : selectedStory.hardcover_cover_image_url ? "Replace Cover Page" : "Upload Cover Page"}</span>
                      </button>

                      {selectedStory.hardcover_cover_image_url && (
                        <button
                          type="button"
                          onClick={handleAutoTraceCoverPage}
                          disabled={autoTracingCover}
                          className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>{autoTracingCover ? "Tracing..." : "Auto-trace Face(s)"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Detected Faces Status */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="block font-bold text-gray-800">
                      Character Face Personalization
                    </label>
                    {(() => {
                      let faceCount = 0;
                      if (selectedStory.hardcover_cover_face_points) {
                        try {
                          const pts = JSON.parse(selectedStory.hardcover_cover_face_points);
                          if (Array.isArray(pts)) faceCount = pts.length;
                        } catch (e) { }
                      }
                      if (faceCount > 0) {
                        return (
                          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span>{faceCount} Character Face{faceCount > 1 ? "s" : ""} Detected &amp; Ready for Personalization</span>
                            </div>
                            <p className="text-[11px] text-emerald-700">
                              Both front and back cover child characters will be seamlessly personalized when ordering hard copies.
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                          <p className="text-xs font-semibold">No face coordinates set yet.</p>
                          <p className="text-[11px] text-amber-700">
                            Click <strong>Auto-trace Face(s)</strong> above to detect character positions automatically using YuNet deep learning.
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* RIGHT COLUMN: Live Canvas Preview of Cover Spread */}
                <div className="lg:col-span-6 bg-white p-7 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h4 className="font-bold text-gray-800 text-xs">
                      Live Cover Spread Canvas (Back Cover • Spine • Front Cover)
                    </h4>
                    <span className="text-[11px] text-gray-400">Wraparound Hardcover Plate</span>
                  </div>

                  <div className="relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50 flex items-center justify-center min-h-[280px]">
                    {selectedStory.hardcover_cover_image_url ? (
                      <>
                        <img
                          src={selectedStory.hardcover_cover_image_url}
                          alt={`${selectedStory.title} Cover Page Spread`}
                          className="w-full h-auto object-contain block pointer-events-none"
                        />
                        {/* Overlay SVG for detected faces */}
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none z-20"
                        >
                          {(() => {
                            if (!selectedStory.hardcover_cover_face_points) return null;
                            try {
                              const multiPts = JSON.parse(selectedStory.hardcover_cover_face_points);
                              if (Array.isArray(multiPts)) {
                                return multiPts.map((pts: any[], idx: number) => {
                                  if (!Array.isArray(pts) || pts.length < 2) return null;
                                  return (
                                    <polygon
                                      key={idx}
                                      points={pts.map((pt) => `${pt[0]},${pt[1]}`).join(" ")}
                                      fill="rgba(139, 61, 255, 0.25)"
                                      stroke="#8B3DFF"
                                      strokeWidth="2"
                                      vectorEffect="non-scaling-stroke"
                                      strokeLinejoin="round"
                                      strokeLinecap="round"
                                    />
                                  );
                                });
                              }
                            } catch (e) {
                              return null;
                            }
                          })()}
                        </svg>
                      </>
                    ) : (
                      <div className="p-12 text-center space-y-3">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
                        <h4 className="font-bold text-gray-700 text-sm">No Cover Page Uploaded</h4>
                        <p className="text-xs text-gray-400 max-w-xs mx-auto">
                          Upload the wrap cover spread image (like the reference sample) for this book.
                        </p>
                        <button
                          type="button"
                          onClick={() => coverPageFileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-[#8B3DFF] text-white hover:bg-[#7828F7] font-bold text-xs shadow-xs transition cursor-pointer"
                        >
                          Upload Cover Page
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. Two-Column Editor Layout (Left: Form Controls, Right: Live Canvas Preview) */}
            {!isViewingCoverSpread && activePage && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* LEFT COLUMN: Controls & Typography Form */}
                <div className="lg:col-span-7 bg-white p-7 rounded-3xl border border-gray-100 shadow-xs space-y-5 text-xs">
                  {/* Role Header & Cover Action Buttons (Matching reference Image 2) */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500">Role:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-gray-100 font-bold text-gray-700 text-xs">
                        {selectedPageIndex === 0
                          ? "Front Cover"
                          : selectedPageIndex === (selectedStory.pages?.length || 1) - 1 && (selectedStory.pages?.length || 0) > 1
                            ? "Back Cover"
                            : `Story Page ${selectedPageIndex}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedPageIndex !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleMakeCover("front_cover")}
                          className="px-3.5 py-1.5 rounded-xl border border-[#C98A84] bg-white text-[#C98A84] hover:bg-[#FAEEED] font-bold text-xs transition shadow-xs cursor-pointer"
                        >
                          Make Front Cover
                        </button>
                      )}

                      {selectedPageIndex !== (selectedStory.pages?.length || 1) - 1 && (selectedStory.pages?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => handleMakeCover("back_cover")}
                          className="px-3.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:border-[#C98A84] hover:text-[#C98A84] hover:bg-[#FAEEED] font-semibold text-xs transition shadow-xs cursor-pointer"
                        >
                          Make Back Cover
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Page Number */}
                  <div>
                    <label className="block font-bold text-gray-800 mb-1.5">Page number</label>
                    <input
                      type="number"
                      value={pageNumberInput}
                      onChange={(e) => setPageNumberInput(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/60 font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                    />
                  </div>

                  {/* Base Illustration */}
                  <div>
                    <label className="block font-bold text-gray-800 mb-1.5">
                      Base illustration (the fixed scene; child&apos;s face is inpainted in)
                    </label>
                    <div>
                      <button
                        type="button"
                        onClick={() => baseArtFileRef.current?.click()}
                        disabled={uploadingBaseArt}
                        className="w-full py-3 px-4 rounded-xl border border-dashed border-[#C98A84] text-[#C98A84] hover:bg-[#FAEEED] font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span>{uploadingBaseArt ? "Uploading..." : "Replace base art"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Face outline Trace Controls */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-gray-800">
                        Face outline — TRACE around the face on the preview
                      </label>
                      {facePoints.length > 0 ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1 text-xs">
                          Outline set ({facePoints.length} points) ✓
                        </span>
                      ) : (
                        <span className="text-gray-500 font-medium text-xs">
                          No outline (Base illustration will be preserved as-is)
                        </span>
                      )}
                    </div>

                    {/* Auto-trace & Outline Action Buttons on the same line */}
                    <div className="p-3.5 rounded-2xl border border-[#EBE3D9] bg-[#FAEEED]/30">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleAutoTracePage}
                          disabled={autoTracing}
                          className="px-4 py-2 rounded-xl border border-[#C98A84] bg-white text-[#C98A84] hover:bg-[#FAEEED] font-bold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {autoTracing ? "Tracing with SAM3..." : "Auto-trace this page"}
                        </button>

                        <button
                          type="button"
                          onClick={handleAutoTraceAll}
                          disabled={autoTracingAll}
                          className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold text-xs transition shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {autoTracingAll ? "Tracing all pages..." : "Trace all untraced pages"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFacePoints([]);
                            setPersonalizationRequired(false);
                          }}
                          className="px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-700 font-semibold text-xs transition shadow-xs cursor-pointer"
                        >
                          Clear outline
                        </button>
                      </div>
                    </div>
                  </div>


                  {/* Story Text / Multilingual Narrative Editor (CMS Multi-Language Translator) */}
                  <div className="space-y-4">
                    {/* Multilingual Translator Bar - Exact match to user specification */}
                    <div className="p-4 bg-gradient-to-r from-[#FAEEED]/70 via-white to-[#FAEEED]/40 rounded-2xl border border-[#EBE3D9] shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Languages className="w-4 h-4 text-[#C98A84]" />
                          <span className="font-bold text-gray-800 text-xs">Story Language:</span>
                          {isTranslatingPage && (
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#C98A84] animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Translating all languages...</span>
                            </span>
                          )}
                        </div>

                        {/* Top Action Buttons: Auto-Translate All & View All */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={handleAutoTranslateAllLanguages}
                            disabled={isTranslatingPage || !pageEditText.trim()}
                            className="px-3 py-1.5 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                            title="Auto-translate English text into all 6 Indian regional languages simultaneously"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Auto-Translate All Languages</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowAllLanguagesView(!showAllLanguagesView)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${showAllLanguagesView
                              ? "bg-[#FAEEED]/70 border-[#C98A84]/40 text-[#C98A84]"
                              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                          >
                            {showAllLanguagesView ? "Hide All-in-One View" : "All Languages View"}
                          </button>
                        </div>
                      </div>

                      {/* Language Selection Pills matching the user reference screenshot */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {CMS_SUPPORTED_LANGUAGES.map((lang) => {
                          const isSelected = selectedEditorLanguage === lang.id;
                          const hasTranslation = lang.id === "english"
                            ? Boolean(pageEditText.trim())
                            : Boolean(pageTranslations[lang.id]?.trim());

                          return (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => setSelectedEditorLanguage(lang.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${isSelected
                                ? "bg-[#C98A84] text-white border-[#C98A84] shadow-xs"
                                : hasTranslation
                                  ? "bg-white hover:bg-[#FAEEED] text-gray-800 border-[#EBE3D9]/60 shadow-xs"
                                  : "bg-white/80 hover:bg-gray-50 text-gray-500 border-gray-200"
                                }`}
                            >
                              <span>{lang.native}</span>
                              {lang.id !== "english" && (
                                <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                                  ({lang.label})
                                </span>
                              )}
                              {hasTranslation && lang.id !== "english" && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-emerald-500"}`}
                                  title="Custom translation saved"
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Language Editor Panel */}
                    {!showAllLanguagesView ? (
                      <div className="space-y-2 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                        {selectedEditorLanguage === "english" ? (
                          <>
                            <div className="flex items-center justify-between">
                              <label className="block font-bold text-gray-800">
                                Story text (English - Master) — use {'{name}'} for child&apos;s name
                              </label>
                              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAEEED] text-[#C98A84] font-bold border border-[#EBE3D9]">
                                Master Language
                              </span>
                            </div>

                            <textarea
                              rows={3}
                              value={pageEditText}
                              onChange={(e) => setPageEditText(e.target.value)}
                              placeholder="Enter narrative text for this page. Use {name} for personalized child name..."
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84]"
                            />

                            <p className="text-[11px] text-gray-500">
                              This is the primary story narrative. Switch to Tamil, Malayalam, Hindi, Marathi, Telugu, or Kannada above to customize or auto-translate for each language.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <label className="font-bold text-gray-800 flex items-center gap-1.5">
                                  <span className="text-sm">{CMS_SUPPORTED_LANGUAGES.find(l => l.id === selectedEditorLanguage)?.native}</span>
                                  <span className="text-gray-500 font-medium">({CMS_SUPPORTED_LANGUAGES.find(l => l.id === selectedEditorLanguage)?.label}) Narrative Translation</span>
                                </label>
                                {pageTranslations[selectedEditorLanguage]?.trim() ? (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                    ✓ Saved in CMS
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                    No translation yet
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleAutoTranslateCurrentLang(selectedEditorLanguage)}
                                  disabled={translatingLang === selectedEditorLanguage || !pageEditText.trim()}
                                  className="px-3 py-1.5 rounded-xl bg-[#FAEEED] hover:bg-[#FAEEED] text-[#C98A84] font-bold text-xs flex items-center gap-1.5 border border-[#EBE3D9] disabled:opacity-50 cursor-pointer shadow-xs transition"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${translatingLang === selectedEditorLanguage ? "animate-spin" : ""}`} />
                                  <span>{translatingLang === selectedEditorLanguage ? "Translating..." : `Auto-translate ${CMS_SUPPORTED_LANGUAGES.find(l => l.id === selectedEditorLanguage)?.label}`}</span>
                                </button>

                                {pageTranslations[selectedEditorLanguage] && (
                                  <button
                                    type="button"
                                    onClick={() => setPageTranslations(prev => {
                                      const copy = { ...prev };
                                      delete copy[selectedEditorLanguage];
                                      return copy;
                                    })}
                                    className="px-2.5 py-1.5 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            </div>

                            <textarea
                              rows={3}
                              value={pageTranslations[selectedEditorLanguage] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPageTranslations(prev => ({
                                  ...prev,
                                  [selectedEditorLanguage]: val
                                }));
                              }}
                              placeholder={`Enter or edit customized narrative in ${CMS_SUPPORTED_LANGUAGES.find(l => l.id === selectedEditorLanguage)?.label}. Click "Auto-translate" above for instant AI translation...`}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84]"
                            />

                            {/* English Reference Card */}
                            {pageEditText.trim() && (
                              <div className="p-3 rounded-xl bg-white border border-gray-200/80 text-xs text-gray-600 space-y-1 shadow-xs">
                                <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block">
                                  English Original Reference:
                                </span>
                                <p className="italic text-gray-800 leading-relaxed font-serif">
                                  &ldquo;{pageEditText}&rdquo;
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      /* ALL-IN-ONE MULTILINGUAL GRID VIEW */
                      <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 max-h-[420px] overflow-y-auto">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                          <span className="font-bold text-gray-800 text-xs">All Languages at a Glance (7)</span>
                          <span className="text-[11px] text-gray-500">Edit translations directly in any box</span>
                        </div>

                        {/* English Card */}
                        <div className="bg-white p-3 rounded-xl border border-[#EBE3D9] space-y-1.5 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                              <span>English (Master)</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FAEEED] text-[#C98A84] font-bold">Default</span>
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            value={pageEditText}
                            onChange={(e) => setPageEditText(e.target.value)}
                            placeholder="English narrative..."
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#C98A84]"
                          />
                        </div>

                        {/* Regional Languages Cards */}
                        {CMS_SUPPORTED_LANGUAGES.filter(l => l.id !== "english").map((lang) => (
                          <div key={lang.id} className="bg-white p-3 rounded-xl border border-gray-200 space-y-1.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                                <span>{lang.native}</span>
                                <span className="text-gray-400 font-normal">({lang.label})</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAutoTranslateCurrentLang(lang.id)}
                                disabled={translatingLang === lang.id || !pageEditText.trim()}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#FAEEED] hover:bg-[#FAEEED] text-[#C98A84] flex items-center gap-1 border border-[#EBE3D9] transition cursor-pointer"
                              >
                                <RefreshCw className={`w-2.5 h-2.5 ${translatingLang === lang.id ? "animate-spin" : ""}`} />
                                <span>Auto</span>
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={pageTranslations[lang.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPageTranslations(prev => ({ ...prev, [lang.id]: val }));
                              }}
                              placeholder={`${lang.label} translation...`}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#C98A84]"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Typography & Position Controls Grid */}
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    {/* Row 1: Text X and Text Y */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-800 mb-1">Text X (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={textX}
                          onChange={(e) => setTextX(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-800 mb-1">Text Y (%)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={textY}
                          onChange={(e) => setTextY(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                        />
                      </div>
                    </div>

                    {/* Row 2: Font Size and Font Color */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-800 mb-1">Font size (px @1024)</label>
                        <input
                          type="number"
                          value={fontSize}
                          onChange={(e) => setFontSize(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-gray-800 mb-1">Font color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={fontColor}
                            onChange={(e) => setFontColor(e.target.value)}
                            className="w-10 h-9 p-0.5 rounded-lg border border-gray-200 cursor-pointer bg-white"
                          />
                          <input
                            type="text"
                            value={fontColor}
                            onChange={(e) => setFontColor(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 font-semibold text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Font Family and Letter Spacing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-gray-800">Font</label>
                        </div>
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                        >
                          <option value="Sans (DejaVu Bold)">Sans (DejaVu Bold)</option>
                          <option value="Serif (Merriweather)">Serif (Merriweather)</option>
                          <option value="Playful (Fredoka)">Playful (Fredoka)</option>
                          <option value="Handwritten (Caveat)">Handwritten (Caveat)</option>
                          <option value="Comic (Balsamiq Sans)">Comic (Balsamiq Sans)</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => alert("Font upload feature: standard OpenType / TrueType font uploaded to studio fonts.")}
                          className="text-[11px] text-[#C98A84] hover:underline font-semibold mt-1 block"
                        >
                          + Add your own font
                        </button>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-800 mb-1">Letter spacing (px @1024)</label>
                        <input
                          type="number"
                          value={letterSpacing}
                          onChange={(e) => setLetterSpacing(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                        />
                      </div>
                    </div>

                    {/* Row 4: Stroke colour and Stroke / outline */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-800 mb-1">Stroke colour</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="w-10 h-9 p-0.5 rounded-lg border border-gray-200 cursor-pointer bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setStrokeColor("#FFFFFF")}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-bold text-[11px] hover:bg-gray-50"
                          >
                            Auto
                          </button>
                          <label className="flex items-center gap-1.5 cursor-pointer ml-1 select-none">
                            <input
                              type="checkbox"
                              checked={hasShadow}
                              onChange={(e) => setHasShadow(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-[#C98A84] focus:ring-[#C98A84]"
                            />
                            <span className="font-semibold text-gray-700">Shadow</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-800 mb-1">
                          Stroke / outline (px @1024 — 0 = none)
                        </label>
                        <input
                          type="number"
                          value={strokeWidth}
                          onChange={(e) => setStrokeWidth(Number(e.target.value))}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                        />
                      </div>
                    </div>

                    {/* Text Alignment Selector */}
                    <div>
                      <label className="block font-bold text-gray-800 mb-1.5">Text Alignment</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["left", "center", "right"] as const).map((align) => (
                          <button
                            key={align}
                            type="button"
                            onClick={() => setTextAlign(align)}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition cursor-pointer ${textAlign === align
                              ? "border-[#C98A84] bg-[#C98A84]/10 text-[#C98A84] shadow-xs"
                              : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-white"
                              }`}
                          >
                            {align}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background box & Border Customization Section */}
                    <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer font-bold text-gray-800 select-none">
                          <input
                            type="checkbox"
                            checked={hasBackgroundBox}
                            onChange={(e) => setHasBackgroundBox(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-[#C98A84] focus:ring-[#C98A84]"
                          />
                          <span>Background box</span>
                        </label>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${hasBackgroundBox ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500"}`}>
                          {hasBackgroundBox ? "Visible in PDF & Viewer" : "No box in PDF & Viewer"}
                        </span>
                      </div>

                      {hasBackgroundBox && (
                        <div className="pt-3 border-t border-gray-200 space-y-3 animate-in fade-in duration-150">
                          {/* Box Layout Style */}
                          <div>
                            <label className="block font-bold text-xs text-gray-700 mb-1.5">Box Layout Style</label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setBoxLayout("banner")}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${boxLayout === "banner"
                                  ? "border-[#C98A84] bg-[#C98A84]/10 text-[#C98A84] shadow-xs"
                                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                                  }`}
                              >
                                <span>Bottom Banner (Full Width)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setBoxLayout("custom")}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${boxLayout === "custom"
                                  ? "border-[#C98A84] bg-[#C98A84]/10 text-[#C98A84] shadow-xs"
                                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                                  }`}
                              >
                                <span>Custom Position (X/Y Box)</span>
                              </button>
                            </div>
                          </div>

                          {/* Box Background Color */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="font-bold text-xs text-gray-700">Box Background Color</label>
                              <span className="text-[11px] font-mono font-semibold text-gray-500">{boxBgColor}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={boxBgColor.startsWith("#") ? boxBgColor : "#FFFFFF"}
                                onChange={(e) => setBoxBgColor(e.target.value)}
                                className="w-10 h-9 p-0.5 rounded-lg border border-gray-200 cursor-pointer bg-white"
                              />
                              <input
                                type="text"
                                value={boxBgColor}
                                onChange={(e) => setBoxBgColor(e.target.value)}
                                placeholder="#FFFFFF"
                                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white font-mono text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                              />
                            </div>
                            {/* Color presets */}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {[
                                { name: "White", color: "#FFFFFF" },
                                { name: "Cream", color: "#FAF4E6" },
                                { name: "Ivory", color: "#FFFDF8" },
                                { name: "Soft Rose", color: "#FAEEED" },
                                { name: "Dark", color: "#1E1E24" },
                              ].map((preset) => (
                                <button
                                  key={preset.name}
                                  type="button"
                                  onClick={() => setBoxBgColor(preset.color)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${boxBgColor.toUpperCase() === preset.color.toUpperCase()
                                    ? "border-[#C98A84] bg-[#C98A84]/15 text-[#C98A84] shadow-xs"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"
                                    }`}
                                >
                                  {preset.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Box Transparency & Opacity Control */}
                          <div className="p-3 rounded-xl bg-white border border-gray-200/90 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="font-bold text-xs text-gray-700">Box Opacity / Transparency</label>
                              <span className="text-xs font-bold text-[#C98A84]">
                                {Math.round(boxBgOpacity * 100)}% {boxBgOpacity === 0 ? "(Transparent)" : boxBgOpacity === 1 ? "(Solid)" : "(Semi-transparent)"}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={boxBgOpacity}
                              onChange={(e) => setBoxBgOpacity(Number(e.target.value))}
                              className="w-full accent-[#C98A84] cursor-pointer"
                            />
                            {/* Opacity Presets */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              {[
                                { label: "Transparent (0%)", val: 0.0 },
                                { label: "30%", val: 0.3 },
                                { label: "50%", val: 0.5 },
                                { label: "Frosted (75%)", val: 0.75 },
                                { label: "Soft (85%)", val: 0.85 },
                                { label: "Solid (100%)", val: 1.0 },
                              ].map((preset) => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() => setBoxBgOpacity(preset.val)}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition cursor-pointer ${Math.abs(boxBgOpacity - preset.val) < 0.03
                                    ? "border-[#C98A84] bg-[#C98A84]/15 text-[#C98A84] font-bold"
                                    : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                                    }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Box Border Color & Width */}
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="block font-bold text-xs text-gray-700 mb-1">Border Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={boxBorderColor.startsWith("#") ? boxBorderColor : "#E5E7EB"}
                                  onChange={(e) => setBoxBorderColor(e.target.value)}
                                  className="w-10 h-9 p-0.5 rounded-lg border border-gray-200 cursor-pointer bg-white"
                                />
                                <input
                                  type="text"
                                  value={boxBorderColor}
                                  onChange={(e) => setBoxBorderColor(e.target.value)}
                                  placeholder="#E5E7EB"
                                  className="flex-1 px-2.5 py-2 rounded-xl border border-gray-200 bg-white font-mono text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block font-bold text-xs text-gray-700 mb-1">Border Width (px)</label>
                              <input
                                type="number"
                                min="0"
                                max="12"
                                value={boxBorderWidth}
                                onChange={(e) => setBoxBorderWidth(Math.max(0, Number(e.target.value)))}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                              />
                            </div>
                          </div>

                          {/* Box Corner Radius */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="font-bold text-xs text-gray-700">Corner Radius</label>
                              <span className="text-xs font-bold text-[#C98A84]">{boxBorderRadius}px</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max="32"
                                value={boxBorderRadius}
                                onChange={(e) => setBoxBorderRadius(Number(e.target.value))}
                                className="w-full accent-[#C98A84] cursor-pointer"
                              />
                              <input
                                type="number"
                                min="0"
                                max="40"
                                value={boxBorderRadius}
                                onChange={(e) => setBoxBorderRadius(Math.max(0, Number(e.target.value)))}
                                className="w-16 px-2 py-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-center text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Save Page & Delete Buttons */}
                  <div className="pt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSavePage}
                      disabled={savingPage}
                      className="flex-1 py-3.5 px-6 rounded-2xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-[#C98A84]/25 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingPage ? "Saving page..." : "Save page"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteCurrentPage}
                      title="Delete page"
                      className="p-3.5 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* RIGHT COLUMN: Live Preview Canvas with Interactive Face Outline Tracing & PIL Burn Overlay */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600 block">
                      Live preview (square) — trace the face outline (press & drag)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FAEEED] border border-[#EBE3D9] text-[#C98A84] text-[10px] font-bold flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      <span>{CMS_SUPPORTED_LANGUAGES.find(l => l.id === selectedEditorLanguage)?.native || selectedEditorLanguage} Preview</span>
                    </span>
                  </div>

                  {/* Square Interactive Canvas */}
                  <div className="relative aspect-square w-full rounded-3xl overflow-hidden border border-gray-200 bg-gray-100 shadow-sm select-none">
                    {/* 1. Base Illustration Image */}
                    {activePage.original_image_url ? (
                      <img
                        src={activePage.original_image_url}
                        alt={`Page ${activePage.page_number} Master Plate`}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-amber-50/50">
                        <ImageIcon className="w-12 h-12 text-gray-300 mb-2" />
                        <span className="text-xs text-gray-500 font-semibold">No base illustration uploaded</span>
                        <span className="text-[11px] text-gray-400 mt-1">Click &quot;Replace base art&quot;</span>
                      </div>
                    )}

                    {/* 2. Interactive SVG Tracing Layer */}
                    <svg
                      ref={canvasSvgRef}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      onMouseDown={handleCanvasMouseDown}
                      onMouseMove={handleCanvasMouseMove}
                      onMouseUp={handleCanvasMouseUp}
                      onMouseLeave={handleCanvasMouseUp}
                      className="absolute inset-0 w-full h-full cursor-crosshair z-20"
                    >
                      {facePoints.length > 1 && (
                        <polygon
                          points={facePoints
                            .filter((pt) => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
                            .map((pt) => `${pt[0]},${pt[1]}`)
                            .join(" ")}
                          fill="rgba(20, 184, 166, 0.28)"
                          stroke="#10b981"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}
                      {facePoints
                        .filter((pt) => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
                        .map((pt, i) => (
                          <circle
                            key={i}
                            cx={pt[0]}
                            cy={pt[1]}
                            r="0.8"
                            fill="#059669"
                            stroke="#ffffff"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                    </svg>

                    {/* 3. Live Burned Text Overlay with PIL-style text rendering */}
                    {(() => {
                      const activeRawText = (selectedEditorLanguage !== "english" && pageTranslations[selectedEditorLanguage] !== undefined)
                        ? (pageTranslations[selectedEditorLanguage] || "")
                        : pageEditText;
                      const formattedText = formatStoryText(
                        activeRawText,
                        selectedGender === "boy" ? "Aarav" : "Ananya",
                        softLineBreak
                      );
                      if (!formattedText || !formattedText.trim()) return null;

                      return (
                        <div
                          style={{
                            position: "absolute",
                            left: `${textX}%`,
                            top: `${textY}%`,
                            transform: "translate(-50%, -50%)",
                            width: hasBackgroundBox && boxLayout === "banner" ? "90%" : "max-content",
                            maxWidth: hasBackgroundBox && boxLayout === "banner" ? "92%" : "88%",
                            fontSize: `${Math.max(12, Math.round((fontSize / 1024) * 480))}px`,
                            color: fontColor,
                            fontFamily: getCssFontFamily(fontFamily),
                            letterSpacing: `${letterSpacing}px`,
                            textShadow: hasShadow
                              ? "0 2px 8px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)"
                              : "none",
                            WebkitTextStroke:
                              strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : "none",
                            backgroundColor: hasBackgroundBox ? hexToRgba(boxBgColor, boxBgOpacity) : "transparent",
                            backdropFilter: hasBackgroundBox && boxBgOpacity < 1 && boxBgOpacity > 0 ? "blur(4px)" : "none",
                            padding: hasBackgroundBox ? (boxLayout === "banner" ? "10px 18px" : "8px 14px") : "0",
                            borderRadius: hasBackgroundBox ? `${boxBorderRadius}px` : "0",
                            border: hasBackgroundBox && boxBorderWidth > 0 ? `${boxBorderWidth}px solid ${boxBorderColor}` : "none",
                            boxShadow: hasBackgroundBox ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
                            textAlign: textAlign,
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.25,
                            zIndex: 30,
                            pointerEvents: "none",
                          }}
                        >
                          {formattedText}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-3xl space-y-8 animate-in fade-in duration-200">
            {/* Top Announcement Bar & Offers Card */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-[#C98A84]" />
                    Top Announcement Bar & Offers
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Control the welcome offer, promo code, and top banner message shown to website visitors.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={announcementActive}
                    onChange={(e) => setAnnouncementActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C98A84]"></div>
                  <span className="ml-3 text-xs font-semibold text-gray-700">
                    {announcementActive ? "Active" : "Disabled"}
                  </span>
                </label>
              </div>

              {/* Live Preview */}
              <div className="relative rounded-full bg-gradient-to-r from-[#FFF5F4] via-[#FDF0EE] to-[#FFF5F4] border border-[#F7D8D3] shadow-[0_2px_12px_rgba(186,90,94,0.06)] px-3 sm:px-4 py-2 flex items-center justify-between gap-3 overflow-hidden select-none">
                {/* Botanical Leaves in Bottom-Left Corner */}
                <CornerLeavesLeft className="absolute -bottom-1 -left-1 w-10 h-10 pointer-events-none z-0" />

                {/* Botanical Leaves in Bottom-Right Corner */}
                <CornerLeavesRight className="absolute -bottom-1 -right-1 w-10 h-10 pointer-events-none z-0" />

                {/* Left Group: Gift Box + Divider Line */}
                <div className="relative z-10 flex items-center shrink-0">
                  <GiftBoxIcon className="w-8 h-8 shrink-0 drop-shadow-2xs" />
                  <div className="h-5 w-[1.5px] bg-[#E8B8B0]/70 mx-2 shrink-0" />
                </div>

                {/* Center Content: Formatted Notice + Sparkles */}
                <div
                  key={adminPreviewIdx}
                  className="animate-in fade-in slide-in-from-bottom-1 duration-500 relative z-10 flex-1 flex items-center justify-center gap-1.5 text-center text-[#33272D] text-xs font-medium flex-wrap min-w-0"
                >
                  {renderFormattedNotice(currentAdminPreview.text, currentAdminPreview.coupon_code, currentAdminPreview.badge)}
                  <span className="inline-flex items-center gap-1 text-[#BA5A5E] shrink-0 select-none ml-1">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M8 0C8 4.4 9.6 6 14 6C9.6 6 8 7.6 8 12C8 7.6 6.4 6 2 6C6.4 6 8 4.4 8 0Z" />
                    </svg>
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-80 -mt-1.5">
                      <path d="M8 0C8 4.4 9.6 6 14 6C9.6 6 8 7.6 8 12C8 7.6 6.4 6 2 6C6.4 6 8 4.4 8 0Z" />
                    </svg>
                  </span>
                </div>

                {/* Right Group: Use Code Button + Live Preview Tag */}
                <div className="relative z-10 flex items-center gap-2 shrink-0">
                  {currentAdminPreview?.coupon_code ? (
                    <div
                      key={`preview-code-${adminPreviewIdx}`}
                      className="animate-in fade-in duration-300 inline-flex items-center gap-1.5 pl-3 pr-2 py-0.5 rounded-full bg-[#BA5A5E] text-white text-xs shadow-xs"
                    >
                      <span className="text-[11px] font-medium text-white/95">Use code</span>
                      <span className="font-mono font-bold tracking-wider text-[#33272D] bg-[#FCECE9] px-2 py-0.5 rounded-full text-[10.5px] shadow-inner">
                        {currentAdminPreview.coupon_code}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : currentAdminPreview?.link_label ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#BA5A5E] text-white text-xs">
                      <span>{currentAdminPreview.link_label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : null}
                  <span className="w-6 h-6 rounded-full bg-white border border-[#E8B8B0]/80 text-[#33272D] flex items-center justify-center shadow-xs text-xs">
                    ✕
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Badge Text</label>
                  <input
                    type="text"
                    value={announcementBadge}
                    onChange={(e) => setAnnouncementBadge(e.target.value)}
                    placeholder="e.g. WELCOME OFFER, FESTIVE SALE"
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Coupon / Promo Code</label>
                  <input
                    type="text"
                    value={announcementCoupon}
                    onChange={(e) => setAnnouncementCoupon(e.target.value)}
                    placeholder="e.g. WELCOME20"
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="font-semibold text-gray-800 block mb-1">Announcement Message Text</label>
                <input
                  type="text"
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="e.g. Get 20% off your child's first personalized storybook with code WELCOME20"
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div className="text-xs">
                <label className="font-semibold text-gray-800 block mb-1">Action Button Text</label>
                <input
                  type="text"
                  value={announcementLinkLabel}
                  onChange={(e) => setAnnouncementLinkLabel(e.target.value)}
                  placeholder="e.g. Claim Offer, Shop Now"
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              {/* Extra Notices / Additional Ticker Messages */}
              <div className="pt-5 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-[#C98A84]" />
                      Extra Notices (Running Marquee)
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Add extra announcements that rotate in the running ticker along with the welcome offer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementNotices([
                        ...announcementNotices,
                        {
                          id: Date.now().toString(),
                          badge: "SPECIAL NOTICE",
                          text: "",
                          coupon_code: "",
                          link_label: "Claim Offer",
                          link_url: "/storybooks",
                        },
                      ]);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#C98A84] text-[#C98A84] hover:bg-[#FAEEED] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Extra Notice</span>
                  </button>
                </div>

                {announcementNotices.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-gray-200 text-center text-xs text-gray-400 bg-gray-50/50">
                    No extra notices added yet. Click <strong>"+ Add Extra Notice"</strong> to add more rotating messages!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcementNotices.map((notice, idx) => (
                      <div
                        key={notice.id || idx}
                        className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200 space-y-3 relative"
                      >
                        <div className="flex items-center justify-between border-b border-gray-200/70 pb-2">
                          <span className="text-xs font-bold text-gray-800">
                            Extra Notice #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAnnouncementNotices(
                                announcementNotices.filter((_, i) => i !== idx)
                              );
                            }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="font-semibold text-gray-700 block mb-1">Badge Text</label>
                            <input
                              type="text"
                              value={notice.badge || ""}
                              onChange={(e) => {
                                const updated = [...announcementNotices];
                                updated[idx].badge = e.target.value;
                                setAnnouncementNotices(updated);
                              }}
                              placeholder="e.g. FREE SHIPPING, DIWALI DEAL"
                              className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-gray-700 block mb-1">Coupon Code (Optional)</label>
                            <input
                              type="text"
                              value={notice.coupon_code || ""}
                              onChange={(e) => {
                                const updated = [...announcementNotices];
                                updated[idx].coupon_code = e.target.value;
                                setAnnouncementNotices(updated);
                              }}
                              placeholder="e.g. FREESHIP"
                              className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                            />
                          </div>
                        </div>

                        <div className="text-xs">
                          <label className="font-semibold text-gray-700 block mb-1">Notice Message Text</label>
                          <input
                            type="text"
                            value={notice.text || ""}
                            onChange={(e) => {
                              const updated = [...announcementNotices];
                              updated[idx].text = e.target.value;
                              setAnnouncementNotices(updated);
                            }}
                            placeholder="e.g. Free shipping across India on orders above ₹999!"
                            className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                          />
                        </div>

                        <div className="text-xs">
                          <label className="font-semibold text-gray-700 block mb-1">Action Button Text</label>
                          <input
                            type="text"
                            value={notice.link_label || ""}
                            onChange={(e) => {
                              const updated = [...announcementNotices];
                              updated[idx].link_label = e.target.value;
                              setAnnouncementNotices(updated);
                            }}
                            placeholder="e.g. Shop Now, Claim Offer"
                            className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAnnouncement}
                  disabled={savingAnnouncement}
                  className="px-6 py-3 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {savingAnnouncement ? "Saving Changes..." : "Save Announcement Bar"}
                </button>
                {announcementSavedToast && (
                  <span className="text-xs font-semibold text-green-600 animate-in fade-in">
                    ✓ Announcement settings saved & live!
                  </span>
                )}
              </div>
            </div>

            {/* Payment, Language Surcharges & Gift Wrap Settings Card */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#C98A84]" />
                  Book Pricing, Language Surcharges & Gift Wrapping
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Configure default PDF payment amounts, regional language surcharges, and hardcopy gift wrapping fees applied at customer checkout.
                </p>
              </div>

              {/* 1. Default PDF Price */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#8B3DFF]" />
                    <span>Default Digital PDF Storybook Price (₹)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#8B3DFF] bg-[#FAF5FF] px-2 py-0.5 rounded-full border border-[#8B3DFF]/20">
                    Instant Download
                  </span>
                </div>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settingDefaultPdfPrice}
                    onChange={(e) => setSettingDefaultPdfPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#8B3DFF]"
                    placeholder="799"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Base rate charged when a customer purchases the digital high-resolution PDF edition. Individual stories can also have custom amounts configured in the Stories tab.
                </p>
              </div>

              {/* 2. Default Hardcover Price */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#C98A84]" />
                    <span>Default Hardcover Keepsake Storybook Price (₹)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#C98A84] bg-[#FAEEED] px-2 py-0.5 rounded-full border border-[#C98A84]/20">
                    Physical Book + Digital
                  </span>
                </div>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settingDefaultHardcoverPrice}
                    onChange={(e) => setSettingDefaultHardcoverPrice(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                    placeholder="1399"
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Base rate charged when a customer purchases the physical premium hardcover keepsake edition. Syncs automatically across all storybooks.
                </p>
              </div>

              {/* 3. Regional Language Surcharge */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <Languages className="w-4 h-4 text-[#C98A84]" />
                    <span>Regional Language Edition Surcharge (₹)</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    English = ₹0 extra
                  </span>
                </div>
                <div className="relative max-w-xs">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">+₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settingLanguageSurcharge}
                    onChange={(e) => setSettingLanguageSurcharge(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                    placeholder="99"
                  />
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  When a customer orders in <strong>English</strong>, they pay the standard book rate. If they choose any other regional language (Tamil, Hindi, Malayalam, Telugu, Kannada, Bengali, Marathi, etc.), this extra amount is automatically added to their total during checkout.
                </p>
                <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-[11px] flex items-center justify-between">
                  <span className="text-gray-600">Sample checkout price for Tamil/Hindi PDF:</span>
                  <strong className="text-gray-900 font-mono">
                    ₹{settingDefaultPdfPrice} + ₹{settingLanguageSurcharge} = ₹{settingDefaultPdfPrice + settingLanguageSurcharge}
                  </strong>
                </div>
              </div>

              {/* 3. Hardcopy Gift Wrapping Fee */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#C98A84]" />
                    <span>Hardcopy Keepsake Gift Wrapping Option</span>
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingGiftWrapEnabled}
                      onChange={(e) => setSettingGiftWrapEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C98A84]"></div>
                    <span className="ml-2 text-xs font-semibold text-gray-700">
                      {settingGiftWrapEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </label>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 block">
                    Gift Wrapping & Satin Ribbon Fee (₹)
                  </label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">+₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={!settingGiftWrapEnabled}
                      value={settingGiftWrapFee}
                      onChange={(e) => setSettingGiftWrapFee(Number(e.target.value))}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-800 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#C98A84] disabled:opacity-50"
                      placeholder="20"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  When enabled, customers ordering the physical <strong>Hardcover Keepsake</strong> can check a box to request luxury gift wrapping and a satin ribbon for this exact configurable fee (default ₹20).
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveAnnouncement}
                  disabled={savingAnnouncement}
                  className="px-6 py-3 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  {savingAnnouncement ? "Saving Changes..." : "Save Pricing & Surcharges"}
                </button>
                {announcementSavedToast && (
                  <span className="text-xs font-semibold text-green-600 animate-in fade-in">
                    ✓ Pricing settings saved & active!
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── CHILDREN'S WRITTEN STORIES TAB ── */}
        {activeTab === "child_stories" && (
          <div className="p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Feather className="w-6 h-6 text-[#C98A84]" />
                  Children's Written Stories
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Manage story submissions from little authors. Feature, approve, or remove entries.
                </p>
              </div>
              <button
                onClick={() => fetchAdminChildStories(childStoryFilter)}
                className="px-4 py-2 rounded-xl bg-[#C98A84] text-white text-xs font-semibold hover:bg-[#B87A74] cursor-pointer"
              >
                ↻ Refresh
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              {["all", "featured", "approved", "pending", "rejected"].map((f) => (
                <button
                  key={f}
                  onClick={() => { setChildStoryFilter(f); setChildStoryPage(1); fetchAdminChildStories(f); }}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer capitalize transition ${childStoryFilter === f
                    ? "bg-[#C98A84] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {f === "all" ? "All Submissions" : f === "featured" ? "⭐ Featured" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <input
                type="text"
                placeholder="Search by name, title or place..."
                value={childStorySearch}
                onChange={(e) => setChildStorySearch(e.target.value)}
                className="ml-auto px-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84] w-60"
              />
            </div>

            {/* Stories Table */}
            {loadingChildStories ? (
              <div className="py-16 text-center text-sm text-gray-400">Loading stories...</div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-xs shadow-xs border-b border-gray-100">
                      <tr className="bg-gray-50 border-b border-gray-100 text-left text-gray-500 font-semibold uppercase tracking-wide">
                        <th className="px-5 py-3.5 bg-gray-50">Author</th>
                        <th className="px-5 py-3.5 bg-gray-50">Story Title</th>
                        <th className="px-5 py-3.5 bg-gray-50">Category</th>
                        <th className="px-5 py-3.5 bg-gray-50">Status</th>
                        <th className="px-5 py-3.5 bg-gray-50">❤️ Likes</th>
                        <th className="px-5 py-3.5 bg-gray-50">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminChildStories
                        .filter((s) => {
                          if (!childStorySearch.trim()) return true;
                          const q = childStorySearch.toLowerCase();
                          return (
                            s.child_name.toLowerCase().includes(q) ||
                            s.title.toLowerCase().includes(q) ||
                            s.place.toLowerCase().includes(q)
                          );
                        })
                        .slice((childStoryPage - 1) * ITEMS_PER_PAGE, childStoryPage * ITEMS_PER_PAGE)
                        .map((story) => (
                          <tr
                            key={story.id}
                            className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
                            onClick={() => setSelectedAdminChildStory(story)}
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                                  style={{ backgroundColor: story.cover_color || "#C98A84" }}
                                >
                                  {story.child_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{story.child_name}</p>
                                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3" /> {story.standard}
                                    <MapPin className="w-3 h-3 ml-1" /> {story.place}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 max-w-[200px]">
                              <p className="font-medium text-gray-800 truncate">{story.title}</p>
                              <p className="text-[11px] text-gray-400 truncate italic">"{story.story_text.substring(0, 60)}..."</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FAEEED] text-[#C98A84]">
                                {story.category}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${story.status === "featured" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                story.status === "approved" ? "bg-emerald-50 text-emerald-700" :
                                  story.status === "pending" ? "bg-orange-50 text-orange-600" :
                                    "bg-red-50 text-red-600"
                                }`}>
                                {story.status === "featured" ? "⭐ Featured" : story.status}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="flex items-center gap-1 text-rose-500 font-semibold">
                                <Heart className="w-3.5 h-3.5 fill-rose-400" />
                                {story.likes_count || 0}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {story.status !== "featured" && (
                                  <button
                                    onClick={() => handleUpdateChildStoryStatus(story.id, "featured")}
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-semibold border border-amber-200 cursor-pointer"
                                    title="Feature this story"
                                  >
                                    ⭐ Feature
                                  </button>
                                )}
                                {story.status !== "approved" && story.status !== "featured" && (
                                  <button
                                    onClick={() => handleUpdateChildStoryStatus(story.id, "approved")}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {story.status !== "rejected" && (
                                  <button
                                    onClick={() => handleUpdateChildStoryStatus(story.id, "rejected")}
                                    className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-semibold cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteChildStory(story.id)}
                                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-semibold cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {adminChildStories.length === 0 && (
                    <div className="py-16 text-center text-sm text-gray-400">No stories found.</div>
                  )}
                </div>
                <AdminTablePagination
                  currentPage={childStoryPage}
                  totalItems={
                    adminChildStories.filter((s) => {
                      if (!childStorySearch.trim()) return true;
                      const q = childStorySearch.toLowerCase();
                      return (
                        s.child_name.toLowerCase().includes(q) ||
                        s.title.toLowerCase().includes(q) ||
                        s.place.toLowerCase().includes(q)
                      );
                    }).length
                  }
                  pageSize={ITEMS_PER_PAGE}
                  onPageChange={setChildStoryPage}
                />
              </div>
            )}
          </div>
        )}

        {/* Story Detail Modal */}
        {selectedAdminChildStory && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${selectedAdminChildStory.cover_color}15, white)` }}>
                <div>
                  <span className="text-xs font-bold text-[#C98A84] uppercase tracking-wider">Story Review</span>
                  <h3 className="text-xl font-bold text-gray-900 mt-0.5">{selectedAdminChildStory.title}</h3>
                </div>
                <button onClick={() => setSelectedAdminChildStory(null)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-400 font-medium">Author</p>
                    <p className="font-bold text-gray-900 mt-0.5">{selectedAdminChildStory.child_name}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-400 font-medium">Standard</p>
                    <p className="font-bold text-gray-900 mt-0.5">{selectedAdminChildStory.standard}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-gray-400 font-medium">Place</p>
                    <p className="font-bold text-gray-900 mt-0.5">{selectedAdminChildStory.place}</p>
                  </div>
                </div>
                {selectedAdminChildStory.parent_email && (
                  <div className="p-3 bg-blue-50 rounded-xl text-xs">
                    <span className="text-gray-500 font-medium">Parent Contact: </span>
                    <span className="font-bold text-blue-700">{selectedAdminChildStory.parent_email}</span>
                  </div>
                )}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-xs text-gray-500 mb-2 font-semibold">Full Story Text</p>
                  <p className="text-sm text-gray-800 leading-relaxed">{selectedAdminChildStory.story_text}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedAdminChildStory.status !== "featured" && (
                    <button onClick={() => { handleUpdateChildStoryStatus(selectedAdminChildStory.id, "featured"); setSelectedAdminChildStory(null); }} className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold cursor-pointer hover:bg-amber-600">⭐ Mark as Featured</button>
                  )}
                  {selectedAdminChildStory.status !== "approved" && (
                    <button onClick={() => { handleUpdateChildStoryStatus(selectedAdminChildStory.id, "approved"); setSelectedAdminChildStory(null); }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer hover:bg-emerald-700">✓ Approve</button>
                  )}
                  {selectedAdminChildStory.status !== "rejected" && (
                    <button onClick={() => { handleUpdateChildStoryStatus(selectedAdminChildStory.id, "rejected"); setSelectedAdminChildStory(null); }} className="px-4 py-2 rounded-xl bg-red-500 text-white text-xs font-bold cursor-pointer hover:bg-red-600">✕ Reject</button>
                  )}
                  <button onClick={() => { handleDeleteChildStory(selectedAdminChildStory.id); }} className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-xs font-bold cursor-pointer hover:bg-gray-300">🗑 Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ── KUTTY'S STORY ADMIN TAB ── */}
        {activeTab === "kuttys_story" && (
          <div className="p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Smile className="w-6 h-6 text-[#C98A84]" />
                  Kutty's Story
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Manage the authentic kid feedback stories shown on the public <strong>Kutty's Story</strong> page. Add, edit, hide or delete entries — all with custom cartoon avatars and child-language quotes.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleResetKuttysStoryDefaults}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>
                <button
                  onClick={() => fetchAdminKuttysStories()}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                <button
                  onClick={handleOpenAddKuttysStory}
                  className="px-4 py-2 rounded-xl bg-[#C98A84] text-white text-xs font-semibold hover:bg-[#B87A74] cursor-pointer flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Kid Story
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Stories", value: adminKuttysStories.length, icon: "🌟" },
                { label: "Active / Live", value: adminKuttysStories.filter(s => s.is_active).length, icon: "✅" },
                { label: "Hidden", value: adminKuttysStories.filter(s => !s.is_active).length, icon: "👻" },
                { label: "Total Hearts", value: adminKuttysStories.reduce((sum, s) => sum + (s.likes_count || 0), 0), icon: "❤️" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
                  <span className="text-2xl">{stat.icon}</span>
                  <div>
                    <div className="text-xl font-bold text-gray-900">{typeof stat.value === 'number' ? stat.value.toLocaleString('en-IN') : stat.value}</div>
                    <div className="text-[11px] text-gray-500 font-medium">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by child name, city, quote…"
                  value={kuttysStorySearch}
                  onChange={(e) => setKuttysStorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["all", "active", "hidden"].map(f => (
                  <button
                    key={f}
                    onClick={() => setKuttysStoryFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition capitalize ${kuttysStoryFilter === f ? "bg-[#2D222A] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    {f === "all" ? "All" : f === "active" ? "✅ Live" : "👻 Hidden"}
                  </button>
                ))}
              </div>
            </div>

            {/* Stories List */}
            {loadingKuttysStories ? (
              <div className="text-center py-16 text-gray-500 text-sm flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#C98A84]" />
                Loading Kutty's stories…
              </div>
            ) : (() => {
              const filtered = adminKuttysStories.filter(s => {
                const q = kuttysStorySearch.toLowerCase();
                const matchSearch = !q || s.child_name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.kid_quote?.toLowerCase().includes(q) || s.storybook_title?.toLowerCase().includes(q);
                const matchFilter = kuttysStoryFilter === "all" || (kuttysStoryFilter === "active" ? s.is_active : !s.is_active);
                return matchSearch && matchFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <span className="text-4xl mb-3 block">🎈</span>
                    <p className="text-sm text-gray-500">No Kutty's stories found. Add the first one!</p>
                    <button onClick={handleOpenAddKuttysStory} className="mt-4 px-4 py-2 bg-[#C98A84] text-white text-xs rounded-xl font-semibold hover:bg-[#B87A74]">
                      + Add Kid Story
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filtered.map((story) => (
                    <div
                      key={story.id}
                      className={`bg-white rounded-2xl border p-5 flex gap-4 items-start transition shadow-xs ${story.is_active ? "border-gray-100 hover:border-[#C98A84]/30" : "border-dashed border-gray-200 opacity-70"}`}
                    >
                      {/* Avatar Preview */}
                      <div className="shrink-0 w-16 h-16">
                        <KidCartoonAvatar
                          preset={story.avatar_preset}
                          customUrl={story.avatar_url}
                          className="w-16 h-16"
                          accentColor={story.accent_color}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h3 className="text-sm font-bold text-gray-900 truncate">{story.child_name}</h3>
                            <p className="text-[11px] text-[#C98A84] font-semibold">{story.child_title} · {story.child_age}</p>
                            {story.city && <p className="text-[10px] text-gray-400">{story.city}</p>}
                          </div>
                          <div className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${story.is_active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-500"}`}>
                            {story.is_active ? "Live ✅" : "Hidden 👻"}
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 italic line-clamp-2 mb-2">"{story.kid_quote}"</p>

                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-400">
                          <span>📚 {story.storybook_title}</span>
                          <span>❤️ {story.likes_count || 0}</span>
                          <span>⭐ {story.rating_label}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => handleToggleKuttysStoryActive(story)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer transition"
                          >
                            {story.is_active ? "Hide" : "Show"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditKuttysStory(story)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FAEEED] hover:bg-[#f5d8d5] text-[#C98A84] cursor-pointer transition flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKuttysStory(story.id, story.child_name)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-red-50 text-red-500 border border-gray-100 hover:border-red-100 cursor-pointer transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── 24-HOUR PARENTING ROUTINE TAB ── */}
        {activeTab === "parenting_routine" && (
          <div className="p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-[#A85341]" />
                  24-Hour Parenting Routine
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Manage the 11 daily milestones in the magical animated storybook timeline on the <strong>About</strong> page.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleResetRoutineDefaults}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>
                <button
                  onClick={() => fetchAdminParentingRoutine()}
                  className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRoutine ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Stages Grid (11 Milestones) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(adminRoutineStages.length > 0 ? adminRoutineStages : [
                { id: "stage-1", time: "6:30 – 7:00 AM", activity: "Wake Up & Smile", parenting_idea: "Hugs, gratitude and brushing teeth.", category: "morning", character: "boy", icon: "Sun", start_hour: 6.5, end_hour: 7.0 },
                { id: "stage-2", time: "7:00 – 8:00 AM", activity: "Healthy Morning", parenting_idea: "Breakfast and getting ready.", category: "morning", character: "boy", icon: "Coffee", start_hour: 7.0, end_hour: 8.0 },
                { id: "stage-3", time: "8:00 AM – 2:00 PM", activity: "School & Learning", parenting_idea: "Lessons, lunch and friendships.", category: "day", character: "boy", icon: "GraduationCap", start_hour: 8.0, end_hour: 14.0 },
                { id: "stage-4", time: "2:00 – 3:00 PM", activity: "Lunch & Relaxation", parenting_idea: "Food, connection and quiet time.", category: "day", character: "boy", icon: "UtensilsCrossed", start_hour: 14.0, end_hour: 15.0 },
                { id: "stage-5", time: "3:00 – 4:00 PM", activity: "Creative Time", parenting_idea: "Art, puzzles and imaginative play.", category: "day", character: "boy", icon: "Palette", start_hour: 15.0, end_hour: 16.0 },
                { id: "stage-6", time: "4:00 – 5:30 PM", activity: "Outdoor Play", parenting_idea: "Movement and active games.", category: "evening", character: "girl", icon: "Trees", start_hour: 16.0, end_hour: 17.5 },
                { id: "stage-7", time: "5:30 – 6:30 PM", activity: "Homework & Reading", parenting_idea: "Learning with gentle support.", category: "evening", character: "girl", icon: "BookOpen", start_hour: 17.5, end_hour: 18.5 },
                { id: "stage-8", time: "6:30 – 7:30 PM", activity: "Family & Dinner", parenting_idea: "Conversation and shared meals.", category: "evening", character: "girl", icon: "HeartHandshake", start_hour: 18.5, end_hour: 19.5 },
                { id: "stage-9", time: "7:30 – 8:00 PM", activity: "Bedtime Preparation", parenting_idea: "Wash, brush teeth and wind down.", category: "night", character: "girl", icon: "Sparkles", start_hour: 19.5, end_hour: 20.0 },
                { id: "stage-10", time: "8:00 – 8:30 PM", activity: "KuttyStory Magic", parenting_idea: "Read together and imagine.", category: "night", character: "girl", icon: "BookMarked", start_hour: 20.0, end_hour: 20.5 },
                { id: "stage-11", time: "8:30 PM – 6:30 AM", activity: "Sweet Dreams", parenting_idea: "10 hours of restorative sleep.", category: "night", character: "boy", icon: "MoonStar", start_hour: 20.5, end_hour: 30.5 },
              ] as ParentingRoutineStage[]).map((stage, idx) => (
                <div
                  key={stage.id}
                  className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between hover:border-[#C98A84]/40 transition space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF0E6] text-[#A85341] uppercase tracking-wider">
                        Stage #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#A85341]" />
                        {stage.time}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 text-base mb-1">
                      {stage.activity}
                    </h3>

                    <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 italic leading-relaxed">
                      “{stage.parenting_idea}”
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span>Pilot:</span>
                      <strong className="text-gray-800">{stage.character === "girl" ? "🌸 Ananya" : "🦖 Aarav"}</strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => setEditingRoutineStage({ ...stage })}
                      className="px-3 py-1 rounded-lg bg-[#FAEEED] hover:bg-[#F3D7CD] text-[#A85341] font-semibold text-xs transition cursor-pointer flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal: Edit Routine Stage */}
            {editingRoutineStage && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <span className="text-xs font-semibold text-[#A85341] uppercase tracking-wider">Parenting Routine</span>
                      <h3 className="text-lg font-bold text-gray-900">Edit Milestone</h3>
                    </div>
                    <button
                      onClick={() => setEditingRoutineStage(null)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editingRoutineStage) handleSaveRoutineStage(editingRoutineStage);
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Time Label</label>
                      <input
                        type="text"
                        value={editingRoutineStage.time}
                        onChange={(e) => setEditingRoutineStage({ ...editingRoutineStage, time: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#A85341] focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Activity Title</label>
                      <input
                        type="text"
                        value={editingRoutineStage.activity}
                        onChange={(e) => setEditingRoutineStage({ ...editingRoutineStage, activity: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#A85341] focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1">Parenting Idea / Tip</label>
                      <textarea
                        rows={3}
                        value={editingRoutineStage.parenting_idea}
                        onChange={(e) => setEditingRoutineStage({ ...editingRoutineStage, parenting_idea: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-1 focus:ring-[#A85341] focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Character Pilot</label>
                        <select
                          value={editingRoutineStage.character}
                          onChange={(e) => setEditingRoutineStage({ ...editingRoutineStage, character: e.target.value as "boy" | "girl" })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:ring-1 focus:ring-[#A85341] focus:outline-none"
                        >
                          <option value="boy">🦖 Aarav (Boy)</option>
                          <option value="girl">🌸 Ananya (Girl)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1">Cycle Category</label>
                        <select
                          value={editingRoutineStage.category}
                          onChange={(e) => setEditingRoutineStage({ ...editingRoutineStage, category: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:ring-1 focus:ring-[#A85341] focus:outline-none"
                        >
                          <option value="morning">🌅 Morning</option>
                          <option value="day">☀️ Day</option>
                          <option value="evening">🌇 Evening</option>
                          <option value="night">🌙 Night</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setEditingRoutineStage(null)}
                        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingRoutine}
                        className="px-5 py-2 rounded-xl bg-[#A85341] hover:bg-[#924535] text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {savingRoutine ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : "Save Milestone"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CUSTOMER FEEDBACK TAB ── */}
        {activeTab === "feedback" && (
          <div className="p-6 sm:p-8 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquareHeart className="w-6 h-6 text-[#C98A84]" />
                  Customer Feedback
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Manage reviews submitted through the website footer. Inspect, publish to the Foot Steps “Heartfelt Memories” section, edit, or delete submissions.
                </p>
              </div>
              <button
                onClick={() => fetchAdminFeedbacks(feedbackFilter)}
                className="px-4 py-2 rounded-xl bg-[#C98A84] text-white text-xs font-semibold hover:bg-[#B87A74] cursor-pointer flex items-center gap-1.5 transition self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingFeedbacks ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Notification Banner */}
            {feedbackNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feedbackNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackNotice(null)}
                  className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Filter Bar & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { key: "all", label: "All Reviews" },
                  { key: "approved", label: "Published" },
                  { key: "pending", label: "Pending" },
                  ...(feedbacks.some((x) => x.status === "rejected")
                    ? [{ key: "rejected", label: "Rejected" }]
                    : []),
                ].map((f) => {
                  const count =
                    f.key === "all"
                      ? feedbacks.length
                      : feedbacks.filter((x) => x.status === f.key).length;
                  const isActive = feedbackFilter === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => {
                        setFeedbackFilter(f.key as any);
                        fetchAdminFeedbacks(f.key as any);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${isActive
                        ? "bg-[#C98A84] text-white shadow-xs"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                      <span>{f.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                          }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, place, text..."
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84] bg-white"
                />
              </div>
            </div>

            {/* Submissions List */}
            {loadingFeedbacks ? (
              <div className="py-20 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-100">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#C98A84] mb-2" />
                Loading feedback submissions...
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
                {(() => {
                  const filtered = feedbacks.filter((fb) => {
                    if (feedbackFilter !== "all" && fb.status !== feedbackFilter) {
                      return false;
                    }
                    if (!feedbackSearch.trim()) return true;
                    const q = feedbackSearch.toLowerCase();
                    return (
                      fb.name.toLowerCase().includes(q) ||
                      fb.place.toLowerCase().includes(q) ||
                      (fb.review_text?.toLowerCase().includes(q) ?? false)
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-16 text-center text-gray-400 space-y-2">
                        <MessageSquareHeart className="w-10 h-10 mx-auto text-gray-200" />
                        <p className="text-sm font-semibold text-gray-600">No feedback submissions found</p>
                        <p className="text-xs text-gray-400">
                          {feedbackSearch
                            ? "Try adjusting your search query."
                            : feedbackFilter === "pending"
                              ? "There are no pending submissions awaiting review."
                              : "Submissions from the footer form will appear here."}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div>
                      <div className="divide-y divide-gray-100">
                        {filtered
                          .slice((feedbackPage - 1) * ITEMS_PER_PAGE, feedbackPage * ITEMS_PER_PAGE)
                          .map((fb) => {
                            const isVideo = fb.media_type === "video" || fb.media_url?.endsWith(".mp4") || fb.media_url?.endsWith(".webm") || fb.media_url?.endsWith(".mov");
                            const dateFormatted = fb.created_at
                              ? new Date(fb.created_at).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                              : "";

                            return (
                              <div
                                key={fb.id}
                                className="p-5 sm:p-6 hover:bg-gray-50/50 transition flex flex-col lg:flex-row lg:items-start justify-between gap-5"
                              >
                                {/* Author & Review Content */}
                                <div className="flex-1 space-y-3">
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    {/* Rating Stars */}
                                    <div className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-4 h-4 ${star <= fb.rating
                                            ? "text-amber-400 fill-amber-400"
                                            : "text-gray-200 fill-gray-100"
                                            }`}
                                        />
                                      ))}
                                    </div>

                                    <span className="text-xs font-bold text-gray-900">{fb.name}</span>
                                    <span className="text-[11px] text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                                      <MapPin className="w-3 h-3 text-gray-400" />
                                      {fb.place}
                                    </span>

                                    {dateFormatted && (
                                      <span className="text-[11px] text-gray-400">
                                        • {dateFormatted}
                                      </span>
                                    )}

                                    {/* Status Badge */}
                                    <span
                                      className={`ml-auto lg:ml-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${fb.status === "approved"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : fb.status === "pending"
                                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                                          : "bg-red-50 text-red-600 border border-red-200"
                                        }`}
                                    >
                                      {fb.status === "approved"
                                        ? "✓ Published on Foot Steps"
                                        : fb.status === "pending"
                                          ? "⏳ Pending Review"
                                          : "✕ Rejected"}
                                    </span>
                                  </div>

                                  {/* Review Text */}
                                  {fb.review_text && fb.review_text.trim() ? (
                                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed italic bg-[#FAEEED]/20 p-3 rounded-xl border border-[#EBE3D9]/60">
                                      “{fb.review_text.trim()}”
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-gray-400 italic">
                                      {fb.media_url ? "No written review text provided (media submission only)" : "Rating only (no written review text)"}
                                    </p>
                                  )}

                                  {/* Uploaded Media Preview */}
                                  {fb.media_url ? (
                                    <div className="flex items-center gap-3 pt-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setViewingMedia({
                                            url: fb.media_url!,
                                            type: isVideo ? "video" : "image",
                                            author: fb.name,
                                          })
                                        }
                                        className="group flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-gray-100 hover:bg-[#FAEEED] border border-gray-200 hover:border-[#EBE3D9] transition text-left cursor-pointer"
                                      >
                                        {isVideo ? (
                                          <div className="w-10 h-10 rounded-lg bg-[#FAEEED] flex items-center justify-center text-[#C98A84] shrink-0">
                                            <Video className="w-5 h-5" />
                                          </div>
                                        ) : (
                                          <img
                                            src={fb.media_url}
                                            alt="Media preview"
                                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                                          />
                                        )}
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-bold text-gray-800 group-hover:text-[#C98A84]">
                                            {isVideo ? "Customer Video Attachment" : "Customer Photo Attachment"}
                                          </p>
                                          <p className="text-[10px] text-gray-400">Click to inspect / play</p>
                                        </div>
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-gray-400 italic">No media attachment uploaded</p>
                                  )}
                                </div>

                                {/* Action Area: Publish Toggle & Compact Actions */}
                                <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                                  {/* 1. PUBLISH / UNPUBLISH TOGGLE SWITCH */}
                                  <div className="flex flex-col items-start lg:items-end gap-1">
                                    <div className="flex items-center gap-2.5">
                                      <label
                                        htmlFor={`publish-toggle-${fb.id}`}
                                        className="text-xs font-bold text-gray-700 cursor-pointer select-none"
                                      >
                                        Published
                                      </label>
                                      <button
                                        id={`publish-toggle-${fb.id}`}
                                        type="button"
                                        role="switch"
                                        aria-checked={fb.status === "approved"}
                                        aria-label={`Publication status for ${fb.name}'s review`}
                                        aria-describedby={`publish-status-text-${fb.id}`}
                                        tabIndex={0}
                                        onClick={() => handleTogglePublish(fb)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleTogglePublish(fb);
                                          }
                                        }}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C98A84] focus:ring-offset-2 ${fb.status === "approved" ? "bg-emerald-600" : "bg-gray-300"
                                          }`}
                                      >
                                        <span className="sr-only">
                                          {fb.status === "approved" ? "Published (ON)" : "Unpublished (OFF)"}
                                        </span>
                                        <span
                                          aria-hidden="true"
                                          className={`pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${fb.status === "approved" ? "translate-x-5" : "translate-x-0"
                                            }`}
                                        >
                                          {fb.status === "approved" ? (
                                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                          ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                          )}
                                        </span>
                                      </button>
                                    </div>

                                    {/* Text publication state (does not rely on color alone) */}
                                    <div id={`publish-status-text-${fb.id}`} className="flex items-center gap-1.5 text-[10px]">
                                      <span
                                        className={`font-bold px-1.5 py-0.5 rounded tracking-wide ${fb.status === "approved"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : fb.status === "rejected"
                                            ? "bg-rose-100 text-rose-800"
                                            : "bg-gray-100 text-gray-600"
                                          }`}
                                      >
                                        {fb.status === "approved"
                                          ? "ON • Live on site"
                                          : fb.status === "rejected"
                                            ? "OFF • Rejected"
                                            : "OFF • Pending"}
                                      </span>
                                    </div>
                                  </div>

                                  {/* 2. COMPACT ACTION ICONS (Edit, Delete) */}
                                  <div className="flex items-center gap-1.5 pt-1">

                                    {/* Edit Button: Icon Only */}
                                    <button
                                      type="button"
                                      onClick={() => startEditFeedback(fb)}
                                      title={`Edit review details for ${fb.name}`}
                                      aria-label={`Edit review details for ${fb.name}`}
                                      className="p-2 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[#C98A84]"
                                    >
                                      <Pencil className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                                    </button>

                                    {/* Delete Button: Icon Only */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFeedback(fb.id, fb.name)}
                                      title={`Permanently delete feedback submission by ${fb.name}`}
                                      aria-label={`Permanently delete feedback submission by ${fb.name}`}
                                      className="p-2 rounded-xl text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-red-400"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      <AdminTablePagination
                        currentPage={feedbackPage}
                        totalItems={filtered.length}
                        pageSize={ITEMS_PER_PAGE}
                        onPageChange={setFeedbackPage}
                      />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>


      {/* ── KUTTY'S STORY: Add / Edit Modal ── */}
      {kuttysStoryModalOpen && editingKuttysStory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150 my-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-[#C98A84] uppercase tracking-wider">Kutty's Story</span>
                <h3 className="text-lg font-bold text-gray-900">{editingKuttysStory.id ? `Edit Story — ${editingKuttysStory.child_name}` : "Add New Kid Story"}</h3>
              </div>
              <button
                type="button"
                onClick={() => { setKuttysStoryModalOpen(false); setEditingKuttysStory(null); }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveKuttysStory} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Child Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav S."
                    value={editingKuttysStory.child_name || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, child_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Child Age</label>
                  <input
                    type="text"
                    placeholder="e.g. 5 ¾ yrs"
                    value={editingKuttysStory.child_age || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, child_age: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Child Title / Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Chief T-Rex Whisperer 🦖"
                    value={editingKuttysStory.child_title || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, child_title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Chennai"
                    value={editingKuttysStory.city || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, city: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-800 block mb-1">Choose Storybook from Site *</label>
                  <select
                    value={editingKuttysStory.storybook_slug || ""}
                    onChange={(e) => {
                      const selectedSlug = e.target.value;
                      const bookList = stories && stories.length > 0
                        ? stories.map((s) => ({ title: s.title, slug: s.slug }))
                        : [
                          { title: "Dinosaur", slug: "dinosaur" },
                          { title: "The Girl and the Magical Unicorn", slug: "unicorn-story" },
                          { title: "The Moon Story", slug: "the-moon-story" },
                          { title: "Baking Story", slug: "baking-story" },
                          { title: "Doctor Story", slug: "doctor-story" },
                          { title: "Nature Explorer", slug: "nature-explorer" },
                          { title: "The Race", slug: "the-race" },
                          { title: "New Story", slug: "new-story" },
                        ];
                      const found = bookList.find((b) => b.slug === selectedSlug);
                      if (found) {
                        setEditingKuttysStory({
                          ...editingKuttysStory,
                          storybook_slug: found.slug,
                          storybook_title: found.title,
                        });
                      } else {
                        setEditingKuttysStory({
                          ...editingKuttysStory,
                          storybook_slug: selectedSlug,
                        });
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84] bg-white font-medium"
                  >
                    <option value="" disabled>-- Select a book from our site --</option>
                    {(stories && stories.length > 0 ? stories : [
                      { title: "Dinosaur", slug: "dinosaur" },
                      { title: "The Girl and the Magical Unicorn", slug: "unicorn-story" },
                      { title: "The Moon Story", slug: "the-moon-story" },
                      { title: "Baking Story", slug: "baking-story" },
                      { title: "Doctor Story", slug: "doctor-story" },
                      { title: "Nature Explorer", slug: "nature-explorer" },
                      { title: "The Race", slug: "the-race" },
                      { title: "New Story", slug: "new-story" },
                    ]).map((b) => (
                      <option key={b.slug} value={b.slug}>
                        {b.title} ({b.slug})
                      </option>
                    ))}
                    <option value="custom">Custom Story (type below)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Storybook Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Dinosaur"
                    value={editingKuttysStory.storybook_title || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, storybook_title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Storybook Slug (URL)</label>
                  <input
                    type="text"
                    placeholder="e.g. dinosaur"
                    value={editingKuttysStory.storybook_slug || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, storybook_slug: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1">Kid Quote (In Child's Own Words) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Write exactly what the child said — funny, innocent, authentic! 🎉"
                  value={editingKuttysStory.kid_quote || ""}
                  onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, kid_quote: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84] resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1">Parent Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Mom note: He wouldn't let go of the book for 3 days!"
                  value={editingKuttysStory.parent_note || ""}
                  onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, parent_note: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Cartoon Avatar</label>
                  <select
                    value={editingKuttysStory.avatar_preset || "cartoon_dino_boy"}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, avatar_preset: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  >
                    <option value="cartoon_dino_boy">🦖 Dino Boy</option>
                    <option value="cartoon_unicorn_girl">🦄 Unicorn Girl</option>
                    <option value="cartoon_astronaut_boy">🚀 Astronaut Boy</option>
                    <option value="cartoon_baker_girl">🧁 Baker Girl</option>
                    <option value="cartoon_hero_boy">⚡ Superhero Boy</option>
                    <option value="cartoon_detective_girls">🔍 Detective Kids</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Custom Avatar URL (overrides above)</label>
                  <input
                    type="text"
                    placeholder="https://... or leave blank for cartoon"
                    value={editingKuttysStory.avatar_url || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, avatar_url: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Badge Label</label>
                  <input
                    type="text"
                    placeholder="e.g. 🦖 Dino Tamer Certified"
                    value={editingKuttysStory.badge || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, badge: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Star Rating Label</label>
                  <input
                    type="text"
                    placeholder="e.g. 1,000,000 / 10 ⭐"
                    value={editingKuttysStory.rating_label || ""}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, rating_label: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={editingKuttysStory.display_order || 1}
                    onChange={(e) => setEditingKuttysStory({ ...editingKuttysStory, display_order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <label className="font-semibold text-gray-800">Active / Visible on Site</label>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editingKuttysStory.is_active}
                    onClick={() => setEditingKuttysStory({ ...editingKuttysStory, is_active: !editingKuttysStory.is_active })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C98A84] focus:ring-offset-2 ${editingKuttysStory.is_active ? "bg-emerald-500" : "bg-gray-300"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-flex h-5 w-5 items-center justify-center transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editingKuttysStory.is_active ? "translate-x-5" : "translate-x-0"}`}
                    >
                      {editingKuttysStory.is_active ? <Check className="w-3 h-3 text-emerald-600" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setKuttysStoryModalOpen(false); setEditingKuttysStory(null); }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKuttysStory}
                  className="px-5 py-2 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingKuttysStory ? <><RefreshCw className="w-3 h-3 animate-spin" /> Saving…</> : (editingKuttysStory.id ? "Save Changes" : "Add Story")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Feedback */}
      {editingFeedback && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-[#C98A84] uppercase tracking-wider">Feedback Review</span>
                <h3 className="text-lg font-bold text-gray-900">Edit Submission Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingFeedback(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFeedbackEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-800 block mb-1">Author Name *</label>
                <input
                  type="text"
                  required
                  value={editFeedbackForm.name}
                  onChange={(e) => setEditFeedbackForm({ ...editFeedbackForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1">Place / City *</label>
                <input
                  type="text"
                  required
                  value={editFeedbackForm.place}
                  onChange={(e) => setEditFeedbackForm({ ...editFeedbackForm, place: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1">Rating *</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditFeedbackForm({ ...editFeedbackForm, rating: star })}
                      className="p-1 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 transition ${star <= editFeedbackForm.rating
                          ? "text-amber-400 fill-amber-400"
                          : "text-gray-200 fill-gray-100"
                          }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-700 ml-2">
                    {editFeedbackForm.rating} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1">Review Text (Optional)</label>
                <textarea
                  rows={4}
                  value={editFeedbackForm.review_text}
                  onChange={(e) => setEditFeedbackForm({ ...editFeedbackForm, review_text: e.target.value })}
                  placeholder="Review comments or leave blank"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#C98A84] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingFeedback(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFeedbackEdit}
                  className="px-5 py-2 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {savingFeedbackEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Uploaded Media */}
      {viewingMedia && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[11px] font-semibold text-[#C98A84] uppercase tracking-wider">Attached Media</span>
                <h3 className="text-base font-bold text-gray-900">Uploaded by {viewingMedia.author}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingMedia(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-gray-900 flex items-center justify-center max-h-[65vh]">
              {viewingMedia.type === "video" ? (
                <video
                  controls
                  autoPlay
                  className="max-h-[65vh] w-full"
                  src={viewingMedia.url}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={viewingMedia.url}
                  alt={`Attachment by ${viewingMedia.author}`}
                  className="max-h-[65vh] object-contain mx-auto"
                />
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
              <span className="text-[11px]">Media is only visible to the public after this review is approved.</span>
              <button
                type="button"
                onClick={() => setViewingMedia(null)}
                className="px-4 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Order Details Drawer/Dialog */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 overflow-hidden my-auto">
            {/* Header (Sticky, always visible) */}
            <div className="px-6 py-4 sm:px-7 sm:py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <span className="text-[11px] font-bold text-[#C98A84] uppercase tracking-wider">Order Details</span>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{selectedOrder.order_number || selectedOrder.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 sm:p-7 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <span className="text-gray-400 block font-medium text-[11px]">Customer</span>
                  <strong className="text-gray-900 text-sm mt-0.5 block">{selectedOrder.customer_name}</strong>
                  <span className="text-gray-500 text-[11px] break-all">{selectedOrder.customer_email || "customer@example.com"}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100">
                  <span className="text-gray-400 block font-medium text-[11px]">Total Amount</span>
                  <strong className="text-gray-900 text-sm mt-0.5 block">
                    ₹{selectedOrder.amount ? Number(selectedOrder.amount).toLocaleString("en-IN") : "1,299"}
                  </strong>
                  <span className="text-emerald-600 font-semibold text-[11px] uppercase">{selectedOrder.payment_status}</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1.5">Update Order Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {["In Production", "Paid", "Delivered", "Shipped", "Pending"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                      className={`py-2 px-2.5 rounded-xl font-semibold transition text-xs cursor-pointer text-center ${selectedOrder.status === st
                        ? "bg-[#C98A84] text-white shadow-xs"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 text-gray-600">
                  <span className="font-semibold text-gray-900 block mb-1 text-[11px]">Format Specification</span>
                  <div className="flex items-center gap-2">
                    {selectedOrder.format_type === "digital" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        <BookOpen className="w-3 h-3" /> Digital PDF Edition
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Package className="w-3 h-3" /> Premium Hardcover Keepsake (8×8")
                      </span>
                    )}
                  </div>
                </div>

                {/* Razorpay Payment Reference */}
                <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 text-gray-600 space-y-1">
                  <span className="font-semibold text-gray-900 block mb-1 text-[11px]">Payment Reference</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Payment ID</span>
                      <span className="font-mono text-gray-800 font-medium truncate block" title={selectedOrder.razorpay_payment_id || selectedOrder.payment_intent_id || "N/A"}>
                        {selectedOrder.razorpay_payment_id || selectedOrder.payment_intent_id || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Razorpay Order</span>
                      <span className="font-mono text-gray-800 font-medium truncate block" title={selectedOrder.razorpay_order_id || "Direct"}>
                        {selectedOrder.razorpay_order_id || "Direct"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping & Tracking Information for Shipped Orders */}
              {(selectedOrder.status === "Shipped" || selectedOrder.tracking_number || selectedOrder.shipping_carrier) && (
                <div className="p-4 rounded-2xl bg-[#FAEEED]/70 border border-[#EBE3D9] text-gray-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#2D222A] text-xs flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#C98A84]" />
                      <span>Courier & Tracking Details</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShippingModal({
                          isOpen: true,
                          order: selectedOrder,
                          carrier: selectedOrder.shipping_carrier || "Delhivery",
                          trackingNumber: selectedOrder.tracking_number || "",
                          trackingUrl: selectedOrder.tracking_url || "",
                        });
                      }}
                      className="text-[11px] font-bold text-[#C98A84] hover:underline cursor-pointer"
                    >
                      Edit Tracking
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-gray-500 block">Carrier</span>
                      <strong className="text-gray-900">{selectedOrder.shipping_carrier || "Not specified"}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Tracking / AWB Number</span>
                      <strong className="text-gray-900 font-mono">{selectedOrder.tracking_number || "Not specified"}</strong>
                    </div>
                  </div>
                  {selectedOrder.tracking_url && (
                    <div className="pt-1.5 border-t border-[#EBE3D9]/60 flex items-center justify-between text-[11px] flex-wrap gap-1">
                      <span className="text-gray-500">Live Courier Tracking:</span>
                      <a
                        href={selectedOrder.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-[#C98A84] hover:underline inline-flex items-center gap-1"
                      >
                        <span>Open Tracking Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {selectedOrder.shipped_at && (
                    <div className="text-[10px] text-gray-400">
                      Shipped on: {new Date(selectedOrder.shipped_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {/* Shipping Address Details for Hardcover */}
              {selectedOrder.shipping_address && (() => {
                try {
                  const addr = JSON.parse(selectedOrder.shipping_address);
                  return (
                    <div className="p-4 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] text-gray-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 text-xs flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" />
                          <span>Shipping Address</span>
                        </span>
                        {addr.state && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {addr.state}
                          </span>
                        )}
                      </div>
                      <div className="text-xs space-y-0.5 pt-1">
                        <p className="font-semibold text-gray-900">{addr.full_name || selectedOrder.customer_name} {addr.phone ? `• ${addr.phone}` : ""}</p>
                        <p>{addr.street_address}</p>
                        {addr.landmark && <p className="text-gray-500">Landmark: {addr.landmark}</p>}
                        <p>{addr.city ? `${addr.city}, ` : ""}{addr.state || ""} {addr.pincode ? `- ${addr.pincode}` : ""}</p>
                      </div>
                    </div>
                  );
                } catch (e) {
                  return (
                    <div className="p-3 rounded-xl bg-gray-50 text-xs text-gray-600">
                      <strong>Address:</strong> {selectedOrder.shipping_address}
                    </div>
                  );
                }
              })()}

              {selectedOrder.job_id && (
                <div className="p-3 rounded-2xl bg-gray-50 flex items-center gap-2 flex-wrap">
                  <a
                    href={api.resolveUrl(`/api/v1/personalization/${selectedOrder.job_id}/print-pdf?size=8x8&color=admin_preview&token=${encodeURIComponent(authService.getToken() || "")}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-[#C98A84] text-white font-semibold text-[11px] flex items-center gap-1.5 hover:bg-[#B87A74] transition shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Print-Ready PDF</span>
                  </a>
                  {(selectedOrder.format_type === "print_hardcover" || selectedOrder.format_type === "hardcover") && (
                    <a
                      href={api.resolveUrl(`/api/v1/personalization/${selectedOrder.job_id}/cover-page?token=${encodeURIComponent(authService.getToken() || "")}`)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-[#8B3DFF] text-white font-semibold text-[11px] flex items-center gap-1.5 hover:bg-[#7828F7] transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Cover Page</span>
                    </a>
                  )}
                  <a
                    href={`/personalize?job_id=${selectedOrder.job_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-gray-200 text-gray-800 font-semibold text-[11px] flex items-center gap-1.5 hover:bg-gray-300 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Storybook</span>
                  </a>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-3.5 sm:px-7 sm:py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/60">
              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
              >
                Delete Order
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHIPPED STATUS: TRACKING & COURIER MODAL */}
      {shippingModal.isOpen && shippingModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 overflow-hidden my-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#FAEEED] text-[#C98A84] flex items-center justify-center font-bold shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Ship Order & Add Tracking</h3>
                  <p className="text-xs text-gray-500">
                    Order #{shippingModal.order.order_number || shippingModal.order.id} • {shippingModal.order.customer_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShippingModal({ isOpen: false, order: null, carrier: "Delhivery", trackingNumber: "", trackingUrl: "" })}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {/* Email destination indicator */}
              <div className="p-3.5 rounded-2xl bg-[#FAEEED]/80 border border-[#EBE3D9]/80 text-xs text-[#2D222A] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#C98A84] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span>When you confirm, tracking details will be emailed directly to: </span>
                  <strong className="font-semibold text-[#2D222A] underline break-all">
                    {shippingModal.order.customer_email || "Customer Email"}
                  </strong>
                  {!shippingModal.order.customer_email && (
                    <span className="text-red-500 block text-[11px] mt-0.5 font-medium">
                      (No customer email was saved for this order. Status will still update in database.)
                    </span>
                  )}
                </div>
              </div>

              {/* Field 1: Shipping Carrier Dropdown */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  1. Shipping Carrier *
                </label>
                <select
                  value={shippingModal.carrier}
                  onChange={(e) => handleCarrierChange(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                >
                  {SHIPPING_CARRIERS.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 2: Tracking Number */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  2. Tracking Number / AWB *
                </label>
                <input
                  type="text"
                  placeholder="e.g. DEL1234567890 or 12345678"
                  value={shippingModal.trackingNumber}
                  onChange={(e) => handleTrackingNumberChange(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 font-mono text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              {/* Field 3: Tracking URL */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  3. Tracking URL (Clickable by Customer)
                </label>
                <input
                  type="url"
                  placeholder="https://www.delhivery.com/track/package/..."
                  value={shippingModal.trackingUrl}
                  onChange={(e) => setShippingModal((prev) => ({ ...prev, trackingUrl: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Auto-generated from carrier template, or paste custom courier tracking link.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0 bg-gray-50/60">
              <button
                type="button"
                onClick={() => setShippingModal({ isOpen: false, order: null, carrier: "Delhivery", trackingNumber: "", trackingUrl: "" })}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmShipping}
                disabled={submittingShipping || !shippingModal.trackingNumber.trim()}
                className={`px-6 py-2.5 rounded-xl text-white font-bold flex items-center gap-2 transition text-xs shadow-md ${submittingShipping || !shippingModal.trackingNumber.trim()
                  ? "bg-gray-400 opacity-60 cursor-not-allowed shadow-none"
                  : "bg-[#C98A84] hover:bg-[#B87A74] shadow-[#C98A84]/25 hover:shadow-lg cursor-pointer"
                  }`}
              >
                {submittingShipping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Notification...</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" />
                    <span>Confirm & Send Shipping Email 🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Create New Order */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOrder}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xl font-bold text-gray-900">Create New Order</h3>
              <button
                type="button"
                onClick={() => setShowNewOrderModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-800 block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Zahra Adil"
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1">Customer Email (Optional)</label>
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="e.g. zahra.adil@example.com"
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Total (₹ INR)</label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-800 block mb-1">Initial Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  >
                    <option value="Paid">Paid</option>
                    <option value="In Production">In Production</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-800 block mb-1">Book Format</label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                >
                  <option value="print_hardcover">Hardcover Print Edition (₹1,299)</option>
                  <option value="print_softcover">Softcover Print Edition (₹799)</option>
                  <option value="digital">Digital PDF Edition (₹399)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowNewOrderModal(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingOrder}
                className="px-5 py-2.5 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-semibold disabled:opacity-50 transition"
              >
                {creatingOrder ? "Creating..." : "Save Order"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE A BOOK (Matching uploaded screenshot) */}
      {showNewBookModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 tracking-tight">Create a book</h3>
              <button
                type="button"
                onClick={() => setShowNewBookModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bookError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                {bookError}
              </div>
            )}

            <form onSubmit={handleCreateBook} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={newBookTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="The Great Space Rescue"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                />
              </div>

              {/* Slug and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Slug (URL id)</label>
                  <input
                    type="text"
                    required
                    value={newBookSlug}
                    onChange={(e) => {
                      setNewBookSlug(e.target.value);
                      setNewBookSlugTouched(true);
                    }}
                    placeholder="the-great-space-rescue"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                  <select
                    value={newBookCategory}
                    onChange={(e) => setNewBookCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                  >
                    <option value="ADVENTURE">ADVENTURE</option>
                    <option value="LEARNING">LEARNING</option>
                    <option value="BEDTIME">BEDTIME</option>
                    <option value="FANTASY">FANTASY</option>
                    <option value="VALUES">VALUES</option>
                    <option value="FAMILY">FAMILY</option>
                    <option value="CELEBRATION">CELEBRATION</option>
                  </select>
                </div>
              </div>

              {/* Min age and Max age */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Min age</label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    value={newBookMinAge}
                    onChange={(e) => setNewBookMinAge(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Max age</label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    value={newBookMaxAge}
                    onChange={(e) => setNewBookMaxAge(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                  />
                </div>
              </div>

              {/* PDF price and Print price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">PDF price (₹)</label>
                  <input
                    type="number"
                    value={newBookPdfPrice}
                    onChange={(e) => setNewBookPdfPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Print price (₹)</label>
                  <input
                    type="number"
                    value={newBookPrintPrice}
                    onChange={(e) => setNewBookPrintPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                  />
                </div>
              </div>

              {/* Total pages */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Total pages</label>
                <input
                  type="number"
                  min="4"
                  max="64"
                  value={newBookTotalPages}
                  onChange={(e) => setNewBookTotalPages(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                />
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tagline</label>
                <input
                  type="text"
                  value={newBookTagline}
                  onChange={(e) => setNewBookTagline(e.target.value)}
                  placeholder="Blast off on a cosmic mission across the galaxy."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#C98A84]/20 focus:border-[#C98A84] transition"
                />
              </div>

              {/* Upload PDF Section */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-gray-900">
                    <FileText className="w-3.5 h-3.5 text-[#C98A84]" />
                    Upload Storybook PDF (Optional)
                  </span>
                  <span className="text-[10px] text-[#C98A84] font-semibold bg-[#FAEEED] px-2 py-0.5 rounded-full border border-[#EBE3D9]">
                    Auto-imports all pages & cover
                  </span>
                </label>

                {!newBookPdfFile ? (
                  <label className="border-2 border-dashed border-gray-200 hover:border-[#C98A84] bg-gray-50/60 hover:bg-[#FAEEED]/20 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition group">
                    <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-[#C98A84] transition mb-1" />
                    <span className="text-xs font-semibold text-gray-700 group-hover:text-[#C98A84] transition">
                      Click to choose or drag & drop story PDF
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      Accepts standard storybook .pdf files (Pages rendered at 150 DPI)
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setNewBookPdfFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAEEED]/80 border border-[#EBE3D9]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#C98A84] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {newBookPdfFile.name}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {(newBookPdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for auto-import & page rendering
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewBookPdfFile(null)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition shrink-0 ml-2"
                      title="Remove PDF"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>


              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewBookModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBook}
                  className="px-6 py-2.5 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-semibold text-xs shadow-md shadow-[#C98A84]/25 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {creatingBook && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {creatingBook
                      ? (newBookPdfFile ? "Importing & Rendering PDF Pages..." : "Creating Book...")
                      : (newBookPdfFile ? "Import & Create Book" : "Create Book")}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT AGE RANGE & PRICING */}
      {showEditAgeModal && storyToEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Age Range & Pricing</h3>
                <p className="text-xs text-gray-500 mt-0.5">{storyToEdit.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditAgeModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAgeEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Min Age</label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    value={editMinAge}
                    onChange={(e) => setEditMinAge(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Max Age</label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    value={editMaxAge}
                    onChange={(e) => setEditMaxAge(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">PDF Price (₹)</label>
                  <input
                    type="number"
                    value={editPdfPrice}
                    onChange={(e) => setEditPdfPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Print Price (₹)</label>
                  <input
                    type="number"
                    value={editPrintPrice}
                    onChange={(e) => setEditPrintPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                >
                  <option value="ADVENTURE">ADVENTURE</option>
                  <option value="LEARNING">LEARNING</option>
                  <option value="BEDTIME">BEDTIME</option>
                  <option value="FANTASY">FANTASY</option>
                  <option value="VALUES">VALUES</option>
                  <option value="FAMILY">FAMILY</option>
                  <option value="CELEBRATION">CELEBRATION</option>
                </select>
              </div>

              {/* Story Highlight Badge (Latest / Best Seller) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Story Badge</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditHighlight(null)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1 ${editHighlight === null
                      ? "bg-gray-800 text-white border-gray-800 shadow-xs"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                      }`}
                  >
                    <span>None</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditHighlight("latest")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${editHighlight === "latest"
                      ? "bg-[#C98A84] text-white border-[#C98A84] shadow-xs"
                      : "bg-[#FAEEED] text-[#C98A84] border-[#C98A84]/40 hover:bg-[#FAEEED]/80"
                      }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Latest</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditHighlight("best_seller")}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${editHighlight === "best_seller"
                      ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                      : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                      }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Best Seller</span>
                  </button>
                </div>
              </div>

              {/* In Hero Carousel Toggle */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#C98A84]" />
                    Feature in Homepage Hero Carousel
                  </span>
                  <p className="text-[11px] text-gray-500">Show in the rotating 5-slide hero carousel on homepage.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={editInHeroCarousel}
                    onChange={(e) => setEditInHeroCarousel(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#C98A84]"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditAgeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAgeEdit}
                  className="px-5 py-2.5 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-semibold text-xs shadow-md shadow-[#C98A84]/25 transition flex items-center gap-2"
                >
                  {savingAgeEdit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{savingAgeEdit ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TEST RENDER A BOOK */}
      {showTestRenderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#C98A84]" />
                  <span>Test Render a Book</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Launch a high-fidelity personalization preview session with character consistency.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTestRenderModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTestRender} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Select Story Template
                </label>
                <select
                  value={testRenderStoryId}
                  onChange={(e) => setTestRenderStoryId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  required
                >
                  {stories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Child Name
                </label>
                <input
                  type="text"
                  value={testRenderChildName}
                  onChange={(e) => setTestRenderChildName(e.target.value)}
                  placeholder="Enter child's name..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C98A84]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Child Photo (Optional reference)
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#C98A84]/40 transition bg-gray-50/50">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setTestRenderPhotoFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="testRenderPhotoInput"
                  />
                  <label
                    htmlFor="testRenderPhotoInput"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs font-semibold text-[#C98A84]">
                      {testRenderPhotoFile ? testRenderPhotoFile.name : "Click to upload child photo"}
                    </span>
                    <span className="text-[11px] text-gray-400">PNG, JPG or WebP up to 10MB</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTestRenderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTestRender}
                  className="px-5 py-2.5 rounded-xl bg-[#C98A84] hover:bg-[#B87A74] text-white font-semibold text-xs shadow-md shadow-[#C98A84]/25 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingTestRender && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submittingTestRender ? "Generating Preview..." : "✨ Launch Test Render"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PHOTOS & GENERATED PREVIEW ASSETS */}
      {selectedJobForPhotos && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-[#C98A84]" />
                  <span>Preview Assets - {selectedJobForPhotos.child_name}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedJobForPhotos.story_title || "Personalized Story"} • Status:{" "}
                  <span className="font-semibold text-gray-700">{selectedJobForPhotos.status}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobForPhotos(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Child Reference Photo */}
            <div className="bg-[#FAEEED]/60 p-4 rounded-2xl border border-[#EBE3D9] flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#FAEEED] shrink-0 border-2 border-white shadow-xs">
                {selectedJobForPhotos.photo_url ? (
                  <img
                    src={selectedJobForPhotos.photo_url}
                    alt={selectedJobForPhotos.child_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#B87A74] font-bold text-xl">
                    {selectedJobForPhotos.child_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <span className="text-[11px] font-bold text-[#C98A84] uppercase tracking-wide">
                  Child Reference Photo
                </span>
                <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                  {selectedJobForPhotos.child_name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Used as facial consistency prompt across all illustration plates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedJobForPhotos, "print")}
                  title="Download complete print-ready PDF with all pages in 8×8 RGB"
                  className="px-3.5 py-2 rounded-xl bg-[#C98A84] text-white hover:bg-[#B87A74] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print PDF (8×8 RGB)</span>
                </button>
                {(selectedJobForPhotos.format_type === "print_hardcover" || selectedJobForPhotos.format_type === "hardcover" || (selectedJobForPhotos as any).is_hardcover) && (selectedJobForPhotos.status === "completed" || (selectedJobForPhotos.completed_pages || 0) >= 24) && (
                  <button
                    type="button"
                    onClick={() => handleDownloadCover(selectedJobForPhotos)}
                    title="Download Hard Copy Cover Page Wrap (46.6×27.6 cm with 3mm bleed • Front + Spine + Back)"
                    className="px-3.5 py-2 rounded-xl bg-[#8B3DFF] text-white hover:bg-[#7828F7] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cover Page</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedJobForPhotos, "preview")}
                  title="Download 3-page preview PDF"
                  className="px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                  <span>Preview PDF</span>
                </button>
              </div>
            </div>

            {/* Generated Pages Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-800">
                  Rendered Preview Plates
                </h4>
                <span className="text-xs text-gray-400">
                  {selectedJobForPhotos.assets?.length || 0} plates available
                </span>
              </div>

              {selectedJobForPhotos.assets && selectedJobForPhotos.assets.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  {selectedJobForPhotos.assets.map((asset, idx) => (
                    <div
                      key={asset.id || idx}
                      className="group relative bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-xs hover:shadow-md transition"
                    >
                      <div className="aspect-square w-full overflow-hidden bg-gray-200">
                        <img
                          src={asset.image_url}
                          alt={`Page ${asset.page_number || idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>
                      <div className="p-2.5 bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-gray-800">
                            Page {asset.page_number || idx + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {selectedJobForPhotos?.is_paid || (asset.page_number && asset.page_number > 3) ? "Full Edition" : "Free Preview"}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {(asset as any).prompt || (asset as any).caption || `Scene illustration for ${selectedJobForPhotos.child_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-gray-50/60 rounded-2xl border border-gray-100 text-gray-400 text-xs">
                  <ImageIcon className="w-8 h-8 mx-auto text-gray-300 mb-2 stroke-1" />
                  <p className="font-semibold text-gray-600">No generated preview plates yet</p>
                  <p className="text-gray-400 text-[11px] mt-0.5">
                    Preview plates will appear here once illustration generation is triggered.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Created: {formatAdminTimestamp(selectedJobForPhotos.created_at, selectedJobForPhotos.created_formatted)}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`/personalize/${selectedJobForPhotos.story_slug || ""}?job_id=${selectedJobForPhotos.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Interactive Reader</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedJobForPhotos(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FULL BOOK HD GENERATION PROGRESS MODAL */}
      {generatingFullJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBE3D9] relative overflow-hidden">
            {/* Ambient background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#C98A84]/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#FAEEED] border border-[#EBE3D9] flex items-center justify-center text-[#C98A84]">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Generating Full HD Storybook
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {generatingFullJob.child_name} · {generatingFullJob.story_title || "Storybook"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGeneratingFullJob(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition cursor-pointer"
                title="Run in background"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Section */}
            {(() => {
              const total = generatingFullJob.total_pages || 24;
              const completed = generatingFullJob.completed_pages || 0;
              const pct = Math.min(100, Math.round((completed / total) * 100));
              const isFinished = completed >= total && (generatingFullJob.status === "completed" || !generatingFullJob.status?.includes("Rendering"));

              return (
                <div className="my-5 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-800">
                      {isFinished ? "✅ Complete! Downloading PDF..." : (generatingFullJob.current_stage || `Rendering Page ${completed + 1} of ${total}`)}
                    </span>
                    <span className="font-bold text-[#C98A84] text-sm">{pct}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden p-0.5 border border-gray-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#C98A84] via-[#C98A84] to-pink-500 transition-all duration-500 shadow-xs"
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>8×8 Vibrant RGB Print Engine</span>
                    <span className="font-medium text-gray-600">{completed} of {total} plates ready</span>
                  </div>
                </div>
              );
            })()}

            {/* Quality assurance notice */}
            <div className="bg-[#FAEEED]/70 rounded-2xl p-3.5 border border-[#EBE3D9] text-xs text-[#2D222A] flex items-start gap-2.5 mb-5">
              <Sparkles className="w-4 h-4 text-[#C98A84] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-[#2D222A]">CodeFormer Neural Face Restoration Active</p>
                <p className="text-[11px] text-[#B87A74] leading-relaxed">
                  Every single illustration plate is enhanced with deep facial alignment and CodeFormer restoration for 100% authentic photographic likeness.
                </p>
              </div>
            </div>

            {/* Action footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Auto-downloads upon completion
              </span>
              <button
                type="button"
                onClick={() => setGeneratingFullJob(null)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold transition cursor-pointer"
              >
                Run in background
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
