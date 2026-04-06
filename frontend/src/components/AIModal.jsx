import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const AIModal = ({ isOpen, onClose, loading, result, error, onRegenerate, action }) => {
  const [isCopied, setIsCopied] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Reset copied state when modal opens/closes or result changes
  useEffect(() => {
    setIsCopied(false);
  }, [isOpen, result]);

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
          className="relative w-full max-w-[640px] bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <span className="text-xl">💡</span>
              <h3 className="text-lg font-semibold text-white tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                AI Response
                <span className="ml-3 text-[10px] font-bold text-indigo-400 uppercase tracking-widest opacity-60">
                  {action}
                </span>
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 min-h-[200px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-5">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"
                />
                <p className="text-slate-400 text-sm font-medium animate-pulse tracking-wide">Thinking...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-xl border border-red-500/20">
                  ⚠️
                </div>
                <div>
                  <p className="text-red-300 font-medium mb-1">Calculation Error</p>
                  <p className="text-slate-500 text-sm">{error}</p>
                </div>
                <button
                  onClick={onRegenerate}
                  className="mt-4 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
                >
                  Regenerate
                </button>
              </div>
            ) : result ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-[16px]"
              >
                {action === "summarize" ? (
                  <ul className="space-y-4 list-none p-0">
                    {result.split("\n").filter(l => l.trim().length > 5).map((bullet, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span>{bullet.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')}</span>
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <p className="whitespace-pre-wrap">{result}</p>
                )}
              </motion.div>
            ) : null}
          </div>

          {/* Footer */}
          {!loading && result && (
            <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  disabled={loading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium ${
                    isCopied 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                      : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {isCopied ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                  {isCopied ? "Copied ✓" : "Copy Response"}
                </button>
                <button
                  onClick={onRegenerate}
                  disabled={loading}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50"
                  title="Regenerate"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-all text-sm font-medium shadow-lg shadow-indigo-500/20"
              >
                Got it
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AIModal;
