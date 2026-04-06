import { useState, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [currentAction, setCurrentAction] = useState(null);

  // Simple in-memory cache to avoid duplicate calls
  const [cache, setCache] = useState({});

  const runTask = useCallback(async (text, action, force = false) => {
    if (!text || !action) return;

    const cacheKey = `${action}:${text.slice(0, 100)}`;
    if (!force && cache[cacheKey]) {
      setResult(cache[cacheKey]);
      setCurrentAction(action);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentAction(action);

    try {
      const response = await fetch(`${BASE_URL}/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, action, force }),
      });

      if (!response.ok) {
        throw new Error("Unable to generate explanation");
      }

      const data = await response.json();
      setResult(data.output);
      setCache((prev) => ({ ...prev, [cacheKey]: data.output }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  const reset = () => {
    setResult(null);
    setError(null);
    setCurrentAction(null);
  };

  return { runTask, loading, result, error, currentAction, reset };
}
