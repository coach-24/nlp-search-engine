import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { getSuggestions } from "../services/api";

export default function SearchBar({ onSearch, defaultValue = "", compact = false }) {
  const [query, setQuery] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [hasEdited, setHasEdited] = useState(false);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleSuggestions = suggestions.filter(
    (suggestion) => suggestion.trim().toLowerCase() !== normalizedQuery
  );
  const shouldRequestSuggestions = focused && query.trim().length >= 2 && (!compact || hasEdited);
  const showSuggestions = focused && (visibleSuggestions.length > 0 || loadingSuggestions);

  useEffect(() => {
    setQuery(defaultValue);
    setSuggestions([]);
    setActiveIndex(-1);
    setHasEdited(false);
    requestIdRef.current += 1;
  }, [defaultValue]);

  useEffect(() => {
    if (!shouldRequestSuggestions) {
      requestIdRef.current += 1;
      setSuggestions([]);
      setActiveIndex(-1);
      setLoadingSuggestions(false);
      return;
    }

    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;
    setLoadingSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const data = await getSuggestions(query, 7);
        if (requestIdRef.current === nextRequestId) {
          setSuggestions(data.suggestions || []);
          setActiveIndex(-1);
        }
      } catch {
        if (requestIdRef.current === nextRequestId) {
          setSuggestions([]);
          setActiveIndex(-1);
        }
      } finally {
        if (requestIdRef.current === nextRequestId) {
          setLoadingSuggestions(false);
        }
      }
    }, 160);

    return () => clearTimeout(timer);
  }, [query, shouldRequestSuggestions]);

  const handleChange = (e) => {
    setHasEdited(true);
    setQuery(e.target.value);
  };

  const handleSubmit = () => {
    if (query.trim()) {
      setSuggestions([]);
      setActiveIndex(-1);
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown" && visibleSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % visibleSuggestions.length);
      return;
    }

    if (e.key === "ArrowUp" && visibleSuggestions.length > 0) {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? visibleSuggestions.length - 1 : prev - 1));
      return;
    }

    if (e.key === "Enter") {
      if (activeIndex >= 0 && visibleSuggestions[activeIndex]) {
        e.preventDefault();
        handleSuggestionClick(visibleSuggestions[activeIndex]);
        return;
      }
      handleSubmit();
    }

    if (e.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setSuggestions([]);
    setActiveIndex(-1);
    onSearch(suggestion);
  };

  return (
    <div className={`relative isolate w-full max-w-2xl mx-auto ${showSuggestions ? "z-[120]" : "z-20"}`}>
      <Motion.div
        animate={focused ? "focused" : "idle"}
        variants={{
          idle: {},
          focused: {},
        }}
        className={`
          relative z-10 flex items-center glass rounded-2xl overflow-visible
          transition-all duration-300
          ${focused ? "search-glow-focus" : "search-glow"}
        `}
      >
        <div className="pl-5 pr-2 flex-shrink-0">
          <svg
            className={`w-5 h-5 transition-colors duration-200 ${focused ? "text-indigo-400" : "text-slate-500"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search NLP concepts, models, algorithms..."
          className={`
            flex-grow bg-transparent outline-none py-4 px-2
            text-slate-200 placeholder-slate-500
            ${compact ? "text-sm" : "text-base"}
          `}
          style={{ fontFamily: "DM Sans, sans-serif" }}
        />

        <AnimatePresence>
          {query && (
            <Motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setActiveIndex(-1);
              }}
              className="mr-2 p-1 rounded-full text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Motion.button>
          )}
        </AnimatePresence>

        <Motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          className="btn-primary text-white px-5 py-2.5 m-1.5 rounded-xl text-sm font-semibold flex-shrink-0"
          style={{ fontFamily: "Sora, sans-serif" }}
        >
          Search
        </Motion.button>
      </Motion.div>

      <AnimatePresence>
        {showSuggestions && (
          <Motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-[140] mt-3 overflow-hidden rounded-2xl border border-white/10 shadow-[0_28px_80px_rgba(2,6,23,0.6)]"
            style={{
              background:
                "linear-gradient(180deg, rgba(12,18,34,0.995) 0%, rgba(8,12,24,0.985) 100%)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
            }}
          >
            <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
              {loadingSuggestions && visibleSuggestions.length === 0 && (
                <div className="px-5 py-4 text-sm text-slate-400">Loading suggestions...</div>
              )}

              {!loadingSuggestions && visibleSuggestions.length === 0 && query.trim().length > 1 && (
                <div className="px-5 py-4 text-sm text-slate-500">No suggestions found</div>
              )}

              {visibleSuggestions.map((suggestion, i) => (
                <Motion.button
                  key={suggestion}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors group ${
                    activeIndex === i ? "bg-indigo-400/12" : "hover:bg-indigo-400/10"
                  }`}
                  title={suggestion}
                >
                  <svg
                    className="w-4 h-4 mt-0.5 text-indigo-400 flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <span className="min-w-0 text-sm text-slate-200 group-hover:text-white transition-colors break-words line-clamp-2">
                    {suggestion}
                  </span>
                </Motion.button>
              ))}
            </div>

            <div className="px-5 py-2.5 border-t border-white/8 flex items-center gap-2 bg-white/[0.02]">
              <span className="text-xs text-slate-500 font-mono-custom">up/down to navigate</span>
              <span className="text-xs text-slate-700">.</span>
              <span className="text-xs text-slate-500 font-mono-custom">enter to search</span>
              <span className="text-xs text-slate-700">.</span>
              <span className="text-xs text-slate-500 font-mono-custom">esc to close</span>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
