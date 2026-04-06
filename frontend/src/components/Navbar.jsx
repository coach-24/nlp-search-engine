import { FaGithub } from "react-icons/fa";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";

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
  const location = useLocation();
  const isResultsPage = location.pathname.startsWith("/results") || location.pathname.startsWith("/document") || location.pathname.startsWith("/detail");

  return (
    <Motion.nav
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="fixed top-0 inset-x-0 z-[100] h-[76px] border-b border-white/5 bg-[rgba(8,12,26,0.86)] backdrop-blur-xl"
    >
      <div className="max-w-[1400px] h-full mx-auto px-6 flex items-center justify-between gap-4 w-full">
        <Link
          to="/"
          aria-label="Go to home"
          className="flex items-center gap-3 text-left group min-w-0 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded-xl rounded-l-2xl p-1 -ml-1 pr-3"
        >
          <LogoGlyph />
          <div className="min-w-0 hidden sm:block">
            <div className="font-semibold text-xl tracking-tight transition-colors duration-200" style={{ fontFamily: "Sora, sans-serif" }}>
              <span className="gradient-text group-hover:brightness-125 transition-all duration-200">NLP</span>
              <span className="text-slate-100 ml-1 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all duration-200">Search</span>
            </div>
            <div className="text-xs text-slate-500 truncate group-hover:text-indigo-200/70 transition-colors duration-200">
              Premium semantic exploration
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {isResultsPage && (
              <Motion.div 
                initial={{ opacity: 0, scale: 0.95, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: 10 }}
                transition={{ duration: 0.2 }}
                className="hidden sm:block"
              >
                <Link
                  to="/"
                  className="flex items-center gap-2 px-3 py-1.5 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-slate-300 hover:text-white transition-all duration-200 border border-white/5 hover:border-white/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Home
                </Link>
              </Motion.div>
            )}
          </AnimatePresence>
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
