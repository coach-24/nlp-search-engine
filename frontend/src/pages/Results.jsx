import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ResultCard from "../components/ResultCard";
import SearchBar from "../components/SearchBar";
import SidebarFilters from "../components/SidebarFilters";
import { getFilters, searchDocuments } from "../services/api";

const PAGE_SIZE = 10;
const QUICK_FILTER_MAP = {
  important: { difficulty: ["Advanced"] },
  trending: { topic: ["Transformers", "Language Models"] },
  frequent: { concept_type: ["Definition", "Theory"] },
};

const INITIAL_FILTERS = {
  chapter: [],
  topic: [],
  difficulty: [],
  concept_type: [],
  tags: [],
};

const EMPTY_FACETS = {
  chapters: [],
  topics: [],
  difficulties: [],
  concept_types: [],
  tags: [],
};

const FACET_LABELS = {
  chapter: "Chapter",
  topic: "Topics",
  difficulty: "Difficulty",
  concept_type: "Concept Type",
  tags: "Tags",
};

function filtersReducer(state, action) {
  switch (action.type) {
    case "toggle": {
      const values = state[action.key];
      const nextValues = values.includes(action.value)
        ? values.filter((item) => item !== action.value)
        : [...values, action.value];
      return { ...state, [action.key]: nextValues };
    }
    case "reset":
      return INITIAL_FILTERS;
    default:
      return state;
  }
}

function mergeFilters(baseFilters, quickFilters) {
  const merged = { ...baseFilters };

  quickFilters.forEach((quickKey) => {
    const quickConfig = QUICK_FILTER_MAP[quickKey];
    if (!quickConfig) return;

    Object.entries(quickConfig).forEach(([key, values]) => {
      merged[key] = Array.from(new Set([...(merged[key] ?? []), ...values]));
    });
  });

  return merged;
}

function LoadingState() {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-3xl border border-white/5 bg-white/[0.02] p-8"
    >
      <div className="flex items-center gap-3 text-slate-300">
        <div className="w-5 h-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-300 animate-spin" />
        <span className="text-sm">Loading results...</span>
      </div>
    </Motion.div>
  );
}

function EmptyState({ hasQuery, onClear }) {
  return (
    <Motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-24 rounded-3xl border border-white/5 bg-white/[0.02]"
    >
      <div className="text-5xl mb-4">Search</div>
      <h3 className="text-xl font-semibold text-slate-300 mb-2" style={{ fontFamily: "Sora, sans-serif" }}>
        {hasQuery ? "No results found" : "Start with a search"}
      </h3>
      <p className="text-slate-500 mb-5">
        {hasQuery ? "Try adjusting the query or clearing a few filters." : "Search concepts, models, and algorithms from the NLP textbook index."}
      </p>
      {hasQuery && (
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/15 transition-colors"
        >
          Clear Filters
        </button>
      )}
    </Motion.div>
  );
}

function ActiveFilterSummary({
  filters,
  quickFilters,
  onRemove,
  onToggleQuick,
  onClear,
  total,
  page,
  totalPages,
}) {
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
    <div className="mb-6 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono-custom text-slate-500">
          {total} results | page {page} of {totalPages}
        </span>
        {chips.map((chip) => (
          <button
            key={`${chip.type}-${chip.key}-${chip.value}`}
            onClick={() => (chip.type === "quick" ? onToggleQuick(chip.key) : onRemove(chip.key, chip.value))}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-indigo-400/20 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15 transition-colors"
          >
            <span className="font-mono-custom text-[10px] uppercase tracking-[0.18em] text-indigo-300/85">
              {chip.label}
            </span>
            <span className="capitalize">{chip.value.replace(/_/g, " ")}</span>
            <span className="text-indigo-300">x</span>
          </button>
        ))}
        <button
          onClick={onClear}
          className="ml-auto text-xs text-indigo-300 hover:text-indigo-200 transition-colors font-mono-custom"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const filtered = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const items = [];

  for (let index = 0; index < filtered.length; index += 1) {
    if (index > 0 && filtered[index] - filtered[index - 1] > 1) {
      items.push(`ellipsis-${index}`);
    }
    items.push(filtered[index]);
  }

  return items;
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-2 pb-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-xl border border-white/8 bg-white/[0.03] text-sm text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-indigo-400/20 hover:text-white transition-colors"
      >
        Previous
      </button>

      {buildPageItems(currentPage, totalPages).map((item) =>
        typeof item === "string" ? (
          <span key={item} className="px-2 text-slate-500">
            ...
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-10 h-10 rounded-xl text-sm font-mono-custom transition-all ${
              currentPage === item
                ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30"
                : "bg-white/[0.03] border border-white/8 text-slate-400 hover:text-white hover:border-indigo-400/20"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-4 py-2 rounded-xl border border-white/8 bg-white/[0.03] text-sm text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-indigo-400/20 hover:text-white transition-colors"
      >
        Next
      </button>
    </div>
  );
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const desktopResultsRef = useRef(null);
  const mobileResultsRef = useRef(null);

  const [filters, dispatch] = useReducer(filtersReducer, INITIAL_FILTERS);
  const [quickFilters, setQuickFilters] = useState([]);
  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState(EMPTY_FACETS);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("relevance");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const query = searchParams.get("q")?.trim() || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const requestFilters = useMemo(() => mergeFilters(filters, quickFilters), [filters, quickFilters]);

  const syncRoute = (nextQuery = query, nextPage = page, replace = false) => {
    const params = new URLSearchParams();
    if (nextQuery?.trim()) {
      params.set("q", nextQuery.trim());
    }
    if (nextPage > 1) {
      params.set("page", String(nextPage));
    }

    navigate(
      {
        pathname: "/results",
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace }
    );
  };

  useEffect(() => {
    let ignore = false;

    async function loadResults() {
      if (!query) {
        setResults([]);
        setTotal(0);
        setTotalPages(1);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await searchDocuments(query, {
          ...requestFilters,
          size: PAGE_SIZE,
          page,
        });

        if (!ignore) {
          setResults(data.results ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.total_pages ?? 1);
          setFacets(data.facets ?? EMPTY_FACETS);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to fetch results.");
          setResults([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadResults();

    return () => {
      ignore = true;
    };
  }, [page, query, requestFilters]);

  useEffect(() => {
    let ignore = false;

    async function loadFacetCatalog() {
      try {
        const data = await getFilters({ q: query, ...requestFilters });
        if (!ignore) {
          setFacets(data);
        }
      } catch {
        if (!ignore) {
          setFacets((current) => current ?? EMPTY_FACETS);
        }
      }
    }

    loadFacetCatalog();

    return () => {
      ignore = true;
    };
  }, [query, requestFilters]);

  useEffect(() => {
    desktopResultsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    mobileResultsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [page, query, requestFilters, sortBy]);

  const handleSearch = (newQuery) => {
    if (newQuery.trim()) {
      syncRoute(newQuery, 1);
    }
  };

  const toggleFilter = (key, value) => {
    if (page !== 1) {
      syncRoute(query, 1, true);
    }
    dispatch({ type: "toggle", key, value });
  };

  const toggleQuickFilter = (key) => {
    if (page !== 1) {
      syncRoute(query, 1, true);
    }
    setQuickFilters((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
  };

  const clearFilters = () => {
    if (page !== 1) {
      syncRoute(query, 1, true);
    }
    setQuickFilters([]);
    dispatch({ type: "reset" });
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    syncRoute(query, nextPage);
  };

  const sortedData = useMemo(() => {
    const nextData = [...results];
    if (sortBy === "alphabetical") {
      return nextData.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }
    return nextData.sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [results, sortBy]);

  return (
    <div
      className="h-screen overflow-hidden relative"
      style={{ background: "linear-gradient(160deg, #060b18 0%, #0a1128 50%, #060b18 100%)" }}
    >
      <div
        className="orb w-[500px] h-[500px] top-[-100px] right-[-100px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }}
      />
      <div
        className="orb w-[420px] h-[420px] bottom-[160px] left-[-120px]"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)" }}
      />

      <Navbar />

      <div className="pt-[76px] h-full flex flex-col">
        <div className="relative z-[95] shrink-0 border-b border-white/5 bg-[rgba(6,11,24,0.9)] backdrop-blur-xl">
          <div className="max-w-[1400px] mx-auto px-6 py-5">
            <SearchBar onSearch={handleSearch} defaultValue={query} compact />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <div className="max-w-[1400px] mx-auto px-6 py-6 h-full">
            <div className="hidden xl:grid grid-cols-[300px_minmax(0,1fr)] gap-6 h-full items-start">
              <div className="h-full min-h-0">
                <div className="h-full sticky top-0">
                  <SidebarFilters
                    facets={facets}
                    filters={filters}
                    quickFilters={quickFilters}
                    onToggle={toggleFilter}
                    onToggleQuick={toggleQuickFilter}
                    onClear={clearFilters}
                    loading={loading}
                    className="h-full"
                  />
                </div>
              </div>

              <div ref={desktopResultsRef} className="min-w-0 h-full overflow-y-auto custom-scrollbar pr-1">
                <div className="pb-4">
                  <Motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-6"
                  >
                    <div>
                      <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                        Results for <span className="gradient-text">"{query || "All Concepts"}"</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-2 font-mono-custom">
                        {total} results | page {page} of {totalPages} | {PAGE_SIZE} per page
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-600">Sort by:</span>
                      {["relevance", "alphabetical"].map((option) => (
                        <button
                          key={option}
                          onClick={() => setSortBy(option)}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-all duration-200 capitalize font-mono-custom ${
                            sortBy === option
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </Motion.div>

                  {error && (
                    <div className="mb-6 rounded-2xl border border-red-400/15 bg-red-500/8 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <ActiveFilterSummary
                    filters={filters}
                    quickFilters={quickFilters}
                    onRemove={toggleFilter}
                    onToggleQuick={toggleQuickFilter}
                    onClear={clearFilters}
                    total={total}
                    page={page}
                    totalPages={totalPages}
                  />

                  {loading ? (
                    <LoadingState />
                  ) : sortedData.length > 0 ? (
                    <AnimatePresence mode="wait">
                      <Motion.div
                        key={`${query}-${sortBy}-${page}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                      >
                        {sortedData.map((item, index) => (
                          <ResultCard key={item.id || item.title} item={item} query={query} index={index} />
                        ))}
                      </Motion.div>
                    </AnimatePresence>
                  ) : (
                    <EmptyState hasQuery={Boolean(query)} onClear={clearFilters} />
                  )}

                  {!loading && sortedData.length > 0 && (
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                  )}
                </div>
              </div>
            </div>

            <div ref={mobileResultsRef} className="xl:hidden h-full overflow-y-auto pr-1 custom-scrollbar">
              <Motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col gap-4 mb-6"
              >
                <div>
                  <h2 className="text-2xl font-semibold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
                    Results for <span className="gradient-text">"{query || "All Concepts"}"</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 font-mono-custom">
                    {total} results | page {page} of {totalPages} | {PAGE_SIZE} per page
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={() => setMobileFiltersOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-sm text-slate-200 hover:border-indigo-400/20 hover:text-white transition-colors"
                  >
                    Open Filters
                  </button>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-600">Sort by:</span>
                    {["relevance", "alphabetical"].map((option) => (
                      <button
                        key={option}
                        onClick={() => setSortBy(option)}
                        className={`text-xs px-3 py-1.5 rounded-lg transition-all duration-200 capitalize font-mono-custom ${
                          sortBy === option
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "text-slate-500 hover:text-slate-300 border border-transparent hover:border-white/10"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </Motion.div>

              {error && (
                <div className="mb-6 rounded-2xl border border-red-400/15 bg-red-500/8 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <ActiveFilterSummary
                filters={filters}
                quickFilters={quickFilters}
                onRemove={toggleFilter}
                onToggleQuick={toggleQuickFilter}
                onClear={clearFilters}
                total={total}
                page={page}
                totalPages={totalPages}
              />

              {loading ? (
                <LoadingState />
              ) : sortedData.length > 0 ? (
                <AnimatePresence mode="wait">
                  <Motion.div
                    key={`${query}-${sortBy}-${page}-mobile`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    {sortedData.map((item, index) => (
                      <ResultCard key={item.id || item.title} item={item} query={query} index={index} />
                    ))}
                  </Motion.div>
                </AnimatePresence>
              ) : (
                <EmptyState hasQuery={Boolean(query)} onClear={clearFilters} />
              )}

              {!loading && sortedData.length > 0 && (
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileFiltersOpen && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="xl:hidden fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm p-4"
          >
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-md mx-auto mt-20 h-[calc(100vh-7rem)]"
            >
              <SidebarFilters
                facets={facets}
                filters={filters}
                quickFilters={quickFilters}
                onToggle={toggleFilter}
                onToggleQuick={toggleQuickFilter}
                onClear={clearFilters}
                loading={loading}
                className="h-full"
              />
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="mt-3 w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.04] text-slate-200"
              >
                Close Filters
              </button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
