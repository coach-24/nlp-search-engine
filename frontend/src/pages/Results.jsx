import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";

import Navbar from "../components/Navbar";
import ResultCard from "../components/ResultCard";
import SearchBar from "../components/SearchBar";
import SidebarFilters from "../components/SidebarFilters";
import {
  EMPTY_FACETS,
  FILTER_LABELS,
  PAGE_SIZE,
  QUICK_FILTER_LABELS,
  SEARCH_FILTER_KEYS,
  SORT_OPTIONS,
  createEmptyFilters,
  sanitizeList,
  sanitizeQuickFilters,
} from "../constants/search";
import { getFilters, searchDocuments } from "../services/api";

function readPositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readSort(searchParams) {
  const sort = searchParams.get("sort");
  return SORT_OPTIONS.some((option) => option.key === sort) ? sort : "relevance";
}

function readFilters(searchParams) {
  const nextFilters = createEmptyFilters();
  SEARCH_FILTER_KEYS.forEach((key) => {
    nextFilters[key] = sanitizeList(searchParams.getAll(key));
  });
  return nextFilters;
}

function writeListParam(searchParams, key, values) {
  searchParams.delete(key);
  values.forEach((value) => searchParams.append(key, value));
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
        {hasQuery
          ? "Try adjusting the query, switching sort mode, or clearing a few filters."
          : "Search concepts, models, and algorithms from the NLP textbook index."}
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

function DidYouMeanBanner({ suggestion, onSelect }) {
  if (!suggestion) return null;

  return (
    <div className="mb-6 rounded-2xl border border-amber-300/15 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
      Did you mean{" "}
      <button
        type="button"
        onClick={() => onSelect(suggestion)}
        className="font-semibold text-amber-50 underline decoration-amber-200/50 underline-offset-4 hover:text-white"
      >
        {suggestion}
      </button>
      ?
    </div>
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
        values.map((value) => ({ type: "facet", key, value, label: FILTER_LABELS[key] }))
      ),
      ...quickFilters.map((key) => ({
        type: "quick",
        key,
        value: QUICK_FILTER_LABELS[key] ?? key,
        label: "Quick",
      })),
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
            <span>{chip.value}</span>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const desktopResultsRef = useRef(null);
  const mobileResultsRef = useRef(null);

  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState(EMPTY_FACETS);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [didYouMean, setDidYouMean] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const query = (searchParams.get("q") ?? "").trim();
  const page = readPositiveInteger(searchParams.get("page"), 1);
  const sortBy = readSort(searchParams);
  const semantic = searchParams.get("semantic") === "1";
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const quickFilters = useMemo(() => sanitizeQuickFilters(searchParams.getAll("quick_filter")), [searchParams]);

  const updateSearchState = useCallback(
    (mutate, { replace = false } = {}) => {
      const nextParams = new URLSearchParams(searchParams);
      mutate(nextParams);

      const nextQuery = (nextParams.get("q") ?? "").trim();
      if (nextQuery) {
        nextParams.set("q", nextQuery);
      } else {
        nextParams.delete("q");
      }

      const nextPage = readPositiveInteger(nextParams.get("page"), 1);
      if (nextPage > 1) {
        nextParams.set("page", String(nextPage));
      } else {
        nextParams.delete("page");
      }

      if (readSort(nextParams) === "alphabetical") {
        nextParams.set("sort", "alphabetical");
      } else {
        nextParams.delete("sort");
      }

      if (nextParams.get("semantic") === "1") {
        nextParams.set("semantic", "1");
      } else {
        nextParams.delete("semantic");
      }

      SEARCH_FILTER_KEYS.forEach((key) => {
        writeListParam(nextParams, key, sanitizeList(nextParams.getAll(key)));
      });
      writeListParam(nextParams, "quick_filter", sanitizeQuickFilters(nextParams.getAll("quick_filter")));

      setSearchParams(nextParams, { replace });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (!query && page !== 1) {
      updateSearchState((nextParams) => nextParams.delete("page"), { replace: true });
    }
  }, [page, query, updateSearchState]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setError("");
      setDidYouMean("");

      if (!query) {
        setLoading(false);
        setResults([]);
        setTotal(0);
        setTotalPages(1);

        try {
          const data = await getFilters({
            ...filters,
            quick_filter: quickFilters,
            signal: controller.signal,
          });

          if (!controller.signal.aborted) {
            setFacets(data ?? EMPTY_FACETS);
          }
        } catch (fetchError) {
          if (!controller.signal.aborted && fetchError?.name !== "AbortError") {
            setFacets(EMPTY_FACETS);
          }
        }

        return;
      }

      setLoading(true);

      try {
        const data = await searchDocuments(query, {
          ...filters,
          quick_filter: quickFilters,
          size: PAGE_SIZE,
          page,
          semantic,
          sort: sortBy,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        const nextTotalPages = Math.max(1, readPositiveInteger(`${data.total_pages ?? 1}`, 1));
        if (page > nextTotalPages) {
          setDidYouMean(data.did_you_mean ?? "");
          updateSearchState(
            (nextParams) => {
              if (nextTotalPages > 1) {
                nextParams.set("page", String(nextTotalPages));
              } else {
                nextParams.delete("page");
              }
            },
            { replace: true }
          );
          return;
        }

        setResults(Array.isArray(data.results) ? data.results : []);
        setTotal(Number(data.total ?? 0));
        setTotalPages(nextTotalPages);
        setFacets(data.facets ?? EMPTY_FACETS);
        setDidYouMean(data.did_you_mean ?? "");
      } catch (fetchError) {
        if (controller.signal.aborted || fetchError?.name === "AbortError") {
          return;
        }

        setError(fetchError.message || "Failed to fetch results.");
        setResults([]);
        setTotal(0);
        setTotalPages(1);
        setDidYouMean("");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [filters, page, query, quickFilters, semantic, sortBy, updateSearchState]);

  useEffect(() => {
    desktopResultsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    mobileResultsRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [filters, page, query, quickFilters, semantic, sortBy]);

  const handleSearch = useCallback(
    (nextQuery) => {
      const trimmed = nextQuery.trim();
      if (!trimmed) return;

      updateSearchState((nextParams) => {
        nextParams.set("q", trimmed);
        nextParams.delete("page");
      });
    },
    [updateSearchState]
  );

  const toggleFilter = useCallback(
    (key, value) => {
      updateSearchState((nextParams) => {
        const currentValues = sanitizeList(nextParams.getAll(key));
        const normalizedValue = value.trim().toLowerCase();
        const nextValues = currentValues.some((entry) => entry.toLowerCase() === normalizedValue)
          ? currentValues.filter((entry) => entry.toLowerCase() !== normalizedValue)
          : [...currentValues, value];

        writeListParam(nextParams, key, nextValues);
        nextParams.delete("page");
      }, { replace: true });
    },
    [updateSearchState]
  );

  const toggleQuickFilter = useCallback(
    (key) => {
      updateSearchState((nextParams) => {
        const currentValues = sanitizeQuickFilters(nextParams.getAll("quick_filter"));
        const nextValues = currentValues.includes(key)
          ? currentValues.filter((entry) => entry !== key)
          : [...currentValues, key];

        writeListParam(nextParams, "quick_filter", nextValues);
        nextParams.delete("page");
      }, { replace: true });
    },
    [updateSearchState]
  );

  const clearFilters = useCallback(() => {
    updateSearchState((nextParams) => {
      SEARCH_FILTER_KEYS.forEach((key) => nextParams.delete(key));
      nextParams.delete("quick_filter");
      nextParams.delete("page");
    }, { replace: true });
  }, [updateSearchState]);

  const handleTagClick = useCallback(
    (tag) => {
      toggleFilter("tags", tag);
    },
    [toggleFilter]
  );

  const handlePageChange = useCallback(
    (nextPage) => {
      if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;

      updateSearchState((nextParams) => {
        if (nextPage > 1) {
          nextParams.set("page", String(nextPage));
        } else {
          nextParams.delete("page");
        }
      });
    },
    [page, totalPages, updateSearchState]
  );

  const handleSortChange = useCallback(
    (nextSort) => {
      updateSearchState((nextParams) => {
        if (nextSort === "alphabetical") {
          nextParams.set("sort", "alphabetical");
        } else {
          nextParams.delete("sort");
        }
        nextParams.delete("page");
      }, { replace: true });
    },
    [updateSearchState]
  );

  const toggleSemantic = useCallback(() => {
    updateSearchState((nextParams) => {
      if (nextParams.get("semantic") === "1") {
        nextParams.delete("semantic");
      } else {
        nextParams.set("semantic", "1");
      }
      nextParams.delete("page");
    }, { replace: true });
  }, [updateSearchState]);

  const displayedPage = Math.min(page, totalPages);

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

      <div className="pt-[76px] h-full flex flex-row w-full overflow-hidden relative z-[95]">
        
        {/* Left Sidebar - Fixed to Left Edge */}
        <div className="hidden lg:block w-[320px] xl:w-[340px] shrink-0 h-full border-r border-white/5 bg-[rgba(6,11,24,0.6)] backdrop-blur-xl overflow-y-auto leading-none z-[90]">
          <SidebarFilters
            facets={facets}
            filters={filters}
            quickFilters={quickFilters}
            onToggle={toggleFilter}
            onToggleQuick={toggleQuickFilter}
            onClear={clearFilters}
            loading={loading}
            className="h-full border-none rounded-none shadow-none text-left"
          />
        </div>

        {/* Right Content Area - Spans Remaining Width */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-transparent">
          
          {/* Header Panel — overflow-visible + high z-index so dropdown floats above results */}
          <div className="shrink-0 border-b border-white/5 bg-[rgba(6,11,24,0.9)] backdrop-blur-xl px-4 sm:px-6 lg:px-10 py-5 w-full overflow-visible z-[60] relative">
            <div className="max-w-[1000px] relative">
              <SearchBar onSearch={handleSearch} defaultValue={query} compact centered={false} />
            </div>
          </div>

          <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
            
            {/* Results Column (Desktop + Mobile) */}
            <div className="flex-1 flex flex-col min-w-0">
              
              {/* Desktop Scroll Pane */}
              <div ref={desktopResultsRef} className="hidden lg:block flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 lg:px-10 pt-8 pb-20">
                <div className="max-w-[1000px]">
                  <Motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between mb-8"
                  >
                    <div>
                      {/* Desktop Breadcrumbs */}
                      <nav aria-label="Breadcrumb" className="mb-3">
                        <ol className="flex items-center gap-2 text-[13px] text-slate-500 font-medium">
                          <li>
                            <Link to="/" className="hover:text-indigo-300 transition-colors duration-200">Home</Link>
                          </li>
                          <li><span className="text-white/20 select-none">/</span></li>
                          <li>
                            <span className="text-slate-400 select-none">Results</span>
                          </li>
                          {query && (
                            <>
                              <li><span className="text-white/20 select-none">/</span></li>
                              <li>
                                <span className="text-indigo-200/80 truncate max-w-[200px] inline-block align-bottom">{`"${query}"`}</span>
                              </li>
                            </>
                          )}
                        </ol>
                      </nav>

                      <h2 className="text-2xl lg:text-[26px] font-semibold text-white tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                        Results for <span className="gradient-text tracking-normal">"{query || "All Concepts"}"</span>
                      </h2>
                      <p className="text-[13px] text-slate-500 mt-2 font-mono-custom tracking-wide">
                        {total} results | page {displayedPage} of {totalPages}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold mr-1">Sort by:</span>
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => handleSortChange(option.key)}
                          className={`text-xs px-3.5 py-2 rounded-xl transition-all duration-200 capitalize font-medium ${
                            sortBy === option.key
                              ? "bg-indigo-500/15 text-indigo-200 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]"
                              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                      <div className="w-px h-5 bg-white/10 mx-1" />
                      <button
                        type="button"
                        onClick={toggleSemantic}
                        className={`text-xs px-3.5 py-2 rounded-xl transition-all duration-200 font-medium ${
                          semantic
                            ? "bg-sky-500/15 text-sky-200 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.25)]"
                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                        }`}
                      >
                        Semantic {semantic ? "On" : "Off"}
                      </button>
                    </div>
                  </Motion.div>

                  {error && (
                    <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-[14px] text-red-200 shadow-sm">
                      {error}
                    </div>
                  )}

                  {!error && <DidYouMeanBanner suggestion={didYouMean} onSelect={handleSearch} />}

                  <ActiveFilterSummary
                    filters={filters}
                    quickFilters={quickFilters}
                    onRemove={toggleFilter}
                    onToggleQuick={toggleQuickFilter}
                    onClear={clearFilters}
                    total={total}
                    page={displayedPage}
                    totalPages={totalPages}
                  />

                  {loading ? (
                    <LoadingState />
                  ) : results.length > 0 ? (
                    <AnimatePresence mode="wait">
                      <Motion.div
                        key={`${query}-${sortBy}-${page}-${semantic ? "semantic" : "keyword"}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-5"
                      >
                        {results.map((item, index) => (
                          <ResultCard
                            key={item.id || item.title}
                            item={item}
                            query={query}
                            index={(displayedPage - 1) * PAGE_SIZE + index}
                            onTagClick={handleTagClick}
                          />
                        ))}
                      </Motion.div>
                    </AnimatePresence>
                  ) : (
                    <EmptyState hasQuery={Boolean(query)} onClear={clearFilters} />
                  )}

                  {!loading && results.length > 0 && (
                    <Pagination currentPage={displayedPage} totalPages={totalPages} onPageChange={handlePageChange} />
                  )}
                </div>
              </div>

              {/* Mobile Scroll Pane */}
              <div ref={mobileResultsRef} className="lg:hidden flex-1 overflow-y-auto px-4 pt-6 pb-20 custom-scrollbar">
                <Motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-5 mb-8"
                >
                  <div>
                    <h2 className="text-2xl font-semibold text-white tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                      Results for <span className="gradient-text tracking-normal">"{query || "All Concepts"}"</span>
                    </h2>
                    <p className="text-[13px] text-slate-500 mt-2 font-mono-custom tracking-wide">
                      {total} results | page {displayedPage} of {totalPages}
                    </p>
                    <button
                      onClick={() => setMobileFiltersOpen(true)}
                      className="w-full mt-4 px-5 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-[14px] font-medium text-slate-200 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                      </svg>
                      Filters & Refine
                    </button>
                  </div>
                </Motion.div>

                {error && <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/8 px-4 py-3 text-sm text-red-200">{error}</div>}
                {!error && <DidYouMeanBanner suggestion={didYouMean} onSelect={handleSearch} />}

                <ActiveFilterSummary
                  filters={filters}
                  quickFilters={quickFilters}
                  onRemove={toggleFilter}
                  onToggleQuick={toggleQuickFilter}
                  onClear={clearFilters}
                  total={total}
                  page={displayedPage}
                  totalPages={totalPages}
                />

                {loading ? (
                  <LoadingState />
                ) : results.length > 0 ? (
                  <AnimatePresence mode="wait">
                    <Motion.div
                      key={`${query}-${sortBy}-${page}-${semantic ? 'semantic' : 'keyword'}-mobile`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      {results.map((item, index) => (
                        <ResultCard
                          key={item.id || item.title}
                          item={item}
                          query={query}
                          index={(displayedPage - 1) * PAGE_SIZE + index}
                          onTagClick={handleTagClick}
                        />
                      ))}
                    </Motion.div>
                  </AnimatePresence>
                ) : (
                  <EmptyState hasQuery={Boolean(query)} onClear={clearFilters} />
                )}

                {!loading && results.length > 0 && (
                  <Pagination currentPage={displayedPage} totalPages={totalPages} onPageChange={handlePageChange} />
                )}
              </div>
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
