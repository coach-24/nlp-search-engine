import React from 'react';
import { motion as Motion } from 'framer-motion';

export function AboutSearch({ about }) {
  if (!about || about.length === 0) return null;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 border border-white/10 bg-white/5 space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🧠</span>
        <h3 className="text-sm font-semibold text-white tracking-tight uppercase">About this Search</h3>
      </div>
      
      <ul className="space-y-2">
        {about.map((line, index) => (
          <li key={index} className="flex gap-2 items-start">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {line}
            </p>
          </li>
        ))}
      </ul>
    </Motion.div>
  );
}
