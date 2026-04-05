import { useMemo, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";

const FACET_LABELS = {
  chapter: "Chapter",
  topic: "Topics",
  difficulty: "Difficulty",
  concept_type: "Concept Type",
  tags: "Tags",
};

const FACET_CONFIG = [
  { key: "chapter", title: "Chapter", sourceKey: "chapters", defaultOpen: true },
  { key: "topic", title: "Topics", sourceKey: "topics", defaultOpen: true },
  { key: "difficulty", title: "Difficulty", sourceKey: "difficulties", defaultOpen: true },
  { key: "concept_type", title: "Concept Type", sourceKey: "concept_types", defaultOpen: true },
  { key: "tags", title: "Tags / Keywords", sourceKey: "tags", defaultOpen: false, limit: 14 },
];

const QUICK_FILTERS = [
  {
    key: "important",
    label: "Important",
    description: "Prioritize high-relevance concepts",
  },
  {
    key: "trending",
    label: "Trending",
    description: "Focus on hot NLP concept clusters",
  },
  {
    key: "frequent",
    label: "Frequent",
    description: "Common recurring ideas in the corpus",
  },
];

function FilterSection({ title, children, defaultOpen = true, count = 0 }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-[0.22em] group-hover:text-slate-200 transition-colors">
            {title}
          </span>
          {count > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] border border-indigo-400/20 bg-indigo-500/10 text-indigo-200 font-mono-custom">
              {count}
            </span>
          )}
        </div>
        <Motion.svg
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="w-3.5 h-3.5 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </Motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2">{children}</div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterCheckbox({ label, count, checked, onChange }) {
  return (
    <Motion.label
      whileHover={{ x: 2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
        checked
          ? "bg-indigo-500/12 border-indigo-400/35 shadow-[0_0_0_1px_rgba(129,140,248,0.08),0_10px_20px_rgba(79,70,229,0.12)]"
          : "bg-white/[0.015] border-white/5 hover:bg-white/[0.03] hover:border-white/10"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div
        className={`w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          checked ? "bg-indigo-500 border border-indigo-300" : "border border-white/15 bg-white/5"
        }`}
      >
        {checked && (
          <Motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-2.5 h-2.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </Motion.svg>
        )}
      </div>
      <span className={`text-sm flex-1 transition-colors ${checked ? "text-white" : "text-slate-300"}`}>
        {label}
      </span>
      <span className="text-xs font-mono-custom text-slate-500">{count}</span>
    </Motion.label>
  );
}

function SelectedChips({ filters, quickFilters, onRemove, onToggleQuick, onClear }) {
  const chips = useMemo(
    () => [
      ...Object.entries(filters).flatMap(([key, values]) =>
        values.map((value) => ({ type: "facet", key, value, label: FACET_LABELS[key] }))
      ),
      ...quickFilters.map((key) => ({ type: "quick", key, value: key, label: "Quick" })),
    ],
    [filters, quickFilters]
  );

  if (chips.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-[0.22em]">Selected</span>
        <button
          onClick={onClear}
          className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors font-mono-custom"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Motion.button
            key={`${chip.type}-${chip.key}-${chip.value}`}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => (chip.type === "quick" ? onToggleQuick(chip.key) : onRemove(chip.key, chip.value))}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/10 text-indigo-100 text-xs"
          >
            <span className="font-mono-custom text-[10px] uppercase tracking-[0.18em] text-indigo-300/85">
              {chip.label}
            </span>
            <span className="capitalize">{chip.value.replace(/_/g, " ")}</span>
            <span className="text-indigo-300">x</span>
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
      className={`w-full xl:w-[300px] xl:max-w-[300px] ${className}`}
    >
      <div className="glass-card rounded-3xl border border-white/8 p-5 h-full overflow-hidden">
        <div className="h-full flex flex-col">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="font-semibold text-white text-base" style={{ fontFamily: "Sora, sans-serif" }}>
                Refine Search
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Faceted filters for chapters, topics, concepts, and keyword slices.
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono-custom text-indigo-300">{activeCount} active</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar" style={{ scrollBehavior: "smooth" }}>
            <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-[0.22em] mb-3">
                Quick Filters
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((quickFilter) => {
                  const active = quickFilters.includes(quickFilter.key);
                  return (
                    <Motion.button
                      key={quickFilter.key}
                      whileHover={{ y: -1, scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onToggleQuick(quickFilter.key)}
                      title={quickFilter.description}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        active
                          ? "bg-indigo-500/18 border-indigo-400/30 text-indigo-100"
                          : "bg-white/[0.03] border-white/8 text-slate-400 hover:text-white hover:border-indigo-400/20"
                      }`}
                    >
                      {quickFilter.label}
                    </Motion.button>
                  );
                })}
              </div>
            </div>

            <SelectedChips
              filters={filters}
              quickFilters={quickFilters}
              onRemove={onToggle}
              onToggleQuick={onToggleQuick}
              onClear={onClear}
            />

            <div className="space-y-3">
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
                        <FilterCheckbox
                          key={`${section.key}-${item.value}`}
                          label={item.value}
                          count={item.count}
                          checked={filters[section.key]?.includes(item.value)}
                          onChange={() => onToggle(section.key, item.value)}
                        />
                      ))
                    ) : (
                      <div className="px-3 py-3 rounded-xl border border-white/5 bg-white/[0.015] text-sm text-slate-500">
                        {loading ? "Loading filters..." : "No filter values available"}
                      </div>
                    )}
                  </FilterSection>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {activeCount > 0 && (
              <Motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="pt-4 mt-4 border-t border-white/5"
              >
                <button
                  onClick={onClear}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all btn-primary"
                >
                  Clear All Filters
                </button>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Motion.aside>
  );
}
