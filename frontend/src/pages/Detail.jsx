import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import Navbar from "../components/Navbar";
import Tag from "../components/Tag";
import { getDocument } from "../services/api";

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [item, setItem] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDocument() {
      try {
        setError("");
        const data = await getDocument(id);
        if (!cancelled) {
          setItem(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load document.");
        }
      }
    }

    if (id) {
      loadDocument();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleBack = () => {
    const previousResults = location.state?.from;
    if (previousResults) {
      navigate(previousResults);
      return;
    }
    navigate("/results");
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #060b18 0%, #0a1128 50%, #060b18 100%)" }}
    >
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-6 pt-28 pb-10">
        <Motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -2, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:border-indigo-400/25 hover:bg-indigo-500/10 transition-all mb-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to results
        </Motion.button>

        <Motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-[2rem] p-8 lg:p-10 max-w-5xl mx-auto"
        >
          {!item && !error && (
            <div className="text-slate-400 text-sm">Loading document...</div>
          )}

          {error && (
            <div className="text-red-300 text-sm">{error}</div>
          )}

          {item && (
            <>
              <p className="text-xs font-mono-custom text-indigo-400 mb-3 uppercase tracking-widest">
                {item.chapter}
              </p>

              <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "Sora, sans-serif" }}>
                {item.title}
              </h1>

              <div className="flex gap-2 flex-wrap mb-6">
                {(item.tags ?? []).map((tag, i) => (
                  <Tag key={i} label={tag} />
                ))}
                {item.difficulty && (
                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-mono-custom"
                    style={{
                      background: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.2)",
                      color: "#fcd34d",
                    }}
                  >
                    {item.difficulty}
                  </span>
                )}
              </div>

              <div className="h-px bg-white/5 mb-6" />

              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {item.fullText ?? item.content ?? item.snippet ?? "No content available."}
              </div>
            </>
          )}
        </Motion.div>
      </div>
    </div>
  );
}
