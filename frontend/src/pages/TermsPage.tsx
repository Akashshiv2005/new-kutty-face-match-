import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, ArrowLeft, RefreshCw, Truck, CheckCircle2, ShieldAlert } from "lucide-react";
import Seo from "@/seo/Seo";
import { SEO_ROUTES } from "@/seo/routes";
import { getBreadcrumbSchema } from "@/seo/schema";

export default function TermsPage() {
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
        config={SEO_ROUTES["/terms"]}
        schemas={[
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Terms of Service", path: "/terms" }
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
            <FileText className="w-4 h-4" />
            <span>Customer Agreement &amp; Fulfillment Policy</span>
          </div>

          <h1 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#1E293B] tracking-tight mb-4">
            Terms of Service &amp; Order Guidelines
          </h1>

          <p className="text-sm sm:text-base text-[#695B64] leading-relaxed">
            Welcome to <strong>Kutty Story</strong>. By purchasing a digital or hardcover personalized storybook, you agree to the following terms, conditions, and fulfillment guidelines.
          </p>

          <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap items-center gap-6 text-xs text-gray-500">
            <span>Last Updated: November 2026</span>
            <span>•</span>
            <span>Applies to: Digital PDF Editions &amp; Printed Hardcover Books</span>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#EBE3D9] shadow-xs space-y-8 text-xs sm:text-sm text-[#695B64] leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">1</span>
              Personalized Storybook Deliverables
            </h2>
            <p>
              Each storybook created on Kutty Story is custom-crafted using generative AI and professional print rendering algorithms based on the child's photograph and name provided by the customer.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="font-bold text-[#1E293B] mb-1">📱 Digital PDF Edition</p>
                <p className="text-xs text-gray-500">
                  Delivered electronically as an instant high-resolution, full-color PDF download (24+ illustrated pages) immediately upon payment confirmation.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="font-bold text-[#1E293B] mb-1">📖 Hardcover Print Keepsake</p>
                <p className="text-xs text-gray-500">
                  Includes full Digital PDF edition plus a premium 8×8 inch hardcover keepsake book printed on archival child-safe heavyweight paper and delivered to your doorstep.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Shipping Policy */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">2</span>
              Shipping &amp; Delivery Policy
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Free Nationwide Shipping:</strong> We provide free doorstep courier delivery across all serviceable PIN codes in India.</li>
              <li><strong>Production Time:</strong> Physical hardcover books take 1 to 2 business days for high-grade color calibration, printing, and binding.</li>
              <li><strong>Transit Time:</strong> Once dispatched, courier delivery typically takes 3 to 5 business days depending on destination location. Tracking updates are sent via SMS / email.</li>
            </ul>
          </section>

          {/* Section 3: Cancellation and Refund Policy (Crucial for Razorpay) */}
          <section id="refund-policy" className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">3</span>
              Cancellation &amp; Refund Policy
            </h2>
            <p>
              Because each Kutty Story book is individually personalized with your child's name, likeness, and custom illustrations, orders <strong>cannot be cancelled</strong> once generation or printing has commenced.
            </p>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
              <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Our 100% Quality &amp; Reprint Guarantee</span>
              </p>
              <p className="text-emerald-800 text-xs">
                We take immense pride in our books. You are entitled to a <strong>free reprint or full refund</strong> if:
              </p>
              <ul className="list-disc pl-5 text-emerald-800 text-xs space-y-1">
                <li>The physical book arrives damaged during transit (e.g. torn binding, severe bends).</li>
                <li>There is a manufacturing defect or misprint attributable to our printing facility.</li>
                <li>A technical failure prevents you from downloading your full digital PDF after payment.</li>
              </ul>
              <p className="text-emerald-800 text-xs pt-1">
                To report an issue, please send photos of the damaged package along with your Order Number to <a href="mailto:info@kuttystory.co.in" className="font-bold underline">info@kuttystory.co.in</a> within 7 days of delivery.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">4</span>
              Parental Authority &amp; Copyright
            </h2>
            <p>
              By uploading a photograph, you warrant that you are the parent or legal guardian of the child, or possess explicit permission from the child's parents. You retain ownership of personal photos, while Kutty Story grants you an irrevocable personal license to print, display, and share the finished book with friends and family.
            </p>
          </section>

          {/* Section 5: Support */}
          <section className="space-y-3">
            <h2 className="font-editorial-serif text-lg sm:text-xl font-bold text-[#1E293B] flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#8B3DFF] text-xs font-bold inline-flex items-center justify-center">5</span>
              Customer Support &amp; Inquiries
            </h2>
            <p>
              Have questions regarding an order, payment, or shipping status? Our support desk is happy to help:
            </p>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1 text-xs">
              <p>Email: <a href="mailto:info@kuttystory.co.in" className="text-[#8B3DFF] underline">info@kuttystory.co.in</a></p>
              <p>Operating Hours: Monday – Saturday, 9:30 AM to 6:30 PM IST</p>
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
          <Link to="/privacy" className="text-[#8B3DFF] font-semibold hover:underline">
            View Child Privacy Charter &amp; Data Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
