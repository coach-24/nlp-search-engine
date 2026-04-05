import { motion as Motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import Tag from "./Tag";

function highlightText(text = "", query) {
  if (!query || query.trim() === "") return text;

  try {
    const normalizedQuery = query.trim();
    const regex = new RegExp(`(${normalizedQuery})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === normalizedQuery.toLowerCase() ? (
        <mark key={i} className="keyword-highlight" style={{ background: "none" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

export default function ResultCard({ item, query, index = 0 }) {
  const navigate = useNavigate();
  const location = useLocation();
  const detailId = item?.id ?? item?._id ?? item?.doc_id;
  const snippetHtml = item?.snippet ?? "";

  const handleView = () => {
    if (detailId) {
      navigate(`/document/${encodeURIComponent(detailId)}`, {
        state: { from: `${location.pathname}${location.search}` },
      });
    }
  };

  return (
    <Motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -6, scale: 1.005 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card rounded-2xl p-6 card-hover group relative overflow-hidden mb-4"
      style={{
        boxShadow:
          "0 18px 40px rgba(3, 7, 18, 0.42), 0 0 0 1px rgba(255,255,255,0.04) inset",
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(129,140,248,0.16), transparent 38%), radial-gradient(circle at bottom left, rgba(56,189,248,0.08), transparent 34%)",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono-custom text-slate-600 select-none">
          #{String(index + 1).padStart(2, "0")}
        </span>
        <div className="flex gap-1.5">
          {item?.concept_type && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono-custom"
              style={{
                background: "rgba(99,102,241,0.12)",
                color: "#c7d2fe",
                border: "1px solid rgba(99,102,241,0.18)",
              }}
            >
              {item.concept_type}
            </span>
          )}
          {item?.difficulty && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-mono-custom"
              style={{
                background:
                  item.difficulty === "Advanced"
                    ? "rgba(239,68,68,0.12)"
                    : item.difficulty === "Intermediate"
                      ? "rgba(245,158,11,0.12)"
                      : "rgba(34,197,94,0.12)",
                color:
                  item.difficulty === "Advanced"
                    ? "#fca5a5"
                    : item.difficulty === "Intermediate"
                      ? "#fcd34d"
                      : "#86efac",
                border: `1px solid ${
                  item.difficulty === "Advanced"
                    ? "rgba(239,68,68,0.2)"
                    : item.difficulty === "Intermediate"
                      ? "rgba(245,158,11,0.2)"
                      : "rgba(34,197,94,0.2)"
                }`,
              }}
            >
              {item.difficulty}
            </span>
          )}
        </div>
      </div>

      <h3
        className="text-lg font-semibold text-white mb-2 leading-snug"
        style={{ fontFamily: "Sora, sans-serif" }}
      >
        <span className="group-hover:bg-gradient-to-r group-hover:from-indigo-300 group-hover:to-violet-300 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
          {highlightText(item?.title ?? "", query)}
        </span>
      </h3>

      <div
        className="result-snippet overflow-hidden text-slate-400 text-sm leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: snippetHtml }}
      />

      <div className="flex gap-2 flex-wrap mb-5">
        {(item?.tags ?? []).map((tag, i) => (
          <Tag key={i} label={tag} />
        ))}
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
        <Motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleView}
          disabled={!detailId}
          className="btn-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          View
        </Motion.button>

        <Motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="text-sm px-4 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Explain
        </Motion.button>

        <div className="flex-1" />

        <span className="text-xs text-slate-600 font-mono-custom">
          {typeof item?.score === "number" ? `${item.score.toFixed(2)} score` : ""}
        </span>
      </div>
    </Motion.div>
  );
}
