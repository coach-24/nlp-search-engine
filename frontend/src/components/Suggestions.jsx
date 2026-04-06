import React from 'react';
import { motion as Motion } from 'framer-motion';

export function Suggestions({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 border border-white/10 bg-white/5 space-y-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">💡</span>
        <h3 className="text-sm font-semibold text-white tracking-tight uppercase">Smart Suggestions</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="px-3.5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-200 hover:bg-purple-500/20 hover:border-purple-400/40 transition-all duration-300 transform hover:-translate-y-0.5"
          >
            {suggestion}
          </button>
        ))}
      </div>
      
      <p className="text-[10px] text-slate-500 font-mono-custom tracking-wider text-center pt-2 border-t border-white/5 uppercase">
        Refine your search for better precision
      </p>
    </Motion.div>
  );
}
