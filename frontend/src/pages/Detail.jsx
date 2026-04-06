import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Tag from "../components/Tag";
import AIPanel from "../components/AIPanel";
import AIModal from "../components/AIModal";
import { useAI } from "../hooks/useAI";
import { getDocument } from "../services/api";

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

function useScrollProgress(containerRef) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef?.current;
    const target = el || window;

    const update = () => {
      if (el) {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const pct = scrollHeight <= clientHeight ? 0 : scrollTop / (scrollHeight - clientHeight);
        setProgress(Math.min(1, Math.max(0, pct)));
      } else {
        const { scrollY, innerHeight } = window;
        const total = document.documentElement.scrollHeight - innerHeight;
        setProgress(total > 0 ? Math.min(1, scrollY / total) : 0);
      }
    };

    target.addEventListener("scroll", update, { passive: true });
    return () => target.removeEventListener("scroll", update);
  }, [containerRef]);

  return progress;
}

function useScrollSpy(headingIds, containerRef) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (!headingIds.length) return;

    const root = containerRef?.current ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // pick the topmost visible heading
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActive(top.target.id);
        }
      },
      { root, rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );

    headingIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headingIds, containerRef]);

  return active;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCROLL PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

function ScrollProgressBar({ progress }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] bg-white/5">
      <Motion.div
        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        style={{ scaleX: progress, originX: 0 }}
        transition={{ duration: 0.05 }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STICKY DOCUMENT HEADER
// ─────────────────────────────────────────────────────────────────────────────

function StickyDocHeader({ title, onBack, focusMode, onToggleFocus }) {
  const shortTitle = title && title.length > 55 ? title.slice(0, 52) + "…" : title;

  return (
    <div className="sticky top-[76px] z-[90] bg-[rgba(6,11,24,0.88)] backdrop-blur-xl border-b border-white/[0.06] py-2.5 px-5">
      <div className="flex items-center justify-between gap-4 max-w-[1440px] mx-auto">
        {/* Back */}
        <Motion.button
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-white transition-colors group shrink-0"
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Results
        </Motion.button>

        {/* Title */}
        <p className="text-[13px] font-medium text-slate-400 truncate hidden sm:block">
          {shortTitle}
        </p>

        {/* Focus mode toggle */}
        <Motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggleFocus}
          className={`shrink-0 inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
            focusMode
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
              : "text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:border-white/10"
          }`}
          title={focusMode ? "Exit focus mode" : "Enter focus mode"}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {focusMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            )}
          </svg>
          {focusMode ? "Exit Focus" : "Focus"}
        </Motion.button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFT PANEL
// ─────────────────────────────────────────────────────────────────────────────

function DocLeftPanel({ item }) {
  if (!item) return null;

  return (
    <div className="flex flex-col gap-6 py-10">
      {/* Chapter */}
      <div>
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.18em] mb-1.5 select-none">Chapter</p>
        <p className="text-[13px] text-slate-400 leading-snug">{item.chapter || "General"}</p>
      </div>

      {/* Difficulty */}
      {item.difficulty && (
        <div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.18em] mb-2 select-none">Level</p>
          <span
            className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg"
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.25)",
              color: "#c4b5fd",
            }}
          >
            {item.difficulty}
          </span>
        </div>
      )}

      {/* Tags */}
      {(item.tags ?? []).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.18em] mb-2.5 select-none">Topics</p>
          <div className="flex flex-wrap gap-1.5 overflow-hidden">
            {(item.tags ?? []).slice(0, 8).map((tag, i) => (
              <Tag key={i} label={tag} />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/[0.04]" />

      {/* Reader label */}
      <p className="text-[10px] font-mono text-slate-700 uppercase tracking-[0.2em] select-none">Reader View</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE OF CONTENTS
// ─────────────────────────────────────────────────────────────────────────────

function TableOfContents({ headings, activeHeading }) {
  if (!headings.length) return null;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav aria-label="Table of contents" className="py-10">
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-4 select-none">
        On this page
      </p>
      <ul className="space-y-0.5">
        {headings.map((h) => {
          const isActive = activeHeading === h.id;
          return (
            <li key={h.id}>
              <button
                onClick={() => scrollTo(h.id)}
                className={`w-full text-left text-[12.5px] leading-snug py-1.5 pl-3 border-l-[2px] transition-all duration-200 ${
                  isActive
                    ? "border-indigo-400 text-indigo-300 font-medium"
                    : "border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/20"
                }`}
              >
                {h.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTION POPUP
// ─────────────────────────────────────────────────────────────────────────────

function SelectionPopup({ position, selectedText, onCopy, onExplain }) {
  const [isCopied, setIsCopied] = useState(false);
  if (!position || !selectedText) return null;

  const handleInternalCopy = () => {
    onCopy();
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[300] flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0d1117]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-2 py-1.5"
      style={{ top: position.y - 60, left: position.x, transform: "translateX(-50%)" }}
    >
      <button
        onClick={handleInternalCopy}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium transition-all duration-200 ${
          isCopied 
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
            : "text-slate-300 hover:text-white hover:bg-white/10"
        }`}
      >
        {isCopied ? "Copied ✓" : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </>
        )}
      </button>
      
      <div className="w-px h-6 bg-white/10" />
      
      <button
        onClick={onExplain}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors group"
      >
        <span className="group-hover:scale-125 transition-transform duration-200">💡</span>
        Explain
      </button>
    </Motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAGRAPH BLOCK (interactive)
// ─────────────────────────────────────────────────────────────────────────────

function ParagraphBlock({ children, onCopy }) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  const handleCopy = useCallback(
    (e) => {
      e.stopPropagation();
      const text = ref.current?.innerText || "";
      navigator.clipboard.writeText(text).catch(() => {});
      onCopy?.(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    },
    [onCopy]
  );

  return (
    <div
      ref={ref}
      className="relative group/para"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p
        className={`text-[16px] sm:text-[17px] text-slate-300 leading-8 mb-6 rounded-xl -mx-3 px-3 py-2 transition-colors duration-200 break-words ${
          hovered ? "bg-white/[0.035]" : ""
        }`}
        style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}
      >
        {children}
      </p>

      {/* Copy button — appears on hover */}
      <AnimatePresence>
        {hovered && (
          <Motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.1 }}
            onClick={handleCopy}
            className="absolute -right-1 top-2 p-1.5 rounded-lg bg-[rgba(10,15,30,0.9)] border border-white/10 text-slate-500 hover:text-white hover:border-white/20 transition-all z-10"
            title="Copy paragraph"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </Motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT RENDERER
// ─────────────────────────────────────────────────────────────────────────────

function isHeadingBlock(block) {
  return (
    block.length < 72 &&
    !block.endsWith(".") &&
    !block.endsWith(",") &&
    !block.endsWith(":") &&
    block.split(" ").length < 11
  );
}

function ContentRenderer({ content, tags, onHeadingsExtracted }) {
  if (!content) {
    return <p className="text-slate-400">No content available.</p>;
  }

  const cleanContent = content.replace(/<\/?(em|mark|br)[^>]*>/gi, "");
  const blocks = cleanContent.split("\n").map((t) => t.trim()).filter(Boolean);

  // Build headings list once
  useEffect(() => {
    let idx = 0;
    const headings = blocks
      .filter(isHeadingBlock)
      .map((text) => ({ id: `h-${idx++}`, text }));
    onHeadingsExtracted?.(headings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const highlightKeywords = (text) => {
    if (!tags?.length) return text;
    try {
      const escaped = tags.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      const regex = new RegExp(`(${escaped})`, "gi");
      return text.split(regex).map((part, i) => {
        const match = tags.some((t) => t.toLowerCase() === part.toLowerCase());
        return match ? (
          <span
            key={i}
            className="bg-indigo-500/[0.18] text-indigo-200 px-1 py-0.5 mx-0.5 rounded font-medium"
          >
            {part}
          </span>
        ) : (
          part
        );
      });
    } catch {
      return text;
    }
  };

  let headingCounter = 0;

  return (
    <div className="w-full pt-6 pb-24">
      {blocks.map((block, idx) => {
        if (isHeadingBlock(block)) {
          const hId = `h-${headingCounter++}`;
          return (
            <h3
              id={hId}
              key={idx}
              className="text-xl font-semibold text-slate-100 mt-12 mb-4 tracking-tight scroll-mt-[140px]"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              {highlightKeywords(block)}
            </h3>
          );
        }
        return (
          <ParagraphBlock key={idx}>
            {highlightKeywords(block)}
          </ParagraphBlock>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [headings, setHeadings] = useState([]);
  const [focusMode, setFocusMode] = useState(false);
  const [selection, setSelection] = useState(null); // { text, x, y }
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { runTask, loading, result, error: aiError, currentAction, reset: resetAI } = useAI();

  const scrollContainerRef = useRef(null);
  const progress = useScrollProgress(scrollContainerRef);
  const activeHeading = useScrollSpy(
    headings.map((h) => h.id),
    scrollContainerRef
  );

  const handleAIAction = (action, force = false, customText = null) => {
    const text = customText || item.fullText || item.content || item.snippet;
    if (text) {
      setIsModalOpen(true);
      runTask(text, action, force);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetAI();
  };

  // Load document
  useEffect(() => {
    const controller = new AbortController();

    async function loadDocument() {
      try {
        setError("");
        const data = await getDocument(id, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setItem(data);
          setHeadings([]);
        }
      } catch (err) {
        if (!controller.signal.aborted && err?.name !== "AbortError") {
          setError(err.message || "Failed to load document.");
        }
      }
    }

    if (id) loadDocument();
    return () => controller.abort();
  }, [id]);

  // Text selection popup
  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (text && text.length > 2) {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelection({
            text,
            x: rect.left + rect.width / 2,
            y: rect.top + window.scrollY,
          });
        } else {
          setSelection(null);
        }
      }, 10);
    };

    const handleMouseDown = (e) => {
      // Dismiss popup on fresh click (unless clicking the popup itself)
      if (!e.target.closest("[data-selection-popup]")) {
        setSelection(null);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  const handleBack = useCallback(() => {
    const from = location.state?.from;
    navigate(from || "/results");
  }, [location, navigate]);

  const handleCopySelection = useCallback(() => {
    if (selection?.text) {
      navigator.clipboard.writeText(selection.text).catch(() => {});
      setSelection(null);
    }
  }, [selection]);

  return (
    <>
      {/* Reading progress bar — fixed to very top of viewport */}
      <ScrollProgressBar progress={progress} />

      <div
        ref={scrollContainerRef}
        className="min-h-screen overflow-y-auto custom-scrollbar"
        style={{ scrollBehavior: "smooth" }}
      >
        <Navbar />

        <div className="w-full pt-[76px]">
          {/* Sticky document header */}
          <StickyDocHeader
            title={item?.title}
            onBack={handleBack}
            focusMode={focusMode}
            onToggleFocus={() => setFocusMode((v) => !v)}
          />

          {/* ── 3-column grid ── */}
          <Motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`w-full mx-auto transition-all duration-500 ease-in-out ${
              focusMode ? "max-w-[820px] px-6" : "max-w-[1440px] pl-4 pr-6"
            }`}
          >
             <div
              className={`${
                focusMode
                  ? "block"
                  : "grid grid-cols-1 lg:grid-cols-[240px_1fr_200px] items-start"
              }`}
            >
              {/* ── LEFT SIDEBAR ── */}
              {!focusMode && (
                <aside className="hidden lg:block sticky top-[116px] self-start border-r border-white/[0.05] pr-6">
                  <DocLeftPanel item={item} />
                </aside>
              )}

              {/* ── MAIN CONTENT ── */}
              <main className="min-w-0 px-0 lg:px-10">
                {/* Mobile meta */}
                {!focusMode && item && (
                  <div className="lg:hidden pt-8 mb-8 flex flex-wrap gap-2 items-center">
                    {(item.tags ?? []).slice(0, 4).map((t, i) => <Tag key={i} label={t} />)}
                    {item.difficulty && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "#c4b5fd" }}>
                        {item.difficulty}
                      </span>
                    )}
                  </div>
                )}

                {/* States */}
                {!item && !error && (
                  <div className="text-slate-400 text-[15px] animate-pulse py-24 text-center">
                    Rendering document...
                  </div>
                )}
                {error && (
                  <div className="text-red-300 text-sm py-24 text-center">{error}</div>
                )}

                {/* Document content */}
                {item && (
                  <article className={focusMode ? "pt-12" : "pt-10"}>
                    {/* Header */}
                    <header className="mb-10">
                      <p className="text-[10px] font-bold text-indigo-400 mb-4 uppercase tracking-[0.25em] opacity-70 select-none">
                        {item.chapter || "GENERAL / KNOWLEDGE"}
                      </p>
                      <h1
                        className="text-4xl md:text-[44px] font-semibold text-white mb-7 leading-[1.18] tracking-tight break-words"
                        style={{ fontFamily: "Sora, sans-serif" }}
                      >
                        {item.title}
                      </h1>
                      <div className="h-px w-full bg-gradient-to-r from-white/10 via-white/[0.04] to-transparent" />
                    </header>

                    {/* Body */}
                    <ContentRenderer
                      content={item.fullText ?? item.content ?? item.snippet}
                      tags={item.tags ?? []}
                      onHeadingsExtracted={setHeadings}
                    />

                    {/* Mobile/Tablet AI Assistant Fallback */}
                    {!focusMode && (
                      <div className="lg:hidden mt-12 pb-10 border-t border-white/5 pt-10">
                        <AIPanel 
                          onAction={handleAIAction}
                          loading={loading}
                          activeAction={currentAction}
                          layout="horizontal"
                        />
                      </div>
                    )}
                  </article>
                )}
              </main>

              {/* ── RIGHT SIDEBAR (TOC + AI) ── */}
              {!focusMode && (
                <aside className="hidden lg:block sticky top-[116px] self-start border-l border-white/[0.05] pl-6 min-w-[200px]">
                  <AnimatePresence mode="wait">
                    <Motion.div
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, delay: 0.15 }}
                    >
                      {/* TOC only if headings exist */}
                      {headings.length > 0 && (
                        <TableOfContents
                          headings={headings}
                          activeHeading={activeHeading}
                        />
                      )}

                      {/* AI Assistant Panel - ALWAYS visible on desktop side */}
                      <AIPanel 
                        onAction={handleAIAction}
                        loading={loading}
                        activeAction={currentAction}
                      />
                    </Motion.div>
                  </AnimatePresence>
                </aside>
              )}
            </div>
          </Motion.div>
        </div>

        {/* AI Response Modal */}
        <AIModal
          isOpen={isModalOpen}
          onClose={closeModal}
          loading={loading}
          result={result}
          error={aiError}
          action={currentAction}
          onRegenerate={() => handleAIAction(currentAction, true)}
        />
      </div>

      {/* Text selection popup */}
      <AnimatePresence>
        {selection && (
          <div data-selection-popup="">
            <SelectionPopup
              position={selection}
              selectedText={selection.text}
              onCopy={handleCopySelection}
              onExplain={() => {
                handleAIAction("explain", false, selection.text);
                setSelection(null);
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
