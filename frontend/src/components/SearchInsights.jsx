import React from "react";
import { motion as Motion } from "framer-motion";

export function SearchInsights({ insights, onTagClick, onQuickFilter }) {
  if (!insights) return null;

  return (
    <div className="w-full sticky top-24 space-y-6 hidden lg:block">
      {/* 📊 SEARCH INSIGHTS */}
      <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📊</span>
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase italic">Search Insights</h3>
          </div>

          <div className="space-y-4">
            {/* Top Topics */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top Topics</div>
              <div className="space-y-3">
                {insights.top_topics.map((topic, i) => (
                  <div key={topic.name} className="group">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-300 font-medium group-hover:text-indigo-300 transition-colors cursor-pointer" onClick={() => onTagClick(topic.name)}>
                        {topic.name}
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">{topic.count} hits</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <Motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((topic.count / insights.top_topics[0].count) * 100, 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty Breakdown */}
            <div className="pt-2">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Difficulty</div>
              <div className="space-y-3">
                {Object.entries(insights.difficulty).map(([level, percentage]) => (
                  <div key={level}>
                    <div className="flex justify-between text-xs mb-1.5 capitalize">
                      <span className="text-slate-400">{level}</span>
                      <span className="text-slate-500 font-mono text-[10px]">{percentage}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <Motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className={`h-full ${
                          level === "beginner" ? "bg-emerald-500/60" : 
                          level === "intermediate" ? "bg-amber-500/60" : "bg-rose-500/60"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 RELATED CONCEPTS */}
      <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔥</span>
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase italic">Related Concepts</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {insights.related.map((concept) => (
            <button
              key={concept}
              onClick={() => onTagClick(concept)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/5 bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
            >
              • {concept}
            </button>
          ))}
        </div>
      </div>

      {/* ⚡ QUICK FILTERS */}
      <div className="glass-card rounded-2xl p-5 border border-white/10 bg-white/5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚡</span>
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase italic">Quick Scope</h3>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {[
            { label: "Beginner Friendly", value: "beginner" },
            { label: "Definitions Only", value: "definitions" },
            { label: "Algorithms & Logic", value: "algorithms" }
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => onQuickFilter(filter.value)}
              className="w-full text-left px-3 py-2 rounded-xl text-[12px] font-medium border border-indigo-500/10 bg-indigo-500/5 text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-100 transition-all group flex justify-between items-center"
            >
              {filter.label}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
