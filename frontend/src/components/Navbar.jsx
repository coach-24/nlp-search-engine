import { FaGithub } from "react-icons/fa";
import { motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function LogoGlyph() {
  return (
    <div className="relative">
      <div className="absolute inset-0 rounded-2xl blur-xl bg-indigo-500/35" />
      <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center border border-white/10 bg-[linear-gradient(135deg,rgba(129,140,248,0.95),rgba(59,130,246,0.8))] shadow-[0_10px_30px_rgba(79,70,229,0.35)]">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M6 9.5a2.5 2.5 0 115 0V12a2.5 2.5 0 11-5 0V9.5zm7-2a2.5 2.5 0 115 0V14a2.5 2.5 0 11-5 0V7.5zM8.5 12h6M11 8.5l2 1.5m-2 5 2-1.5" />
        </svg>
      </div>
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <Motion.nav
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-50 border-b border-white/6 bg-[rgba(8,12,26,0.86)] backdrop-blur-2xl"
    >
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 text-left group min-w-0 transition-transform duration-200 hover:scale-[1.01]"
        >
          <LogoGlyph />
          <div className="min-w-0">
            <div className="font-semibold text-xl tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
              <span className="gradient-text">NLP</span>
              <span className="text-slate-100 ml-1 group-hover:text-white transition-colors">Search</span>
            </div>
            <div className="text-xs text-slate-500 truncate group-hover:text-slate-400 transition-colors">
              Premium semantic exploration for language technology
            </div>
          </div>
        </button>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 font-mono-custom hidden md:block">
            Jurafsky & Manning
          </span>
          <div className="hidden md:block w-px h-4 bg-white/10" />
          <Motion.a
            href="https://github.com/coach-24/nlp-search-engine"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.08, y: -1 }}
            whileTap={{ scale: 0.96 }}
            className="text-slate-400 hover:text-white transition-colors duration-200 text-xl flex items-center justify-center w-10 h-10 rounded-full border border-white/8 bg-white/[0.03]"
          >
            <FaGithub />
          </Motion.a>
        </div>
      </div>
    </Motion.nav>
  );
}
