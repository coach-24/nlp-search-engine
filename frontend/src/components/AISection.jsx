import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAI } from "../hooks/useAI";

const AISection = ({ content }) => {
  const { runTask, loading, result, error, currentAction, reset } = useAI();
  const [copied, setCopied] = useState(false);

  const actions = [
    { id: "explain", label: "Explain", icon: "📖" },
    { id: "summarize", label: "Summarize", icon: "📝" },
    { id: "example", label: "Example", icon: "💡" },
  ];

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = () => {
    if (currentAction) {
      runTask(content, currentAction);
    }
  };

  return (
    <section className="mt-16 pb-20 border-t border-white/5 pt-10">
      <div className="flex items-center gap-3 mb-8">
        <span className="text-2xl">✨</span>
        <h2 className="text-2xl font-semibold text-white tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
          AI Assistant
        </h2>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {actions.map((action) => (
          <motion.button
            key={action.id}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => runTask(content, action.id)}
            disabled={loading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
              currentAction === action.id
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-200 shadow-lg shadow-indigo-500/10"
                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/20 hover:text-slate-200"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span>{action.icon}</span>
            {action.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {(loading || result || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl bg-white/[0.03] border border-white/10 p-6 min-h-[120px] flex flex-col"
          >
            {loading && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full"
                />
                <p className="text-slate-400 text-sm font-medium animate-pulse">Thinking...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-300 text-sm font-medium">{error}</p>
                <button
                  onClick={handleRegenerate}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4"
                >
                  Try again
                </button>
              </div>
            )}

            {result && !loading && (
              <>
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={handleRegenerate}
                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Regenerate"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>

                <div className="pr-12">
                  {currentAction === "summarize" ? (
                    <ul className="space-y-4">
                      {result.split("\n").filter(line => line.trim().startsWith("-") || line.trim().match(/^\d+\./) || line.trim().length > 5).map((bullet, idx) => (
                        <motion.li
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-3 text-slate-300 text-[15px] leading-relaxed"
                        >
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500/60 flex-shrink-0" />
                          {bullet.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')}
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-slate-300 text-[15px] leading-relaxed whitespace-pre-wrap"
                    >
                      {result}
                    </motion.p>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-400/60 uppercase tracking-widest select-none">AI Response</span>
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest">•</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">{currentAction}</span>
                  </div>
                  <button
                    onClick={reset}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default AISection;
