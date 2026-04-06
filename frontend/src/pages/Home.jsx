import { motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";

const FEATURED_TAGS = [
  "Transformers",
  "Hidden Markov Models",
  "BERT",
  "N-grams",
  "Viterbi",
  "Parsing",
  "Word2Vec",
  "Attention",
];


const STATS = [
  { label: "Indexed documents", value: "425+" },
  { label: "Search facets", value: "5" },
  { label: "Result types", value: "Definition · Algorithm · Example · Theory" },
];

export default function Home() {
  const navigate = useNavigate();

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/results?q=${encodeURIComponent(query)}&page=1`);
    }
  };

  return (
    <div
      className="h-screen w-screen relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #060b18 0%, #0a1128 40%, #0e1635 70%, #060b18 100%)" }}
    >
      <Navbar />

      <div
        className="orb w-[620px] h-[620px] top-[-220px] left-[-180px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)" }}
      />
      <div
        className="orb w-[520px] h-[520px] top-[120px] right-[-150px]"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.14) 0%, transparent 72%)" }}
      />
      <div
        className="orb w-[400px] h-[400px] bottom-[-40px] left-[32%]"
        style={{ background: "radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 72%)" }}
      />

      <div className="relative z-10 h-full">
        <div className="max-w-[1200px] mx-auto px-6 h-full">
          <section className="h-full flex items-center pt-20">
            <div className="w-full flex flex-col lg:flex-row items-center justify-between gap-12">
              <div className="w-full max-w-lg text-center lg:text-left">
                <Motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="mb-4"
                >
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tag-pill border border-indigo-400/20 bg-indigo-500/10 text-indigo-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
                    Retrieval-grade search over the NLP curriculum
                  </span>
                </Motion.div>

                <Motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.05 }}
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] mb-6"
                  style={{ fontFamily: "Sora, sans-serif" }}
                >
                  <span className="gradient-text">NLP</span>
                  <span className="text-white"> search that feels effortless.</span>
                </Motion.h1>

                <Motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.12 }}
                  className="text-slate-400 text-lg leading-relaxed mb-6"
                >
                  Search definitions, algorithms, examples, and theory across an indexed NLP knowledge base with modern facets, rich suggestions, and premium UX.
                </Motion.p>

                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.18 }}
                  className="w-full max-w-xl mb-6 mx-auto lg:mx-0"
                >
                  <SearchBar onSearch={handleSearch} />
                </Motion.div>

                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.55, delay: 0.28 }}
                  className="flex flex-wrap gap-2 justify-center lg:justify-start"
                >
                  {FEATURED_TAGS.map((tag, i) => (
                    <Motion.button
                      key={tag}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.28 + i * 0.04 }}
                      whileHover={{ y: -2, scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSearch(tag)}
                      className="px-3 py-1.5 rounded-full text-xs tag-pill border border-white/8 bg-white/[0.03] text-slate-300 hover:border-indigo-400/25 hover:bg-indigo-500/10 hover:text-indigo-100 transition-all"
                    >
                      {tag}
                    </Motion.button>
                  ))}
                </Motion.div>
              </div>

              <div className="w-full flex justify-center lg:justify-end">
                <Motion.section
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="w-full max-w-sm rounded-[2rem] border border-white/8 bg-white/[0.05] p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_70px_rgba(2,6,23,0.35)]"
                >
                  <div className="space-y-4">
                    {STATS.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-4">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">{item.label}</div>
                        <div className="text-xl text-white font-semibold">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </Motion.section>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
