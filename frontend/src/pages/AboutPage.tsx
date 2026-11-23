import { Link } from "react-router-dom";
import {
  Sparkles,
  ShieldCheck,
  Heart,
  BookOpen,
  ArrowRight,
  Award,
  Users,
  Feather,
  Printer,
  Sparkle,
  CheckCircle2,
  Palette,
  Quote,
  Mail,
  Phone,
  MapPin,
  Clock
} from "lucide-react";
import MagicalParentingRoutine from "@/components/MagicalParentingRoutine";
import Seo from "@/seo/Seo";
import { SEO_ROUTES } from "@/seo/routes";
import { getBreadcrumbSchema } from "@/seo/schema";

export default function AboutPage() {
  return (
    <div className="pb-24">
      {/* Search Engine Optimization & Structured Data */}
      <Seo
        config={SEO_ROUTES["/about"]}
        schemas={[
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" }
          ])
        ]}
      />

      {/* 1. Hero Section */}
      <section className="relative bg-gradient-to-b from-[#FAEEED]/50 via-[#FAF7F2] to-[#FAF7F2] pt-12 sm:pt-16 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 border-b border-[#EBE3D9]">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#C98A84]/30 text-xs font-semibold text-[#C98A84] shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Atelier Story & Mission</span>
          </div>

          <h1 className="font-hero-heading text-3xl sm:text-5xl lg:text-7xl font-bold text-[#2D222A] tracking-tight leading-tight sm:leading-[1.12]">
            About KuttyStory
          </h1>

          <p className="max-w-3xl mx-auto text-sm sm:text-base md:text-lg text-[#695B64] font-normal leading-relaxed">
            Meet KuttyStory, the personalised children's book brand that helps kids become the heroes of their own illustrated adventures. Rooted in Tiruchirappalli, Tamil Nadu, we combine gentle storytelling, ethical privacy safeguards, and heirloom-quality bookbinding to create family treasures across India. Every child deserves to see their own courage, wonder, and smile woven into breathtaking art.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link
              to="/stories"
              className="px-6 sm:px-8 py-3.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <span>Explore Story Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="px-5 sm:px-7 py-3.5 rounded-full bg-white border border-[#EBE3D9] hover:border-[#C98A84] text-[#2D222A] text-xs sm:text-sm font-medium transition-colors"
            >
              <span>How It Works</span>
            </Link>
            <a
              href="#contact"
              className="px-5 sm:px-7 py-3.5 rounded-full bg-white border border-[#EBE3D9] hover:border-[#C98A84] text-[#2D222A] text-xs sm:text-sm font-medium transition-colors"
            >
              <span>Contact Us</span>
            </a>
          </div>
        </div>
      </section>

      {/* 2. The Meaning Behind "Kutty" */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10">
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-12 border border-[#EBE3D9] shadow-sm grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
          <div className="md:col-span-7 space-y-4">
            <div className="text-xs uppercase tracking-widest text-[#C98A84] font-bold">
              Our Name & Ethos
            </div>
            <h2 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
              What Does <span className="italic font-normal text-[#C98A84]">“Kutty”</span> Mean?
            </h2>
            <p className="text-sm text-[#695B64] leading-relaxed">
              In Tamil and South Asian languages, <strong>“Kutty”</strong> (pronounced <em>koot-tee</em>) is the most tender term of endearment for a beloved child. It means <em>“the little one”</em> — the sweet soul who fills a home with laughter, boundless questions, and uninhibited dreams.
            </p>
            <p className="text-sm text-[#695B64] leading-relaxed">
              We paired <em>Kutty</em> with timeless storybook craftsmanship because we believe every child's small years are grand miracles. The heirloom volumes we create aren't disposable toys; they are tangible family treasures meant to be preserved for 30 years and handed down to the next generation.
            </p>
          </div>

          <div className="md:col-span-5 bg-[#FAF7F2] rounded-2xl p-6 border border-[#EBE3D9] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FAEEED] flex items-center justify-center text-[#C98A84]">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <div className="font-editorial-serif text-lg font-bold text-[#2D222A]">The Atelier Promise</div>
                <div className="text-xs text-[#695B64]">Rooted in love and literacy</div>
              </div>
            </div>
            <ul className="space-y-3 text-xs text-[#695B64]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                <span>100% original narrative poetry and prose reviewed by literacy educators.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                <span>No uncanny valley: soft, painterly watercolor aesthetics that feel handmade.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#8F9E8B] shrink-0 mt-0.5" />
                <span>Strict zero-data-harvesting policy regarding child photos.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3. The Four Pillars of Our Atelier */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="text-xs uppercase tracking-widest text-[#C98A84] font-semibold">
            The Atelier Standards
          </div>
          <h2 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
            The Four Pillars of KuttyStory
          </h2>
          <p className="text-xs sm:text-sm text-[#695B64]">
            How we unite classical bookbinding with cutting-edge ethical intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white p-7 rounded-2xl border border-[#EBE3D9] hover:border-[#C98A84]/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#FAEEED] flex items-center justify-center text-[#C98A84]">
              <Feather className="w-6 h-6" />
            </div>
            <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A]">
              1. Storytelling Heart
            </h3>
            <p className="text-xs text-[#695B64] leading-relaxed">
              We never use generic or rushed writing. Each story arc addresses emotional growth — embracing vulnerability, learning to share, discovering inner resilience, and celebrating uniqueness.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white p-7 rounded-2xl border border-[#EBE3D9] hover:border-[#C98A84]/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#F2EEF7] flex items-center justify-center text-[#B8A9C9]">
              <Sparkle className="w-6 h-6" />
            </div>
            <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A]">
              2. Gentle Likeness Artistry
            </h3>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Our fine-tuned generative pipeline maps child facial contours into classical watercolor illustration. Your child is immediately recognizable while effortlessly belonging in the story realm.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white p-7 rounded-2xl border border-[#EBE3D9] hover:border-[#C98A84]/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#EEF4ED] flex items-center justify-center text-[#8F9E8B]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A]">
              3. Child Privacy Sanctuary
            </h3>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Parents retain 100% control. Photos uploaded are encrypted, processed in memory-only sandboxes, never shared or sold to model aggregators, and purged following book delivery.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white p-7 rounded-2xl border border-[#EBE3D9] hover:border-[#C98A84]/40 transition-all space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#FAF5E8] flex items-center justify-center text-[#C5A059]">
              <Printer className="w-6 h-6" />
            </div>
            <h3 className="font-editorial-serif text-xl font-bold text-[#2D222A]">
              4. Museum Archival Print
            </h3>
            <p className="text-xs text-[#695B64] leading-relaxed">
              Deterministic 8x8 mm vector typesetting engine. Heavyweight 170gsm silk paper, reinforced cloth spine, and vegetable-based eco inks that resist water drops and sunlight fading.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Atelier Statistics / Impact */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-[#FAF7F2] rounded-3xl p-8 sm:p-14 border border-[#EBE3D9]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-[#EBE3D9]">
            <div className="space-y-1 pt-4 md:pt-0">
              <div className="font-editorial-serif text-4xl sm:text-5xl font-bold text-[#C98A84]">
                1,300
              </div>
              <div className="text-xs font-medium text-[#2D222A]">Books Sold & Delivered</div>
              <div className="text-[11px] text-[#695B64]">In homes across India</div>
            </div>

            <div className="space-y-1 pt-4 md:pt-0">
              <div className="font-editorial-serif text-4xl sm:text-5xl font-bold text-[#8F9E8B]">
                15 / 28
              </div>
              <div className="text-xs font-medium text-[#2D222A]">States Reached</div>
              <div className="text-[11px] text-[#695B64]">With tracked express shipping</div>
            </div>

            <div className="space-y-1 pt-4 md:pt-0">
              <div className="font-editorial-serif text-4xl sm:text-5xl font-bold text-[#B8A9C9]">
                99.4%
              </div>
              <div className="text-xs font-medium text-[#2D222A]">Parent Delight Rating</div>
              <div className="text-[11px] text-[#695B64]">Verified customer reviews</div>
            </div>

            <div className="space-y-1 pt-4 md:pt-0">
              <div className="font-editorial-serif text-4xl sm:text-5xl font-bold text-[#C5A059]">
                100%
              </div>
              <div className="text-xs font-medium text-[#2D222A]">Archival Guarantee</div>
              <div className="text-[11px] text-[#695B64]">Built to last for decades</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The Team & Artisans — One-by-One Editorial Showcase */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-28 space-y-20 sm:space-y-28">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#C98A84]/30 shadow-xs text-xs font-semibold text-[#C98A84]">
            <Sparkles className="w-3.5 h-3.5 text-[#C98A84]" />
            <span className="tracking-wide uppercase text-[11px]">The Artisans Behind The Magic</span>
          </div>

          <h2 className="font-georgia text-3xl sm:text-5xl font-bold text-[#2D222A] tracking-tight leading-[1.15]">
            Crafted by Storytellers, Artists & Parents
          </h2>

          <p className="text-sm sm:text-base text-[#695B64] font-normal leading-relaxed max-w-xl mx-auto">
            Meet the dream-weavers and visual masters dedicated to making every bedtime page feel like an heirloom treasure.
          </p>
        </div>

        {/* MAKER 1: Jamila Kamal (Story Architect) */}
        <div className="relative bg-gradient-to-br from-white/95 via-[#FFFDFB] to-[#FAF5F2] backdrop-blur-md rounded-3xl sm:rounded-[36px] p-6 sm:p-10 lg:p-14 border border-[#EBE3D9] shadow-xl shadow-[#C98A84]/5 overflow-hidden">
          {/* Subtle background ambient blur */}
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#FAEEED]/60 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left: Arched Portrait & Floating Badges */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[320px] sm:max-w-[360px] pb-6 sm:pb-0">
                {/* Background decorative watercolor aura */}
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-gradient-to-tr from-[#DE8F88]/25 to-[#E5A93C]/25 rounded-full blur-xl pointer-events-none" />

                {/* Arched Photo Frame matching reference design */}
                <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-t-[140px] sm:rounded-t-[170px] rounded-b-3xl overflow-hidden bg-gradient-to-b from-[#FAEEED] via-[#F6DFDC] to-[#F1E0DC] border-4 border-white shadow-2xl shadow-[#C98A84]/20 group">
                  <img
                    src="/team/jamila.jpg"
                    alt="Jamila Kamal"
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                  {/* Subtle vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60 pointer-events-none" />
                </div>

                {/* Top Floating Badge: "10+ YEARS EXPERIENCE" */}
                {/* <div className="absolute top-4 right-2 sm:-right-4 bg-white/95 backdrop-blur-md px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-xl border border-[#EBE3D9] flex items-center gap-2.5 animate-float-gently z-10">
                  <span className="font-georgia text-2xl sm:text-3xl font-bold text-[#C98A84] leading-none">10+</span>
                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#695B64] leading-tight">
                    Years Story<br />Architecture
                  </div>
                </div> */}

                {/* Bottom Floating Badge: "10,000+ Happy Readers" */}
                <div className="absolute bottom-0 sm:-bottom-4 left-2 sm:-left-4 bg-white/95 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-xl border border-[#EBE3D9] flex items-center gap-3 z-10">
                  {/* <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#FAEEED] flex items-center justify-center text-[#C98A84] shrink-0">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  </div> */}
                  <div>
                    <div className="font-georgia text-base sm:text-xl font-bold text-[#2D222A] leading-tight">Jamila Kamal</div>
                    <div className="text-[10px] sm:text-[11px] font-medium text-[#695B64]">Founder & CEO</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Editorial Narrative & Features */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6 pt-2 lg:pt-0">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#C98A84] font-bold">
                <Feather className="w-3.5 h-3.5" />
                <span>Founder's Message</span>
              </div>

              <h3 className="font-georgia text-2xl sm:text-4xl lg:text-[40px] font-bold text-[#2D222A] leading-tight">
                A Mother's Love. A Woman's Strength.  <span className="text-[#C98A84] italic">A Story for Every Child.</span>.
              </h3>

              <p className="text-xs sm:text-sm md:text-base text-[#695B64] leading-relaxed">
                Every beautiful journey begins with a story. Mine began with dreams, responsibilities, motherhood and the courage to create something meaningful.
                I started my professional journey as an engineer, learning to think logically, solve problems and build solutions. But life introduced me to my most beautiful role <span className="text-[#C98A84] italic">- motherhood.</span>
              </p>
              <p>
                Becoming a mother changed the way I saw the world. Every little smile, curious question and imaginative conversation became a precious moment. 
                Watching my child grow made me realise that childhood is not just about learning — it is about nurturing creativity, building confidence and encouraging children to dream without limits.
              </p>

              <span className="text-[#C98A84] italic">A woman doesn't have to choose between her responsibilities and her dreams. She has the strength to nurture both.</span>
              <p>
                These experiences sparked my interest in parenting, child development and creating meaningful experiences for little ones.
              </p>
              <p> 
                And somewhere between bedtime stories and everyday moments, a beautiful thought was born:What if every child could become the hero of their own story?
              </p>
              <p>
                What if every child could become the hero of their own story?
              </p>
              <p>
                That simple idea gave birth to KuttyStory — inspired by our little kutties, their endless imagination and the magic of childhood.
              </p>
              <p>
                At KuttyStory, we create personalised storybooks where children step into magical adventures as the main characters. We believe every story can spark imagination, inspire confidence and create memories that families cherish.
              </p>
              <p>
                For me, KuttyStory is more than a business. 
                <span className="text-[#C98A84] italic"> It is a celebration of motherhood, women's empowerment, childhood dreams and the courage to turn a simple idea into something meaningful.</span>
              </p>
              <p>
                My dream is to make every child feel special, valued and proud of who they are — one beautiful story at a time.
                <span className="text-[#C98A84] italic">Because every child has a story. Every child has a dream. And every child deserves to be the hero.</span>
              </p>
              <p>With love and gratitude,</p>
              <p>Jamila Kamal</p>
              <span className="text-[#C98A84] italic">Founder, KuttyStory</span>
              <p>Created with a mother's love. Inspired by little dreams.</p>
              {/* Dual Circular Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/80 border border-[#EBE3D9]/80 shadow-2xs">
                  <div className="w-11 h-11 rounded-full bg-[#FAEEED] text-[#C98A84] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#2D222A]">Modernized 40 year Old Company</div>
                    <div className="text-[11px] text-[#695B64]">Founded by father</div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/80 border border-[#EBE3D9]/80 shadow-2xs">
                  <div className="w-11 h-11 rounded-full bg-[#FAF5E8] text-[#C5A059] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-[#2D222A]">ISO 9001:2000 Certified & <br></br> ZED Gold Certified</div>
                    {/* <div className="text-[11px] text-[#695B64]">Tested with real children</div> */}
                  </div>
                </div>
              </div>

              {/* Checkmark Bullet Points */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#2D222A]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Specialized in Book, Brochure, Office Satiionery & Packaging Solutions</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[#2D222A]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Recognized Among Three Best Rated Printing Companies</span>
                </div>
              </div>

            </div>
          </div>
        </div>

      </section>

      {/* 6. Magical Animated 24-Hour Parenting Routine */}
      <MagicalParentingRoutine />

      {/* 7. Contact Atelier Information Block (#contact) */}
      <section id="contact" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-[#EBE3D9] shadow-sm space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#C98A84]">
              Customer Care &amp; Inquiries
            </span>
            <h2 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
              Contact KuttyStory
            </h2>
            <p className="text-xs sm:text-sm text-[#695B64]">
              Have a question about your order, child photo suitability, or bulk party books? Our team in Tiruchirappalli is here to help.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-[#FAEEED] text-[#C98A84] flex items-center justify-center mx-auto sm:mx-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="font-editorial-serif text-sm font-bold text-[#2D222A]">
                Atelier Location
              </div>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Tiruchirappalli, Tamil Nadu, India
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-[#F2EEF7] text-[#B8A9C9] flex items-center justify-center mx-auto sm:mx-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="font-editorial-serif text-sm font-bold text-[#2D222A]">
                Phone / WhatsApp
              </div>
              <p className="text-xs text-[#695B64] leading-relaxed">
                <a href="https://wa.me/9003169615" target="_blank" rel="noopener noreferrer" className="hover:text-[#C98A84] underline">
                  +91 90031 69615
                </a>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-[#EEF4ED] text-[#8F9E8B] flex items-center justify-center mx-auto sm:mx-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="font-editorial-serif text-sm font-bold text-[#2D222A]">
                Email Concierge
              </div>
              <p className="text-xs text-[#695B64] leading-relaxed">
                <a href="mailto:info@kuttystory.co.in" className="hover:text-[#C98A84] underline">
                  info@kuttystory.co.in
                </a>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EBE3D9] space-y-2 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-[#FAF5E8] text-[#C5A059] flex items-center justify-center mx-auto sm:mx-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="font-editorial-serif text-sm font-bold text-[#2D222A]">
                Operating Hours
              </div>
              <p className="text-xs text-[#695B64] leading-relaxed">
                Mon – Sat: 9:30 AM – 6:30 PM IST
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Call to Action Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
        <div className="bg-gradient-to-r from-[#FAEEED] via-[#F2EEF7] to-[#FAF5E8] rounded-3xl p-8 sm:p-12 border border-[#EBE3D9] text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/80 text-xs font-semibold text-[#C98A84]">
            <Award className="w-3.5 h-3.5" />
            <span>100% Satisfaction Guarantee</span>
          </div>

          <h3 className="font-editorial-serif text-3xl sm:text-4xl font-bold text-[#2D222A]">
            Ready to give them a story they’ll never forget?
          </h3>

          <p className="text-xs sm:text-sm text-[#695B64] max-w-xl mx-auto">
            Choose a storybook, upload a photo, and watch their personalized fairy tale come to life in minutes.
          </p>

          <div>
            <Link
              to="/stories"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#C98A84] hover:bg-[#B87A74] text-white text-xs sm:text-sm font-semibold shadow-md transition-all"
            >
              <span>Start Personalizing Today</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
