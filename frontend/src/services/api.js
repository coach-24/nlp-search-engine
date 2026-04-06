// @ts-check

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

/**
 * @template T
 * @param {string} endpoint
 * @param {Record<string, unknown> & { signal?: AbortSignal | null }} [params]
 * @returns {Promise<T>}
 */
async function apiFetch(endpoint, params = {}) {
  const { signal = null, ...queryParams } = params;
  const url = new URL(`${BASE_URL}${endpoint}`);

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== null && entry !== undefined && entry !== "") {
          url.searchParams.append(key, `${entry}`);
        }
      });
      return;
    }

    url.searchParams.set(key, `${value}`);
  });

  let response;

  try {
    response = await fetch(url.toString(), {
      signal,
      headers: {
        Accept: "application/json",
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    throw new Error("Failed to fetch. Check that the API server is running.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function searchDocuments(q, options = {}) {
  const {
    chapter = [],
    topic = [],
    difficulty = [],
    concept_type = [],
    tags = [],
    quick_filter = [],
    size = 10,
    page = 1,
    semantic = false,
    sort = "relevance",
    signal = null,
  } = options;

  return apiFetch("/search", {
    q,
    chapter,
    topic,
    difficulty,
    concept_type,
    tags,
    quick_filter,
    size,
    page,
    semantic,
    sort,
    signal,
  });
}

export async function getSuggestions(q, size = 6, options = {}) {
  if (!q || q.trim().length < 2) return { query: q, suggestions: [] };
  return apiFetch("/suggest", { q, size, signal: options.signal ?? null });
}

export async function getDocument(id, options = {}) {
  return apiFetch(`/document/${encodeURIComponent(id)}`, { signal: options.signal ?? null });
}

export async function getFilters(options = {}) {
  const {
    q = "",
    chapter = [],
    topic = [],
    difficulty = [],
    concept_type = [],
    tags = [],
    quick_filter = [],
    signal = null,
  } = options;

  return apiFetch("/filters", {
    q,
    chapter,
    topic,
    difficulty,
    concept_type,
    tags,
    quick_filter,
    signal,
  });
}

export async function checkHealth(options = {}) {
  return apiFetch("/health", { signal: options.signal ?? null });
}
