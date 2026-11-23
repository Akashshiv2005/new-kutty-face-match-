import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { FaqItem, getFaqPageSchema } from "@/seo/schema";

interface FaqSectionProps {
  title?: string;
  subtitle?: string;
  items: FaqItem[];
  id?: string;
  className?: string;
  includeSchema?: boolean;
}

export default function FaqSection({
  title = "Frequently Asked Questions",
  subtitle = "Everything you need to know about our personalised children's storybooks, photos, and delivery.",
  items,
  id = "faq",
  className = "",
  includeSchema = true
}: FaqSectionProps) {
  const [openIndices, setOpenIndices] = useState<number[]>([0]);

  const toggleItem = (idx: number) => {
    setOpenIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const schema = includeSchema ? getFaqPageSchema(items) : null;

  return (
    <section id={id} className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 ${className}`}>
      {/* FAQPage Schema (text is 100% identical to rendered visible content) */}
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}

      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAEEED] border border-[#C98A84]/30 text-xs font-semibold text-[#C98A84]">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Help & Questions</span>
        </div>
        <h2 className="font-editorial-serif text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D222A]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#695B64] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {items.map((item, idx) => {
          const isOpen = openIndices.includes(idx);
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#EBE3D9] overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggleItem(idx)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${id}-${idx}`}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF7F2]/60 transition-colors"
              >
                <span className="font-editorial-serif text-sm sm:text-base font-bold text-[#2D222A]">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#C98A84] shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div
                  id={`faq-answer-${id}-${idx}`}
                  className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 text-xs sm:text-sm text-[#695B64] leading-relaxed border-t border-[#EBE3D9]/50 animate-in fade-in duration-200"
                >
                  <p>{item.answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

