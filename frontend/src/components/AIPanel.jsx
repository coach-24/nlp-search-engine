import { motion } from "framer-motion";

const AIPanel = ({ onAction, loading, activeAction, layout = "vertical" }) => {
  const actions = [
    { id: "explain", label: "Explain", icon: "📖", color: "text-indigo-400" },
    { id: "summarize", label: "Summarize", icon: "📝", color: "text-emerald-400" },
    { id: "example", label: "Example", icon: "💡", color: "text-amber-400" },
  ];

  const isHorizontal = layout === "horizontal";

  return (
    <div className={`${isHorizontal ? "w-full" : "mt-8 pt-8 border-t border-white/5"}`}>
      <div className={`flex items-center gap-2 mb-4 px-2 ${isHorizontal ? "justify-center" : ""}`}>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] select-none">
          AI Assistant
        </span>
      </div>

      <div className={`flex ${isHorizontal ? "flex-row justify-center gap-3" : "flex-col gap-2"}`}>
        {actions.map((action) => (
          <motion.button
            key={action.id}
            whileHover={isHorizontal ? { scale: 1.02 } : { x: 4, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction(action.id)}
            disabled={loading}
            className={`${isHorizontal ? "flex-1 max-w-[160px]" : "w-full"} flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 transition-all duration-200 group ${
              activeAction === action.id 
                ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-100" 
                : "bg-white/[0.03] text-slate-400 hover:text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3">
              <span className={`text-lg transition-transform group-hover:scale-110 duration-200 ${action.color}`}>
                {action.icon}
              </span>
              <span className="text-sm font-medium tracking-tight">
                {action.label}
              </span>
            </div>
            
            {!isHorizontal && (
              <svg 
                className={`w-3.5 h-3.5 transition-all duration-300 ${activeAction === action.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0"}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </motion.button>
        ))}
      </div>
      
      <p className={`mt-4 px-3 text-[10px] text-slate-600 leading-relaxed italic ${isHorizontal ? "text-center" : ""}`}>
        Powered by your local Ollama / Llama3 assistant.
      </p>
    </div>
  );
};

export default AIPanel;
