import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  BookOpen,
  Package,
  Check,
  ShieldCheck,
  Truck,
  Download,
  ArrowRight,
  ChevronLeft,
  CreditCard,
  MapPin,
  Lock,
  CheckCircle2,
  AlertCircle,
  PartyPopper,
  Tag,
  Percent,
  Gift,
  Languages
} from "lucide-react";
import { api, StoryTemplate, PersonalizationJob } from "@/lib/api";
import { loadRazorpayCheckout } from "@/lib/razorpay";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import PdfDownloadModal from "./PdfDownloadModal";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/seo/siteConfig";

// 28 Indian States + UTs mapped to the IDs expected by backend State Sales analytics
export const INDIAN_STATES = [
  { id: "tn", name: "Tamil Nadu" },
  { id: "kl", name: "Kerala" },
  { id: "ka", name: "Karnataka" },
  { id: "ap", name: "Andhra Pradesh" },
  { id: "tg", name: "Telangana" },
  { id: "mh", name: "Maharashtra" },
  { id: "dl", name: "Delhi (NCR)" },
  { id: "gj", name: "Gujarat" },
  { id: "up", name: "Uttar Pradesh" },
  { id: "wb", name: "West Bengal" },
  { id: "rj", name: "Rajasthan" },
  { id: "pb", name: "Punjab" },
  { id: "hr", name: "Haryana" },
  { id: "mp", name: "Madhya Pradesh" },
  { id: "br", name: "Bihar" },
  { id: "or", name: "Odisha" },
  { id: "as", name: "Assam" },
  { id: "jh", name: "Jharkhand" },
  { id: "ct", name: "Chhattisgarh" },
  { id: "ut", name: "Uttarakhand" },
  { id: "hp", name: "Himachal Pradesh" },
  { id: "ga", name: "Goa" },
  { id: "tr", name: "Tripura" },
  { id: "ml", name: "Meghalaya" },
  { id: "mn", name: "Manipur" },
  { id: "nl", name: "Nagaland" },
  { id: "mz", name: "Mizoram" },
  { id: "ar", name: "Arunachal Pradesh" },
  { id: "sk", name: "Sikkim" },
];

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: PersonalizationJob;
  story?: StoryTemplate | null;
  selectedLanguage?: string;
  onPaymentSuccess: (orderInfo: {
    order_number: string;
    format_type: string;
    amount: number;
  }) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  job,
  story,
  selectedLanguage = "english",
  onPaymentSuccess,
}: PaymentModalProps) {
  if (!isOpen) return null;

  const [selectedFormat, setSelectedFormat] = useState<"digital" | "print_hardcover">("digital");
  const [step, setStep] = useState<"select_product" | "shipping_address" | "processing" | "success">("select_product");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [viewingLegalDoc, setViewingLegalDoc] = useState<"privacy" | "terms" | null>(null);

  // Coupon / Promo code state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<{
    percent: number;
    amount: number;
    message: string;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [copiedCouponHint, setCopiedCouponHint] = useState<string | null>(null);

  // Hardcopy Gift Wrapping & Language Surcharge states
  const [isGiftWrap, setIsGiftWrap] = useState<boolean>(false);
  const [pricingRules, setPricingRules] = useState({
    defaultPdfPrice: 799,
    defaultHardcoverPrice: 1399,
    languageSurcharge: 99,
    giftWrapFee: 20,
    giftWrapEnabled: true,
  });

  // Shipping form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [stateId, setStateId] = useState("tn");
  const [pincode, setPincode] = useState("");

  // Success state details
  const [completedOrder, setCompletedOrder] = useState<{
    order_number: string;
    format_type: string;
    amount: number;
  } | null>(null);

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

  // Fetch admin-configured pricing rules from SiteSettings (Offers & Banner)
  useEffect(() => {
    if (!isOpen) return;
    api.getAnnouncement().then((ann) => {
      if (ann) {
        setPricingRules({
          defaultPdfPrice: Number(ann.default_pdf_price) || 799,
          defaultHardcoverPrice: Number(ann.default_hardcover_price) || 1399,
          languageSurcharge: ann.regional_language_surcharge !== undefined ? Number(ann.regional_language_surcharge) : 99,
          giftWrapFee: ann.gift_wrap_fee !== undefined ? Number(ann.gift_wrap_fee) : 20,
          giftWrapEnabled: ann.gift_wrap_enabled !== false,
        });
      }
    }).catch(() => {});
  }, [isOpen]);

  // Language & Regional Surcharge evaluation
  const currentLanguage = (selectedLanguage || job.language || "english").toLowerCase().trim();
  const isRegionalLanguage = currentLanguage !== "english" && currentLanguage !== "";
  const formattedLanguage = currentLanguage ? (currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)) : "Regional";
  const languageSurchargeAmount = isRegionalLanguage ? pricingRules.languageSurcharge : 0;

  // Gift wrap fee
  const giftWrapAmount = (selectedFormat === "print_hardcover" && isGiftWrap && pricingRules.giftWrapEnabled)
    ? pricingRules.giftWrapFee
    : 0;

  const digitalPrice = story?.price_digital || pricingRules.defaultPdfPrice || 799;
  const printPrice = story?.price_print || pricingRules.defaultHardcoverPrice || 1399;
  const childName = job.child_name || "Your Child";

  // Subtotals before discount
  const digitalSubtotal = digitalPrice + languageSurchargeAmount;
  const printSubtotal = printPrice + languageSurchargeAmount + (isGiftWrap && pricingRules.giftWrapEnabled ? pricingRules.giftWrapFee : 0);
  const basePrice = selectedFormat === "print_hardcover" ? printPrice : digitalPrice;
  const currentSubtotal = selectedFormat === "print_hardcover" ? printSubtotal : digitalSubtotal;

  // Dynamic pricing with coupon discount
  const discountAmount = couponDiscount
    ? Math.round(currentSubtotal * (couponDiscount.percent / 100))
    : 0;
  const finalPrice = Math.max(0, currentSubtotal - discountAmount);

  const digitalDiscount = couponDiscount
    ? Math.round(digitalSubtotal * (couponDiscount.percent / 100))
    : 0;
  const digitalFinalPrice = Math.max(0, digitalSubtotal - digitalDiscount);

  const printDiscount = couponDiscount
    ? Math.round(printSubtotal * (couponDiscount.percent / 100))
    : 0;
  const printFinalPrice = Math.max(0, printSubtotal - printDiscount);

  // Auto-detect promo code copied by user from top announcement ticker
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = sessionStorage.getItem("kuttystory_copied_coupon");
      if (stored && stored.trim()) {
        const clean = stored.trim().toUpperCase();
        setCopiedCouponHint(clean);
        if (!appliedCoupon) {
          setCouponInput(clean);
        }
      }
    } catch {}
  }, [isOpen]);

  useEffect(() => {
    const handleCopiedEvent = (e: any) => {
      const code = e?.detail;
      if (code && typeof code === "string") {
        const clean = code.trim().toUpperCase();
        setCopiedCouponHint(clean);
        if (!appliedCoupon) {
          setCouponInput(clean);
        }
      }
    };
    window.addEventListener("kuttystory_coupon_copied", handleCopiedEvent);
    return () => window.removeEventListener("kuttystory_coupon_copied", handleCopiedEvent);
  }, [appliedCoupon]);

  const handleApplyCoupon = async (codeOverride?: string) => {
    const rawCode = codeOverride !== undefined ? codeOverride : couponInput;
    const cleanCode = (rawCode || "").trim().toUpperCase();
    if (!cleanCode) {
      setCouponError("Please enter a promo code.");
      return;
    }
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await api.validateCoupon(cleanCode, selectedFormat);
      if (res.valid) {
        setAppliedCoupon(res.code);
        setCouponDiscount({
          percent: res.discount_percent,
          amount: res.discount_amount,
          message: res.message,
        });
        setCouponInput(res.code);
        setCouponError("");
      } else {
        setCouponError(res.message || "Invalid or expired promo code.");
      }
    } catch (err: any) {
      setCouponError(err.message || "Invalid or expired promo code.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(null);
    setCouponError("");
  };

  // Validate shipping details for physical book
  const validateShipping = () => {
    if (!fullName.trim()) return "Please enter your full name.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      return "Please enter a valid email address (e.g. parent@example.com) for order & courier updates.";
    }
    if (!phoneNumber.trim() || phoneNumber.replace(/\D/g, "").length < 10) {
      return "Please enter a valid 10-digit mobile number.";
    }
    if (!streetAddress.trim() || streetAddress.trim().length < 5) {
      return "Please enter a complete delivery address.";
    }
    if (!city.trim()) return "Please enter your city/town.";
    if (!pincode.trim() || pincode.replace(/\D/g, "").length !== 6) {
      return "Please enter a valid 6-digit Indian PIN code.";
    }
    return null;
  };

  const handleProceedToPayment = async () => {
    setErrorMessage("");

    if (!agreedToTerms) {
      setErrorMessage("Please check the box to agree to the Terms of Service and Privacy Policy.");
      return;
    }

    if (selectedFormat === "print_hardcover" && step === "select_product") {
      setStep("shipping_address");
      return;
    }

    trackBeginCheckout({
      item_id: story?.slug || "unicorn-story",
      item_name: story?.title || "Personalised Storybook",
      price: Number(finalPrice),
      edition: selectedFormat,
      currency: "INR",
      coupon: appliedCoupon || undefined,
    });

    let shippingData = null;
    if (selectedFormat === "print_hardcover") {
      const valError = validateShipping();
      if (valError) {
        setErrorMessage(valError);
        return;
      }
      const stObj = INDIAN_STATES.find((s) => s.id === stateId);
      shippingData = {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phoneNumber.trim(),
        street_address: streetAddress.trim(),
        landmark: landmark.trim(),
        city: city.trim(),
        state: stObj?.name || "Tamil Nadu",
        state_id: stateId,
        pincode: pincode.trim(),
      };
    }

    setLoading(true);

    try {
      // 1. Create Order on Backend
      const orderRes = await api.createPaymentOrder({
        job_id: job.id,
        format_type: selectedFormat,
        shipping_address: shippingData,
        customer_name: fullName || `${childName}'s Family`,
        customer_email: email.trim() || undefined,
        customer_phone: phoneNumber,
        coupon_code: appliedCoupon || undefined,
        language: currentLanguage,
        is_gift_wrap: Boolean(selectedFormat === "print_hardcover" && isGiftWrap && pricingRules.giftWrapEnabled),
      });

      // 2. Launch Razorpay Checkout (Dynamically loaded on demand)
      await loadRazorpayCheckout();
      const isRazorpayAvailable = typeof (window as any).Razorpay === "function";

      if (isRazorpayAvailable) {
        const options = {
          key: orderRes.razorpay_key,
          amount: orderRes.amount,
          currency: orderRes.currency,
          name: "Kutty Story Atelier",
          description: `${selectedFormat === "digital" ? "Digital Edition" : "Hardcover Heirloom"} • ${story?.title || "Enchanted Storybook"}`,
          image: "/logo.png",
          order_id: orderRes.razorpay_order_id.startsWith("order_sim_") ? undefined : orderRes.razorpay_order_id,
          handler: async function (response: any) {
            try {
              setLoading(true);
              const verifyRes = await api.verifyPayment({
                job_id: job.id,
                format_type: selectedFormat,
                razorpay_order_id: response.razorpay_order_id || orderRes.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id || `pay_${Math.random().toString(36).substring(2, 10)}`,
                razorpay_signature: response.razorpay_signature || `simulated_sig_${Date.now()}`,
                shipping_address: shippingData,
                customer_name: fullName || `${childName}'s Family`,
                customer_email: email.trim() || undefined,
                customer_phone: phoneNumber,
                coupon_code: appliedCoupon || undefined,
                language: currentLanguage,
                is_gift_wrap: Boolean(selectedFormat === "print_hardcover" && isGiftWrap && pricingRules.giftWrapEnabled),
              });

              setCompletedOrder({
                order_number: verifyRes.order_number,
                format_type: verifyRes.format_type,
                amount: verifyRes.amount,
              });
              setStep("success");
              trackPurchase({
                order_id: verifyRes.order_number,
                value: verifyRes.amount,
                edition: verifyRes.format_type,
                currency: "INR",
                coupon: appliedCoupon || undefined,
              });
              onPaymentSuccess({
                order_number: verifyRes.order_number,
                format_type: verifyRes.format_type,
                amount: verifyRes.amount,
              });
            } catch (err: any) {
              setErrorMessage(err.message || "Payment verification failed. Please contact support.");
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: fullName || `${childName}'s Family`,
            email: email.trim() || undefined,
            contact: phoneNumber || "9876543210",
          },
          theme: {
            color: "#8B3DFF",
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        try {
          const rzp = new (window as any).Razorpay(options);
          rzp.on("payment.failed", function (response: any) {
            setErrorMessage(response.error?.description || "Payment failed or cancelled.");
            setLoading(false);
          });
          rzp.open();
          setLoading(false);
          return;
        } catch (rzpErr: any) {
          console.warn("Notice: Razorpay modal initialization error, falling back to instant sandbox verification:", rzpErr);
        }
      }

      // Offline / Test sandbox simulation fallback
      const verifyRes = await api.verifyPayment({
        job_id: job.id,
        format_type: selectedFormat,
        razorpay_order_id: orderRes.razorpay_order_id,
        razorpay_payment_id: `pay_test_${Math.random().toString(36).substring(2, 10)}`,
        razorpay_signature: `simulated_sig_${Date.now()}`,
        shipping_address: shippingData,
        customer_name: fullName || `${childName}'s Family`,
        customer_email: email.trim() || undefined,
        customer_phone: phoneNumber,
        coupon_code: appliedCoupon || undefined,
        language: currentLanguage,
        is_gift_wrap: Boolean(selectedFormat === "print_hardcover" && isGiftWrap && pricingRules.giftWrapEnabled),
      });

      setCompletedOrder({
        order_number: verifyRes.order_number,
        format_type: verifyRes.format_type,
        amount: verifyRes.amount,
      });
      setStep("success");
      trackPurchase({
        order_id: verifyRes.order_number,
        value: verifyRes.amount,
        edition: verifyRes.format_type,
        currency: "INR",
        coupon: appliedCoupon || undefined,
      });
      onPaymentSuccess({
        order_number: verifyRes.order_number,
        format_type: verifyRes.format_type,
        amount: verifyRes.amount,
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden relative my-auto animate-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#2D222A] via-[#3E2B38] to-[#2D222A] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#C98A84] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Kutty Story Keepsake Edition</span>
          </div>

          <h2 className="font-editorial-serif text-2xl sm:text-3xl font-bold text-[#FAF7F2]">
            {step === "success"
              ? "Storybook Unlocked! 🎉"
              : `Unlock ${childName}'s Full Adventure`}
          </h2>
          <p className="text-xs text-[#EBE3D9] mt-1 max-w-lg leading-relaxed">
            {step === "success"
              ? `Your order has been recorded. All 26+ pages of "${story?.title || "The Storybook"}" are now ready for instant download.`
              : `You have viewed the first 5 preview pages. Complete checkout to unlock all 26+ pages with high-definition realistic face fusion.`}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 space-y-5 max-h-[85vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: PRODUCT SELECTION */}
          {step === "select_product" && (
            <div className="space-y-6">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Select Your Storybook Edition
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* OPTION 1: DIGITAL EDITION */}
                <div
                  onClick={() => setSelectedFormat("digital")}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    selectedFormat === "digital"
                      ? "border-[#8B3DFF] bg-[#FAF5FF] shadow-md shadow-[#8B3DFF]/10 ring-2 ring-[#8B3DFF]/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#8B3DFF] flex items-center justify-center font-bold">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      {selectedFormat === "digital" && (
                        <span className="w-6 h-6 rounded-full bg-[#8B3DFF] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-editorial-serif text-lg font-bold text-gray-900">
                        Digital Storybook Edition
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Instant High-Resolution PDF
                      </p>
                    </div>

                    <div className="pt-2">
                      <span className="font-editorial-serif text-2xl font-bold text-gray-900">
                        ₹{Number(digitalFinalPrice).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-gray-500 ml-1.5 line-through">
                        {appliedCoupon ? `₹${Number(digitalSubtotal).toLocaleString("en-IN")}` : "₹1,199"}
                      </span>
                      {appliedCoupon && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          SAVE ₹{digitalDiscount}
                        </span>
                      )}
                    </div>

                    {/* Language Edition Indicator */}
                    <div className="pt-1">
                      {isRegionalLanguage ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100/80 text-[#8B3DFF] text-[11px] font-semibold">
                          <Languages className="w-3.5 h-3.5" />
                          <span>{formattedLanguage} Edition (+₹{pricingRules.languageSurcharge})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-medium">
                          <Languages className="w-3.5 h-3.5 text-gray-500" />
                          <span>English Edition (Standard Rate)</span>
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Instant access to all 26+ pages</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Print-ready 8×8 RGB PDF format</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>All Indian regional languages</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 text-[11px] font-semibold text-[#8B3DFF] flex items-center gap-1">
                    <span>Instant delivery via download</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>

                {/* OPTION 2: PREMIUM HARDCOVER BOOK */}
                <div
                  onClick={() => setSelectedFormat("print_hardcover")}
                  className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                    selectedFormat === "print_hardcover"
                      ? "border-[#C98A84] bg-[#FAEEED]/40 shadow-md shadow-[#C98A84]/15 ring-2 ring-[#C98A84]/25"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-[#C98A84] text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                    Heirloom Keepsake
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-[#FAEEED] text-[#C98A84] flex items-center justify-center font-bold">
                        <Package className="w-5 h-5" />
                      </div>
                      {selectedFormat === "print_hardcover" && (
                        <span className="w-6 h-6 rounded-full bg-[#C98A84] text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-editorial-serif text-lg font-bold text-gray-900">
                        Premium Hardcover Keepsake
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Printed Book + Instant Digital PDF
                      </p>
                    </div>

                    <div className="pt-2">
                      <span className="font-editorial-serif text-2xl font-bold text-gray-900">
                        ₹{Number(printFinalPrice).toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-gray-500 ml-1.5 line-through">
                        {appliedCoupon ? `₹${Number(printSubtotal).toLocaleString("en-IN")}` : "₹1,999"}
                      </span>
                      {appliedCoupon && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                          SAVE ₹{printDiscount}
                        </span>
                      )}
                    </div>

                    {/* Language Edition Indicator */}
                    <div className="pt-1">
                      {isRegionalLanguage ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FAEEED] text-[#C98A84] text-[11px] font-semibold">
                          <Languages className="w-3.5 h-3.5" />
                          <span>{formattedLanguage} Edition (+₹{pricingRules.languageSurcharge})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-medium">
                          <Languages className="w-3.5 h-3.5 text-gray-500" />
                          <span>English Edition (Standard Rate)</span>
                        </span>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs text-gray-600 pt-2 border-t border-gray-100">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Premium matte-laminated hardcover</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Free doorstep shipping across India</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Includes full Digital PDF edition</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-4 pt-3 text-[11px] font-semibold text-[#C98A84] flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    <span>Free shipping (3-5 business days)</span>
                  </div>
                </div>
              </div>

              {/* LUXURY GIFT WRAPPING OPTION (If Hardcopy selected and enabled in admin) */}
              {selectedFormat === "print_hardcover" && pricingRules.giftWrapEnabled && (
                <div
                  onClick={() => setIsGiftWrap(!isGiftWrap)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isGiftWrap
                      ? "border-[#C98A84] bg-[#FAEEED]/70 shadow-xs ring-1 ring-[#C98A84]/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isGiftWrap ? "bg-[#C98A84] text-white" : "bg-rose-50 text-[#C98A84]"
                    }`}>
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">Add Luxury Keepsake Gift Wrapping</span>
                        <span className="text-[11px] font-extrabold text-[#C98A84] bg-white px-2 py-0.5 rounded-full border border-[#C98A84]/30 shadow-xs">
                          +₹{pricingRules.giftWrapFee}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Handcrafted gold-foil wrap with personalized satin ribbon & keepsake greeting card.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 pl-2">
                    <input
                      type="checkbox"
                      id="gift-wrap-step1"
                      checked={isGiftWrap}
                      onChange={(e) => {
                        e.stopPropagation();
                        setIsGiftWrap(e.target.checked);
                      }}
                      className="w-4 h-4 rounded text-[#C98A84] focus:ring-[#C98A84] border-gray-300 accent-[#C98A84] cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* PROMO / COUPON CODE SECTION */}
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] transition-all">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#C98A84]" />
                    <span className="text-xs font-bold text-[#2D222A] uppercase tracking-wider">
                      Promo / Coupon Code
                    </span>
                  </div>
                  {appliedCoupon && (
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {couponDiscount?.percent}% OFF APPLIED
                    </span>
                  )}
                </div>

                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            if (couponError) setCouponError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleApplyCoupon();
                            }
                          }}
                          placeholder="Paste promo code (e.g. WELCOME20)"
                          className="w-full pl-3.5 pr-2 py-2.5 rounded-xl border border-gray-300 bg-white font-mono text-xs uppercase tracking-wider text-gray-900 placeholder:text-gray-400 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[#C98A84]/40 focus:border-[#C98A84]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        disabled={couponLoading || !couponInput.trim()}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                          couponLoading || !couponInput.trim()
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-[#2D222A] hover:bg-[#3D3039] active:scale-95 shadow-sm"
                        }`}
                      >
                        {couponLoading ? "Applying..." : "Apply Code"}
                      </button>
                    </div>

                    {/* Helpful suggestion pill if code is copied from top announcement banner */}
                    {copiedCouponHint && couponInput !== copiedCouponHint && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8B3DFF]">
                        <Sparkles className="w-3 h-3 text-[#8B3DFF]" />
                        <span>Copied from banner:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setCouponInput(copiedCouponHint);
                            handleApplyCoupon(copiedCouponHint);
                          }}
                          className="font-mono font-bold underline hover:text-[#7828f7] cursor-pointer"
                        >
                          Apply {copiedCouponHint} (20% OFF)
                        </button>
                      </div>
                    )}

                    {couponError && (
                      <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{couponError}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <Percent className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-[#2D222A]">{appliedCoupon}</span>
                          <span className="text-[11px] text-emerald-700 font-semibold">• You save ₹{discountAmount}</span>
                        </div>
                        <p className="text-[11px] text-gray-500">20% discount applied to your order</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-semibold text-gray-400 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* Itemized Price Breakdown */}
                <div className="mt-3 pt-2.5 border-t border-[#EBE3D9] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Base Edition ({selectedFormat === "digital" ? "Digital PDF" : "Hardcover Keepsake"})</span>
                    <span className="font-medium">₹{Number(basePrice).toLocaleString("en-IN")}</span>
                  </div>

                  {isRegionalLanguage && (
                    <div className="flex items-center justify-between text-purple-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Languages className="w-3.5 h-3.5 text-purple-600" />
                        <span>{formattedLanguage} Regional Edition Surcharge</span>
                      </span>
                      <span>+₹{Number(languageSurchargeAmount).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {selectedFormat === "print_hardcover" && isGiftWrap && pricingRules.giftWrapEnabled && (
                    <div className="flex items-center justify-between text-[#C98A84] font-medium">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-[#C98A84]" />
                        <span>Luxury Keepsake Gift Wrapping</span>
                      </span>
                      <span>+₹{Number(pricingRules.giftWrapFee).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="flex items-center justify-between text-emerald-700 font-semibold">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Promo Code Discount ({appliedCoupon})</span>
                      </span>
                      <span>-₹{Number(discountAmount).toLocaleString("en-IN")}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-gray-900 font-bold pt-1.5 border-t border-gray-200 text-sm">
                    <span>Total Payable</span>
                    <div className="flex items-baseline gap-1.5">
                      {appliedCoupon && (
                        <span className="text-xs text-gray-400 line-through font-normal">
                          ₹{Number(currentSubtotal).toLocaleString("en-IN")}
                        </span>
                      )}
                      <span className="text-[#8B3DFF] font-editorial-serif text-lg font-bold">
                        ₹{Number(finalPrice).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visible Terms & Privacy Policy Checkbox Card */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  !agreedToTerms
                    ? "bg-purple-50/60 border-purple-200/80 hover:bg-purple-50"
                    : "bg-emerald-50/50 border-emerald-200"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="agree-terms-step1"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked && errorMessage.includes("Terms")) {
                        setErrorMessage("");
                      }
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-[#8B3DFF] focus:ring-[#8B3DFF] border-gray-300 accent-[#8B3DFF] cursor-pointer shrink-0"
                  />
                  <div className="text-xs text-gray-700 leading-relaxed">
                    <span className="font-semibold text-gray-900">I have read and agree to Kutty Story's{" "}</span>
                    <button
                      type="button"
                      className="font-bold text-[#8B3DFF] underline hover:text-[#7828f7] cursor-pointer inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingLegalDoc("terms");
                      }}
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      className="font-bold text-[#8B3DFF] underline hover:text-[#7828f7] cursor-pointer inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingLegalDoc("privacy");
                      }}
                    >
                      Privacy Policy
                    </button>
                    .
                  </div>
                </label>
              </div>

              {/* Trust, Delivery Estimate & Cancellation/Reprint Policy Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-[#4E424B] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#2D222A]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Order Guarantees &amp; Support</span>
                </div>
                <p>
                  <strong>Delivery:</strong> Instant high-resolution PDF download upon payment confirmation.
                </p>
                <p>
                  <strong>Cancellation &amp; Reprints:</strong> Custom digital assets are generated instantly. If you experience any technical or download issue, contact support for immediate re-issue. See our{" "}
                  <a href="/terms#refund-policy" target="_blank" rel="noopener noreferrer" className="font-semibold underline text-[#8B3DFF]">
                    Terms &amp; Refund Policy
                  </a>.
                </p>
                <p className="text-gray-500">
                  Customer Support: email{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-900 font-medium hover:underline text-[#8B3DFF]">
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  • phone{" "}
                  <a href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`} className="text-gray-900 font-medium hover:underline text-[#8B3DFF]">
                    {SUPPORT_PHONE}
                  </a>
                </p>
              </div>

              {/* Secure Checkout Note & CTA */}
              <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>256-bit SSL encrypted • Powered by Razorpay</span>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={loading || !agreedToTerms}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-full text-white text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    !agreedToTerms
                      ? "bg-gray-400 opacity-60 cursor-not-allowed shadow-none"
                      : "bg-[#8B3DFF] hover:bg-[#7828f7] shadow-lg shadow-[#8B3DFF]/25 hover:shadow-xl"
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {selectedFormat === "digital"
                      ? `Pay ₹${Number(digitalFinalPrice).toLocaleString("en-IN")} & Download Instantly`
                      : `Continue to Shipping (₹${Number(printFinalPrice).toLocaleString("en-IN")})`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SHIPPING ADDRESS FORM (For Physical Hardcover Book) */}
          {step === "shipping_address" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("select_product")}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-900 flex items-center gap-1 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Editions</span>
                </button>
                <span className="text-xs font-bold text-[#C98A84] flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Free Doorstep Delivery Across India</span>
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Narmadha M"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B3DFF]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Email Address (For Order & Delivery Updates) *
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. parent@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B3DFF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Contact Phone Number (For Courier Tracking) *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B3DFF]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">
                    Street Address / House No. / Flat *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 402, Lotus Orchid, Gandhi Nagar"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B3DFF]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Near Bus Stand"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B3DFF]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      City / District *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Chennai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B3DFF]"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">
                      State *
                    </label>
                    <select
                      value={stateId}
                      onChange={(e) => setStateId(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B3DFF] cursor-pointer"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="max-w-xs">
                  <label className="font-semibold text-gray-700 block mb-1">
                    6-Digit PIN Code *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="600001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#8B3DFF]"
                  />
                </div>
              </div>

              {/* Luxury Keepsake Gift Wrapping Option for Hardcopy */}
              {pricingRules.giftWrapEnabled && (
                <div
                  onClick={() => setIsGiftWrap(!isGiftWrap)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isGiftWrap
                      ? "border-[#C98A84] bg-[#FAEEED]/70 shadow-xs ring-1 ring-[#C98A84]/20"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isGiftWrap ? "bg-[#C98A84] text-white" : "bg-rose-50 text-[#C98A84]"
                    }`}>
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">Add Luxury Keepsake Gift Wrapping</span>
                        <span className="text-[11px] font-extrabold text-[#C98A84] bg-white px-2 py-0.5 rounded-full border border-[#C98A84]/30 shadow-xs">
                          +₹{pricingRules.giftWrapFee}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Handcrafted gold-foil wrap with personalized satin ribbon & keepsake greeting card.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 pl-2">
                    <input
                      type="checkbox"
                      id="gift-wrap-step2"
                      checked={isGiftWrap}
                      onChange={(e) => {
                        e.stopPropagation();
                        setIsGiftWrap(e.target.checked);
                      }}
                      className="w-4 h-4 rounded text-[#C98A84] focus:ring-[#C98A84] border-gray-300 accent-[#C98A84] cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Visible Terms & Privacy Policy Checkbox Card */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  !agreedToTerms
                    ? "bg-purple-50/60 border-purple-200/80 hover:bg-purple-50"
                    : "bg-emerald-50/50 border-emerald-200"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="agree-terms-step2"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked && errorMessage.includes("Terms")) {
                        setErrorMessage("");
                      }
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-[#8B3DFF] focus:ring-[#8B3DFF] border-gray-300 accent-[#8B3DFF] cursor-pointer shrink-0"
                  />
                  <div className="text-xs text-gray-700 leading-relaxed">
                    <span className="font-semibold text-gray-900">I have read and agree to Kutty Story's{" "}</span>
                    <button
                      type="button"
                      className="font-bold text-[#8B3DFF] underline hover:text-[#7828f7] cursor-pointer inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingLegalDoc("terms");
                      }}
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      className="font-bold text-[#8B3DFF] underline hover:text-[#7828f7] cursor-pointer inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingLegalDoc("privacy");
                      }}
                    >
                      Privacy Policy
                    </button>
                    .
                  </div>
                </label>
              </div>

              {/* Trust, Delivery Estimate & Cancellation/Reprint Policy Card */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-[#4E424B] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-[#2D222A]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Doorstep Delivery &amp; Keepsake Guarantee</span>
                </div>
                <p>
                  <strong>Delivery Estimate:</strong> 3-5 business days doorstep courier across India with tracking.
                </p>
                <p>
                  <strong>Cancellation &amp; Reprints:</strong> Personalized books enter print binding within 2 hours. If your book arrives damaged or has a print defect, we offer a 100% free reprint. See our{" "}
                  <a href="/terms#refund-policy" target="_blank" rel="noopener noreferrer" className="font-semibold underline text-[#8B3DFF]">
                    Reprint &amp; Cancellation Policy
                  </a>.
                </p>
                <p className="text-gray-500">
                  Customer Support: email{" "}
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-gray-900 font-medium hover:underline text-[#8B3DFF]">
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  • phone{" "}
                  <a href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`} className="text-gray-900 font-medium hover:underline text-[#8B3DFF]">
                    {SUPPORT_PHONE}
                  </a>
                </p>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500">
                  Total Payable:{" "}
                  <strong className="text-gray-900 text-sm font-bold text-[#8B3DFF] ml-1">
                    ₹{Number(printFinalPrice).toLocaleString("en-IN")}
                  </strong>
                  {appliedCoupon && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded ml-1 font-bold">
                      ({appliedCoupon} • Save ₹{printDiscount})
                    </span>
                  )}
                  {isGiftWrap && pricingRules.giftWrapEnabled && (
                    <span className="text-[10px] text-[#C98A84] bg-rose-50 px-1.5 py-0.5 rounded ml-1 font-semibold">
                      +Gift Wrap (₹{pricingRules.giftWrapFee})
                    </span>
                  )}
                  {isRegionalLanguage && (
                    <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded ml-1 font-semibold">
                      +{formattedLanguage} (₹{pricingRules.languageSurcharge})
                    </span>
                  )}
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={loading || !agreedToTerms}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-full text-white text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    !agreedToTerms
                      ? "bg-gray-400 opacity-60 cursor-not-allowed shadow-none"
                      : "bg-[#8B3DFF] hover:bg-[#7828f7] shadow-lg shadow-[#8B3DFF]/25 hover:shadow-xl"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {loading ? "Launching Payment Gateway..." : `Pay ₹${Number(printFinalPrice).toLocaleString("en-IN")} via Razorpay`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CELEBRATION / SUCCESS MODAL */}
          {step === "success" && completedOrder && (
            <div className="space-y-6 text-center py-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
                  Payment Verified Successfully
                </span>
                <h3 className="font-editorial-serif text-2xl sm:text-3xl font-bold text-gray-900">
                  Welcome to {childName}'s Adventure!
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  Your storybook has been unlocked and full book generation is active. You can now download your high-resolution storybook.
                </p>
              </div>

              {/* Order summary card */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 max-w-md mx-auto text-xs space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Reference:</span>
                  <strong className="font-mono text-gray-900">{completedOrder.order_number}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Edition:</span>
                  <span className="capitalize font-semibold text-gray-800">
                    {completedOrder.format_type === "digital" ? "Digital Illustrated Edition" : "Heirloom Hardcover Keepsake"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Paid:</span>
                  <strong className="text-emerald-700">₹{Number(completedOrder.amount).toLocaleString("en-IN")}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Paid & Unlocked
                  </span>
                </div>
              </div>

              {/* Direct Download Actions with Rich Loading Animation */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setDownloadModal({
                      isOpen: true,
                      url: `/api/v1/personalization/${job.id}/pdf?mode=full&lang=${selectedLanguage}`,
                      filename: `${(job.child_name || "Child").replace(/\s+/g, "_")}_${(story?.title || "Storybook").replace(/\s+/g, "_")}_Full_Storybook.pdf`,
                      formatTitle: `Full Illustrated Storybook PDF (${selectedLanguage.toUpperCase()})`
                    })
                  }
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#8B3DFF] hover:bg-[#7828f7] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full PDF ({selectedLanguage.toUpperCase()})</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDownloadModal({
                      isOpen: true,
                      url: `/api/v1/personalization/${job.id}/print-pdf?size=8x8&color=rgb&lang=${selectedLanguage}`,
                      filename: `${(job.child_name || "Child").replace(/\s+/g, "_")}_${(story?.title || "Storybook").replace(/\s+/g, "_")}_Print_8x8.pdf`,
                      formatTitle: "Print-Ready 8×8 Keepsake PDF"
                    })
                  }
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Package className="w-4 h-4" />
                  <span>Print-Ready 8×8 PDF</span>
                </button>
              </div>

              <div>
                <button
                  onClick={onClose}
                  className="text-xs text-gray-500 hover:text-gray-800 font-semibold underline cursor-pointer"
                >
                  Return to Storybook Viewer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INLINE LEGAL POLICY VIEWER MODAL */}
      {viewingLegalDoc && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#8B3DFF] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-editorial-serif text-lg font-bold text-gray-900">
                    {viewingLegalDoc === "privacy" ? "Child Privacy & Safety Charter" : "Terms of Service & Refund Policy"}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Kutty Story Legal Protection Guarantee
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingLegalDoc(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Document Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-gray-600 leading-relaxed">
              {viewingLegalDoc === "privacy" ? (
                <>
                  <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 text-[#8B3DFF] font-semibold">
                    🛡️ Digital Personal Data Protection (DPDP Act 2023) Compliant
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">1. Photo Confidentiality</h4>
                    <p>Your child’s photographs are stored in private, 256-bit SSL encrypted storage and processed solely to generate their custom illustrated storybook.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">2. No Public AI Model Training</h4>
                    <p>We never sell, share, or use your child’s face or likeness to train public foundation models.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">3. Bank-Grade Payment Security</h4>
                    <p>Payments are processed exclusively by Razorpay with 256-bit encryption. Kutty Story never collects or stores card numbers or UPI PINs.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">4. Right to Permanent Deletion</h4>
                    <p>Parents can request permanent erasure of photos and book sessions anytime by emailing <span className="font-bold text-gray-900">info@kuttystory.co.in</span>.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 text-[#8B3DFF] font-semibold">
                    📖 100% Quality &amp; Print Guarantee
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">1. Digital &amp; Hardcover Deliverables</h4>
                    <p>Digital editions are delivered as instant PDF downloads (24+ pages). Hardcover keepsakes are printed on archival paper and shipped across India.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">2. Free Doorstep Shipping</h4>
                    <p>Hardcover books are printed in 1-2 days and delivered via express courier within 3-5 business days across India.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">3. Reprint &amp; Refund Policy</h4>
                    <p>If your physical book arrives damaged during transit or has a manufacturing misprint, you are entitled to a 100% free reprint or full refund within 7 days of delivery.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">4. Parental Consent</h4>
                    <p>By uploading a photograph, you warrant you are the child’s parent or legal guardian.</p>
                  </div>
                </>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewingLegalDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setAgreedToTerms(true);
                  setViewingLegalDoc(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#8B3DFF] hover:bg-[#7828f7] text-white text-xs font-bold shadow-md shadow-[#8B3DFF]/25 cursor-pointer flex items-center gap-1.5 transition"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>I Agree &amp; Return to Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Download Loading Animation & Progress Modal */}
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
    </div>
  );
}
