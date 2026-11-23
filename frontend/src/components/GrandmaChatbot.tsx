import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  X,
  Send,
  Volume2,
  RotateCcw,
  Smile
} from "lucide-react";
import {
  answerGrandmaQuery,
  getCurrentRoutineStage,
  GrandmaMessage,
  GRANDMA_ROUTINE_STAGES
} from "@/lib/grandmaKnowledge";

// Lovable Cartoon Grandma Avatar Component
export function CartoonGrandmaAvatar({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative shrink-0 flex items-center justify-center select-none ${className}`}>
      <img
        src="/grandma_avatar.jpg"
        alt="Kutty Grandma"
        className="w-full h-full object-cover rounded-full drop-shadow-md"
      />
    </div>
  );
}

interface GrandmaChatbotProps {
  className?: string;
}

export default function GrandmaChatbot({ className = "" }: GrandmaChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [childName, setChildName] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [messages, setMessages] = useState<GrandmaMessage[]>([
    {
      id: "welcome-1",
      sender: "grandma",
      text: `Hi Kanna! 👵✨ I am **Kutty Grandma**.

Ask me for a soothing bedtime story, our 24-hour parenting tips, or how our personalised storybooks work!`,
      timestamp: "Just now",
      quickPrompts: [
        "⏰ What to do right now?",
        "🍲 Afternoon what to do",
        "🌅 Morning routine",
        "🌙 Tell me a bedtime story",
        "📖 How does KuttyStory work?",
        "💰 Book prices & delivery",
        "🥦 Fussy eating secret",
        "🧸 Tantrum calming advice"
      ]
    }
  ]);

  const [currentStage, setCurrentStage] = useState(getCurrentRoutineStage());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatDrawerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (chatDrawerRef.current && !chatDrawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Update current routine stage periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage(getCurrentRoutineStage());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Preload and keep voices updated
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Stop speech when closing
  useEffect(() => {
    if (!isOpen && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  // Voice narration using Web Speech API
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    // Clean markdown asterisks, bold marks, emojis, links for clear reading
    const cleanText = text
      .replace(/[*_#`~]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[^\w\s.,!?'"–-]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.88; // Gentle, comforting grandmother pace
    utterance.pitch = 1.05; // Warm and inviting grandmother tone

    // Try finding a gentle Indian English or soft female voice
    const voicesList = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    const preferredVoice =
      voicesList.find((v) => v.lang === "en-IN" || v.name.includes("India")) ||
      voicesList.find((v) => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("grandma") || v.name.toLowerCase().includes("natural")) ||
      voicesList.find((v) => v.lang.startsWith("en-"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleSpeaker = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      // Pause/stop speaking immediately
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setVoiceEnabled(false);
    } else {
      // Read out the latest Grandma message
      setVoiceEnabled(true);
      const lastGrandmaMsg = [...messages].reverse().find((m) => m.sender === "grandma");
      if (lastGrandmaMsg) {
        speakText(lastGrandmaMsg.text);
      }
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;

    // Add user message
    const userMsg: GrandmaMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: "Just now"
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");

    // Simulate Grandma's warm thoughtful response
    setTimeout(() => {
      const grandmaReply = answerGrandmaQuery(text, childName);
      setMessages((prev) => [...prev, grandmaReply]);

      if (voiceEnabled) {
        speakText(grandmaReply.text);
      }
    }, 450);
  };

  const handleResetChat = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "grandma",
        text: `Welcome back, Kanna! 👵✨ Grandma has poured fresh warm milk and opened the big velvet storybook. What shall we talk about next?`,
        timestamp: "Just now",
        quickPrompts: [
          "🌙 Tell me a bedtime story",
          "⏰ What's our routine now?",
          "📖 How does KuttyStory work?",
          "🥦 Fussy eating tip"
        ]
      }
    ]);
  };

  const handleActionLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsOpen(false);
    if (href.includes("#")) {
      const [targetPath, hash] = href.split("#");
      const currentPath = window.location.pathname;

      const scrollToTarget = () => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };

      if (!targetPath || currentPath === targetPath) {
        e.preventDefault();
        window.history.pushState(null, "", href);
        setTimeout(scrollToTarget, 60);
      } else {
        setTimeout(scrollToTarget, 300);
      }
    }
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. FLOATING DOCK TRIGGER BUTTON (Positioned Before Instagram)
          ───────────────────────────────────────────────────────────── */}
      <div className={`relative group ${className}`}>
        {/* Pulsing Luminous Golden-Coral Aura */}
        <div className="absolute -inset-1 rounded-full animate-grandma-aura pointer-events-none" />

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Open Grandma Chatbot: Stories & 24-Hour Parenting"
          aria-expanded={isOpen}
          className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-br from-white via-[#FFF8F3] to-[#FFE8E0] hover:from-white hover:to-[#FFDCD3] border-[2.5px] border-[#DE6B58] hover:border-[#BE123C] shadow-[0_4px_18px_rgba(222,107,88,0.45)] hover:shadow-[0_6px_25px_rgba(225,29,72,0.65)] hover:scale-110 active:scale-95 flex items-center justify-center transition-all duration-300 cursor-pointer group"
        >
          {/* Cartoon Grandma Avatar */}
          <CartoonGrandmaAvatar className="w-10 h-10 sm:w-11 sm:h-11" />

          {/* Brilliant Golden Sparkle Attention Badge with Twinkle/Blink Animation */}
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-gradient-to-tr from-[#D97706] via-[#F59E0B] to-[#FDE047] text-white flex items-center justify-center shadow-md border-2 border-white text-[11px] font-bold animate-grandma-twinkle">
            ✨
          </span>
        </button>

        {/* Desktop Tooltip */}
        <span className="pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#2D222A] text-white text-[11px] font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hidden sm:flex items-center gap-1.5 z-40">
          <span>Ask Grandma · Stories & Parenting</span>
          <span className="text-[#F59E0B]">👵✨</span>
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. GRANDMA CHATBOT MODAL / ENCHANTED STORY DRAWER
          ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <>
          {/* Subtle mobile backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <aside
            ref={chatDrawerRef}
            role="dialog"
            aria-label="Grandma's Story & Parenting Corner"
            className="fixed bottom-2 right-2 sm:bottom-5 sm:right-5 z-50 w-[calc(100vw-1rem)] sm:w-[380px] md:w-[400px] max-w-[calc(100vw-1rem)] max-h-[84vh] sm:max-h-[580px] h-[520px] sm:h-[560px] bg-[#FAF7F2] rounded-3xl border border-[#EBE3D9] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
          {/* Header */}
          <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-[#EBE3D9] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <CartoonGrandmaAvatar className="w-10 h-10 sm:w-11 sm:h-11" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-editorial-serif font-bold text-base sm:text-lg text-[#2D222A] leading-tight">
                    Kutty Grandma
                  </h3>
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1">
              {/* Speaker Button: Reads aloud or stops speech */}
              <button
                type="button"
                onClick={handleToggleSpeaker}
                className={`p-1.5 rounded-full transition-all cursor-pointer relative ${
                  isSpeaking
                    ? "text-[#C98A84] bg-[#FAEEED] ring-2 ring-[#C98A84]/40"
                    : "text-[#C98A84] hover:bg-[#FAEEED]"
                }`}
                title={isSpeaking ? "Pause / Stop Grandma's voice" : "Listen to Grandma read aloud"}
                aria-label={isSpeaking ? "Stop voice" : "Listen to Grandma"}
              >
                <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-pulse text-[#D99B26]" : ""}`} />
                {isSpeaking && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#D99B26] animate-ping" />
                )}
              </button>

              {/* Reset Chat */}
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 text-[#8C7A86] hover:text-[#2D222A] hover:bg-[#FAF7F2] rounded-full transition-colors cursor-pointer"
                title="Start a fresh conversation with Grandma"
                aria-label="Restart chat"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#8C7A86] hover:text-[#2D222A] hover:bg-[#FAF7F2] rounded-full transition-colors cursor-pointer ml-1"
                aria-label="Close Grandma Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 24-Hour Live Routine Banner */}
          <div className="bg-[#FAF1EF] px-4 py-2 border-b border-[#C98A84]/20 flex items-center justify-between text-xs text-[#2D222A] shrink-0">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="w-2 h-2 rounded-full bg-[#C98A84] animate-ping shrink-0" />
              <div className="truncate">
                <span className="font-bold text-[#8A3D36]">Right Now ({currentStage.time}):</span>{" "}
                <span className="text-[#695B64] font-medium">{currentStage.activity}</span>
              </div>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "grandma" && (
                  <CartoonGrandmaAvatar className="w-7 h-7 sm:w-8 sm:h-8 self-end mb-1" />
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                    msg.sender === "user"
                      ? "bg-[#C98A84] text-white rounded-br-xs font-medium"
                      : "bg-white text-[#2D222A] border border-[#EBE3D9] rounded-bl-xs"
                  }`}
                >
                  {/* Highlight pill if present */}
                  {msg.highlight && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FAEEED] border border-[#C98A84]/20 text-[10px] font-bold text-[#C98A84] mb-2 uppercase tracking-wide">
                      <Sparkles className="w-3 h-3" />
                      <span>{msg.highlight}</span>
                    </div>
                  )}

                  {/* Body text with formatting */}
                  <div className="whitespace-pre-wrap space-y-2">
                    {msg.text.split("\n\n").map((para, i) => (
                      <p key={i}>
                        {para.split("**").map((chunk, j) =>
                          j % 2 === 1 ? (
                            <strong key={j} className="font-bold text-[#2D222A]">
                              {chunk}
                            </strong>
                          ) : (
                            chunk
                          )
                        )}
                      </p>
                    ))}
                  </div>

                  {/* Optional CTA action link */}
                  {msg.actionLink && (
                    <div className="mt-3 pt-2.5 border-t border-[#EBE3D9]">
                      <Link
                        to={msg.actionLink.href}
                        onClick={(e) => handleActionLinkClick(e, msg.actionLink!.href)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAEEED] hover:bg-[#C98A84] text-[#C98A84] hover:text-white border border-[#C98A84]/30 text-xs font-bold transition-all shadow-2xs hover:shadow-xs"
                      >
                        <span>{msg.actionLink.label}</span>
                        <span>→</span>
                      </Link>
                    </div>
                  )}

                  {/* Footer timestamp for Grandma messages */}
                  {msg.sender === "grandma" && (
                    <div className="mt-2 text-[10px] text-[#8C7A86] pt-1 border-t border-[#EBE3D9]/60">
                      <span>Grandma's Love · {msg.timestamp}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Child Name Helper Input (Optional personalization badge) */}
          <div className="bg-white/80 px-4 py-1.5 border-t border-[#EBE3D9] flex items-center justify-between gap-2 text-[11px] text-[#695B64] shrink-0">
            <span className="flex items-center gap-1 shrink-0 font-medium">
              <Smile className="w-3.5 h-3.5 text-[#C98A84]" />
              <span>Child's name:</span>
            </span>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="e.g. Aarav, Diya (optional)"
              className="px-2 py-0.5 rounded-lg border border-[#EBE3D9] text-xs text-[#2D222A] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:border-[#C98A84] w-36 sm:w-44"
            />
          </div>

          {/* Quick Prompt Suggestions */}
          <div
            className="bg-white/95 px-3 py-2 border-t border-[#EBE3D9] flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden shrink-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {[
              "⏰ What to do right now?",
              "🍲 Afternoon",
              "🌅 Morning ",
              "🌳 Evening ",
              "🌙 Bedtime story",
              "📚 List out stories",
              "📖 How it works?",
              "💰 Prices & delivery",
              "🥦 Fussy eating tip",
              "🧸 Tantrum soother"
            ].map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-[#FAF7F2] hover:bg-[#FAEEED] text-[#2D222A] hover:text-[#C98A84] border border-[#EBE3D9] hover:border-[#C98A84]/40 text-[11px] font-medium transition-all shrink-0 cursor-pointer shadow-2xs hover:shadow-xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-[#EBE3D9] flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask Grandma a bedtime story, routine tip, or book question..."
              className="flex-1 px-3.5 py-2.5 rounded-full bg-[#FAF7F2] border border-[#EBE3D9] text-xs sm:text-[13px] text-[#2D222A] placeholder-[#8C7A86] focus:bg-white focus:outline-none focus:border-[#C98A84] focus:ring-1 focus:ring-[#C98A84]/50 transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#C98A84] hover:bg-[#A8625C] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-sm hover:shadow shrink-0 cursor-pointer"
              aria-label="Send question to Grandma"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </aside>
      </>
      )}
    </>
  );
}

