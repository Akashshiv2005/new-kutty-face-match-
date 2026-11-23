import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Heart, CheckCircle2, Mail, ArrowLeft, EyeOff, FileText, X } from "lucide-react";
import Seo from "@/seo/Seo";
import { SEO_ROUTES } from "@/seo/routes";
import { getBreadcrumbSchema } from "@/seo/schema";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    try {
      const savedUrl = localStorage.getItem("last_storybook_url");
      if (savedUrl && !savedUrl.includes("/privacy") && !savedUrl.includes("/terms")) {
        window.location.href = savedUrl;
        return;
      }
    } catch (e) {}

    try {
      if (window.opener && !window.opener.closed) {
        window.close();
        return;
      }
    } catch (e) {}

    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/personalize");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9FD] text-[#2D222A] py-10 px-4 sm:px-6 lg:px-8">
      {/* Search Engine Optimization & Structured Data */}
      <Seo
        config={SEO_ROUTES["/privacy"]}
        schemas={[
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Privacy Policy", path: "/privacy" }
          ])
        ]}
      />

      <div className="max-w-4xl mx-auto">
        {/* Back navigation directly to payment / previous page */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#EBE3D9] text-xs font-bold text-[#8B3DFF] hover:bg-purple-50 hover:text-[#7828f7] shadow-2xs hover:shadow-xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#8B3DFF]" />
            <span>Back to Storybook / Payment</span>
          </button>

          <span className="text-[11px] text-gray-400 hidden sm:inline">
            Returns to your current personalized story session
          </span>
        </div>

        {/* Hero Header */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#EBE3D9] shadow-xs mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 text-[#8B3DFF] text-xs font-bold mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Digital Personal Data Protection (DPDP) & Child Privacy Charter</span>
          </div>

          <h1 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#1E293B] tracking-tight mb-4">
            Child Privacy Charter &amp; Privacy Policy
          </h1>

          <p className="text-sm sm:text-base text-[#695B64] leading-relaxed">
            At <strong>Kutty Story</strong>, we believe every child’s imagination is sacred—and so is their privacy.
            This Privacy Policy explains with total transparency how we collect, process, and protect your child’s photographs
            and your personal information when personalizing storybooks.
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center gap-6 text-xs text-gray-500">
            <span>Last Updated: November 2026</span>
            <span>•</span>
            <span>Applicable Law: DPDP Act 2023 (India) &amp; Global Child Protection Standards</span>
          </div>
        </div>

        {/* Key Guarantees Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-[#EBE3D9] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#8B3DFF] flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-sm text-[#1E293B]">No Public Training</h2>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Your child’s photos are never used to train public generative AI models or sold to advertisers.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EBE3D9] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-sm text-[#1E293B]">Encrypted Storage</h2>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Photographs and generated book plates are stored in private, 256-bit SSL encrypted object vaults.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EBE3D9] shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-sm text-[#1E293B]">Parental Control</h2>
            <p className="text-xs text-[#695B64] leading-relaxed">
              You retain 100% ownership. You can request complete deletion of photos and records anytime.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#EBE3D9] shadow-xs space-y-8 text-xs sm:text-sm text-[#695B64] leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">1</span>
              Information We Collect
            </h2>
            <p>
              To create a customized storybook featuring your child as the hero, we collect only the minimum necessary information:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Child Profile:</strong> First name, age/standard, gender, and preferred story language (e.g., English, Tamil).</li>
              <li><strong>Reference Photograph:</strong> A single portrait photo of your child uploaded with verifiable parental consent.</li>
              <li><strong>Parent Contact &amp; Shipping Details:</strong> Parent’s name, email address, phone number, and physical postal address (required exclusively for doorstep delivery of print editions).</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">2</span>
              How Your Child's Photo Is Processed
            </h2>
            <p>
              When you upload a photograph, our visual personalization engine extracts facial feature geometry (eye position, smile, hair silhouette) to render consistent cartoon illustrations across the book's 24+ pages.
            </p>
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-[#8B3DFF]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Strict Isolation Policy</span>
              </div>
              <p className="text-[#695B64]">
                Photo processing runs in isolated sessions. Photos are never cross-referenced, published publicly, or added to open datasets. Only the parent who initiates the session can preview and download the rendered book.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">3</span>
              Payment Processing &amp; Financial Security
            </h2>
            <p>
              All online payments on Kutty Story are processed securely by <strong>Razorpay Software Private Limited</strong>, an RBI-regulated and PCI-DSS Level 1 certified payment gateway.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Kutty Story <strong>never collects, sees, or stores</strong> your Credit/Debit card numbers, CVVs, net banking credentials, or UPI PINs.</li>
              <li>Razorpay processes your transaction through end-to-end 256-bit bank-grade encryption.</li>
              <li>We only receive a confirmation token, transaction ID, and order status from Razorpay to unlock your book.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">4</span>
              Data Retention &amp; Permanent Deletion
            </h2>
            <p>
              We retain book rendering files and digital previews so parents can re-download their purchased editions from their accounts. However, as a parent or guardian, you have the right to request immediate and permanent erasure of:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The original uploaded child reference photo.</li>
              <li>Enhanced character avatar plates.</li>
              <li>All associated session records from our storage servers.</li>
            </ul>
            <p>
              To request data erasure, simply email us at <a href="mailto:info@kuttystory.co.in" className="text-[#8B3DFF] font-semibold underline">info@kuttystory.co.in</a> with your order number or email address, and our team will permanently purge your data within 48 business hours.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">5</span>
              Grievance Officer &amp; Contact Information
            </h2>
            <p>
              In accordance with the Information Technology Act 2000 and the Digital Personal Data Protection Act 2023, for any privacy concerns, complaints, or questions, please contact our designated Grievance &amp; Privacy Officer:
            </p>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1 text-xs">
              <p className="font-bold text-[#1E293B]">Kutty Story Privacy &amp; Data Governance</p>
              <p>Email: <a href="mailto:privacy@kuttystory.com" className="text-[#8B3DFF] underline">privacy@kuttystory.com</a></p>
              <p>Support Desk: <a href="mailto:info@kuttystory.co.in" className="text-[#8B3DFF] underline">info@kuttystory.co.in</a></p>
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-[#695B64]">
          <button
            type="button"
            onClick={handleBack}
            className="px-5 py-2.5 rounded-xl bg-[#8B3DFF] text-white font-bold hover:bg-[#7828f7] shadow-md shadow-[#8B3DFF]/20 transition cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Back to Storybook / Payment</span>
          </button>
          <span>•</span>
          <Link to="/terms" className="text-[#8B3DFF] font-semibold hover:underline">
            View Terms of Service &amp; Refund Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
