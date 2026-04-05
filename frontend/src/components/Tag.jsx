import { motion } from "framer-motion";

const TAG_COLORS = {
  "NLP": { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.3)", text: "#a5b4fc" },
  "Sequence": { bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.3)", text: "#c4b5fd" },
  "Language Model": { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)", text: "#93c5fd" },
  "Deep Learning": { bg: "rgba(236,72,153,0.15)", border: "rgba(236,72,153,0.3)", text: "#f9a8d4" },
  "Syntax": { bg: "rgba(20,184,166,0.15)", border: "rgba(20,184,166,0.3)", text: "#5eead4" },
  "Parsing": { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)", text: "#fcd34d" },
  "default": { bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)", text: "#a5b4fc" },
};

export default function Tag({ label, onClick }) {
  const colors = TAG_COLORS[label] || TAG_COLORS["default"];

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="tag-pill inline-flex items-center px-3 py-1 rounded-full cursor-pointer transition-all duration-200"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
      }}
    >
      {label}
    </motion.span>
  );
}
