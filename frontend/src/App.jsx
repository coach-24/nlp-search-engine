import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import Home from "./pages/Home";
import Results from "./pages/Results";
import Detail from "./pages/Detail";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
};

const pageTransition = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1]
};

function PageWrapper({ children }) {
  return (
    <Motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className="w-full h-full min-h-screen"
    >
      {children}
    </Motion.div>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.isComposing) return;

      if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        navigate("/");
      }

      if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/results" element={<PageWrapper><Results /></PageWrapper>} />
        <Route path="/document/:id" element={<PageWrapper><Detail /></PageWrapper>} />
        <Route path="/detail/:id" element={<PageWrapper><Detail /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
