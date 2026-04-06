import { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useExplain } from "../hooks/useExplain";

/**
 * ExplainButton
 *
 * Renders a "💡 Why this result?" button for a search result card.
 * On click it fetches an LLM explanation and displays it inline.
 *
 * Props:
 *   query  — the user's search query string
 *   text   — the result snippet / full text to explain
 */
export default function ExplainButton({ query, text }) {
  const { explain, explanation, loading, error, reset } = useExplain();
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    if (open) {
      reset();
      setOpen(false);
    } else {
      setOpen(true);
      explain(query, text);
    }
  };

  return (
    <div className="mt-3">
      {/* Trigger */}
      <Motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
          open
            ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
            : "text-slate-400 hover:text-indigo-300 border border-white/[0.06] hover:border-indigo-500/25 hover:bg-indigo-500/10"
        }`}
      >
        {/* Animated lightbulb */}
        <Motion.span
          animate={loading ? { rotate: [0, 15, -15, 0] } : {}}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          💡
        </Motion.span>
        {open ? "Hide explanation" : "Why this result?"}
      </Motion.button>

      {/* Explanation panel */}
      <AnimatePresence>
        {open && (
          <Motion.div
            key="explanation"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-3.5">
              {/* Loading */}
              {loading && !explanation && (
                <div className="flex items-center gap-2.5 text-[13px] text-slate-400">
                  <Motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                    className="inline-block w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"
                  />
                  Analysing match…
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 text-[13px] text-red-300">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {explanation && (
                <Motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="text-[13px] text-slate-300 leading-relaxed" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif" }}>
                    {explanation}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest select-none">AI</span>
                    <div className="flex-1 h-px bg-indigo-500/10" />
                  </div>
                </Motion.div>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
