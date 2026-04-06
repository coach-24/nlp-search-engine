// hooks/useExplain.js
// Fetches an LLM explanation for a result.
// Results are memoized per (query + text) to avoid repeat calls.

import { useCallback, useRef, useState } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const _cache = new Map(); // query+hash → explanation string

function cacheKey(query, text) {
  return `${query.trim().toLowerCase()}|||${text.trim().slice(0, 200)}`;
}

/**
 * @returns {{ explain: Function, explanation: string|null, loading: boolean, error: string|null, reset: Function }}
 */
export function useExplain() {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const explain = useCallback(async (query, text) => {
    const key = cacheKey(query, text);

    if (_cache.has(key)) {
      setExplanation(_cache.get(key));
      setError(null);
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const res = await fetch(`${BASE_URL}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const result = data.explanation || "No explanation returned.";
      _cache.set(key, result);
      setExplanation(result);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err.message || "Failed to get explanation.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setExplanation(null);
    setError(null);
    setLoading(false);
  }, []);

  return { explain, explanation, loading, error, reset };
}
