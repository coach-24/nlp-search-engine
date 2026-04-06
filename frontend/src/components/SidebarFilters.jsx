import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";

import {
  FILTER_LABELS,
  QUICK_FILTER_LABELS,
  QUICK_FILTER_OPTIONS,
} from "../constants/search";

const FACET_CONFIG = [
  { key: "chapter", title: "Chapter", sourceKey: "chapters", defaultOpen: true },
  { key: "topic", title: "Topics", sourceKey: "topics", defaultOpen: false },
  { key: "difficulty", title: "Difficulty", sourceKey: "difficulties", defaultOpen: false },
  { key: "concept_type", title: "Concept Type", sourceKey: "concept_types", defaultOpen: false },
  { key: "tags", title: "Tags / Keywords", sourceKey: "tags", defaultOpen: false, limit: 14 },
];

function FilterSection({ title, children, defaultOpen = true, count = 0 }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="w-full mt-6 mb-2 last:mb-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-between w-full group py-1 cursor-pointer text-left outline-none mb-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-200 uppercase tracking-widest transition-colors font-sans">
            {title}
          </span>
          {count > 0 && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/15 text-purple-300">
              {count}
            </span>
          )}
        </div>
        <Motion.svg
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="w-[14px] h-[14px] text-slate-500 group-hover:text-slate-300 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </Motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden w-full"
          >
            <div className="pb-4 space-y-1 w-full flex flex-col">{children}</div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterRow({ label, count, checked, onChange }) {
  return (
    <Motion.label
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex items-center justify-between w-full px-3 py-2 min-h-[40px] rounded-lg cursor-pointer transition-all duration-200 group ${
        checked
          ? "bg-purple-500/15"
          : "hover:bg-white/5"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full transition-all duration-300 ${
          checked ? "bg-purple-400 opacity-100 shadow-[0_0_8px_rgba(192,132,252,0.7)]" : "bg-transparent opacity-0 group-hover:bg-white/20 group-hover:opacity-100"
        }`} />
        <span className={`text-[13px] truncate transition-colors duration-200 pl-1 ${
          checked ? "font-semibold text-purple-100" : "text-slate-300 group-hover:text-white"
        }`}>
          {label}
        </span>
      </div>
      <span className={`text-[12px] font-mono transition-colors ${checked ? "text-purple-300/90 font-medium" : "text-slate-500"}`}>
        {count}
      </span>
    </Motion.label>
  );
}

function SelectedChips({ filters, quickFilters, onRemove, onToggleQuick, onClear }) {
  const chips = useMemo(
    () => [
      ...Object.entries(filters).flatMap(([key, values]) =>
        values.map((value) => ({
          type: "facet",
          key,
          value,
          label: FILTER_LABELS[key],
        }))
      ),
      ...quickFilters.map((key) => ({
        type: "quick",
        key,
        value: key,
        label: QUICK_FILTER_LABELS[key] ?? key,
      })),
    ],
    [filters, quickFilters]
  );

  if (chips.length === 0) return null;

  return (
    <div className="w-full mb-10 pt-2">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Filters</span>
        <button
          onClick={onClear}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-200 transition-colors uppercase tracking-widest"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-col gap-2 w-full">
        {chips.map((chip) => (
          <Motion.button
            key={`${chip.type}-${chip.key}-${chip.value}`}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => (chip.type === "quick" ? onToggleQuick(chip.key) : onRemove(chip.key, chip.value))}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all ease-out duration-200 group text-left"
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300/60 shrink-0">
                {chip.type === "quick" ? "Q:" : `${chip.label}:`}
              </span>
              <span className="text-[13px] font-medium text-purple-50 truncate">{chip.type === "quick" ? chip.label : chip.value}</span>
            </div>
            <svg className="w-3.5 h-3.5 text-purple-400/60 group-hover:text-purple-200 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Motion.button>
        ))}
      </div>
    </div>
  );
}

export default function SidebarFilters({
  facets,
  filters,
  quickFilters,
  onToggle,
  onToggleQuick,
  onClear,
  loading = false,
  className = "",
}) {
  const activeCount =
    Object.values(filters).reduce((sum, values) => sum + values.length, 0) + quickFilters.length;

  return (
    <Motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`relative w-full h-full border-r border-white/5 bg-[#0a0a0b]/60 backdrop-blur-2xl ${className}`}
    >
      {/* Structural subtle inner depth/glow */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-white/[0.03] to-transparent shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] opacity-60" />

      <div className="relative z-10 h-full flex flex-col w-full">
        
        {/* Header Block */}
        <div className="flex flex-col w-full px-6 pt-8 pb-7">
          <div className="flex items-center justify-between w-full">
            <h2 className="font-semibold text-white text-xl tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
              Refine Search
            </h2>
            {activeCount > 0 && (
              <Motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[11px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30"
              >
                {activeCount}
              </Motion.div>
            )}
          </div>
          <p className="text-[14px] text-slate-400 mt-2.5 leading-relaxed">
            Filter by chapters, topics, concepts, and keys.
          </p>
        </div>

        {/* Subtle separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar" style={{ scrollBehavior: "smooth" }}>
          
          {/* Inner Content Block */}
          <div className="flex flex-col w-full h-full px-6 py-8 pb-20">
            
            <SelectedChips
              filters={filters}
              quickFilters={quickFilters}
              onRemove={onToggle}
              onToggleQuick={onToggleQuick}
              onClear={onClear}
            />

            <div className="w-full mt-2 mb-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Quick Filters</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 w-full">
                {QUICK_FILTER_OPTIONS.map((quickFilter) => {
                  const active = quickFilters.includes(quickFilter.key);
                  return (
                    <Motion.button
                      key={quickFilter.key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onToggleQuick(quickFilter.key)}
                      title={quickFilter.description}
                      className={`flex items-center justify-center w-full px-3 py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200 ease-out border ${
                        active
                          ? "bg-purple-500/20 border-purple-500/30 text-purple-200 shadow-sm"
                          : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {quickFilter.label}
                    </Motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col w-full space-y-2">
              {FACET_CONFIG.map((section) => {
                const items = (facets?.[section.sourceKey] ?? []).slice(0, section.limit ?? Infinity);

                return (
                  <FilterSection
                    key={section.key}
                    title={section.title}
                    count={filters[section.key]?.length ?? 0}
                    defaultOpen={section.defaultOpen}
                  >
                    {items.length > 0 ? (
                      items.map((item) => (
                        <FilterRow
                          key={`${section.key}-${item.value}`}
                          label={item.value}
                          count={item.count}
                          checked={filters[section.key]?.includes(item.value)}
                          onChange={() => onToggle(section.key, item.value)}
                        />
                      ))
                    ) : (
                      <div className="px-3 py-2 text-[12px] text-slate-500 italic">
                        {loading ? "Loading filters..." : "No values"}
                      </div>
                    )}
                  </FilterSection>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </Motion.aside>
  );
}
