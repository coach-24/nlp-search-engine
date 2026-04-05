const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          if (v !== null && v !== undefined && v !== "") {
            url.searchParams.append(key, v);
          }
        });
      } else {
        url.searchParams.set(key, value);
      }
    }
  });

  let response;

  try {
    response = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
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
    size = 10,
    page = 1,
    semantic = false,
  } = options;

  return apiFetch("/search", {
    q,
    chapter,
    topic,
    difficulty,
    concept_type,
    tags,
    size,
    page,
    semantic,
  });
}

export async function getSuggestions(q, size = 6) {
  if (!q || q.trim().length < 2) return { query: q, suggestions: [] };
  return apiFetch("/suggest", { q, size });
}

export async function getDocument(id) {
  return apiFetch(`/document/${encodeURIComponent(id)}`);
}

export async function getFilters(options = {}) {
  const {
    q = "",
    chapter = [],
    topic = [],
    difficulty = [],
    concept_type = [],
    tags = [],
  } = options;

  return apiFetch("/filters", { q, chapter, topic, difficulty, concept_type, tags });
}

export async function checkHealth() {
  return apiFetch("/health");
}
