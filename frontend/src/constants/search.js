export const PAGE_SIZE = 10;

export const SEARCH_FILTER_KEYS = ["chapter", "topic", "difficulty", "concept_type", "tags"];

export const FILTER_LABELS = {
  chapter: "Chapter",
  topic: "Topics",
  difficulty: "Difficulty",
  concept_type: "Concept Type",
  tags: "Tags",
};

export const EMPTY_FACETS = {
  chapters: [],
  topics: [],
  difficulties: [],
  concept_types: [],
  tags: [],
};

export const QUICK_FILTER_OPTIONS = [
  {
    key: "important",
    label: "Important",
    description: "Core definitions and theory-heavy sections.",
  },
  {
    key: "trending",
    label: "Trending",
    description: "Modern transformer, pretrained-model, and retrieval topics.",
  },
  {
    key: "frequent",
    label: "Frequent",
    description: "Recurring core ideas across the textbook corpus.",
  },
];

export const QUICK_FILTER_LABELS = Object.fromEntries(
  QUICK_FILTER_OPTIONS.map((option) => [option.key, option.label])
);

export const SORT_OPTIONS = [
  { key: "relevance", label: "relevance" },
  { key: "alphabetical", label: "alphabetical" },
];

export function createEmptyFilters() {
  return {
    chapter: [],
    topic: [],
    difficulty: [],
    concept_type: [],
    tags: [],
  };
}

export function sanitizeList(values = []) {
  const seen = new Set();
  return values
    .map((value) => `${value ?? ""}`.trim())
    .filter((value) => {
      const normalized = value.toLowerCase();
      if (!value || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}

export function sanitizeQuickFilters(values = []) {
  const allowed = new Set(QUICK_FILTER_OPTIONS.map((option) => option.key));
  return sanitizeList(values).filter((value) => allowed.has(value));
}
