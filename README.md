# NLP Search Engine

A state-of-the-art, full-stack Natural Language Processing (NLP) search engine platform. Built for powerful full-text and semantic document retrieval with deep AI integrations for explainability and insights.

## 🚀 Features

- **Blazing Fast Search**: Powered by **Elasticsearch**, enabling complex boolean queries, fuzzy matching, and robust full-text search capabilities.
- **Semantic Search**: Integrated with `sentence-transformers` (`all-MiniLM-L6-v2`) to find meaning and intent behind queries, not just keyword matches.
- **Generative AI Insights**: Deep LLM integration (supports **Ollama, OpenAI, Gemini**) to generate contextual insights, summarize results, and explain document matches.
- **PDF Data Pipeline**: Built-in Python scripts to automatically parse, chunk, and securely ingest complex PDF textbooks or documents into Elasticsearch.
- **Modern UI/UX**: A highly responsive, animated frontend built using **React 19**, **Vite**, **Tailwind CSS**, and **Framer Motion**. 
- **Robust API Backend**: High-performance **FastAPI** backend with asynchronous routes and scalable architecture.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: React Icons
- **Routing**: React Router DOM v7

### Backend
- **Framework**: Python 3.9+ & FastAPI
- **Search Engine**: Elasticsearch 9.3.x (with 8.x Python Client)
- **Machine Learning**: SentenceTransformers 
- **LLM Integration**: HTTPX-based asynchronous clients for Ollama, OpenAI, and Google Gemini
- **Data Validation**: Pydantic

---

## 📂 Project Structure

```text
nlp-search-engine/
├── backend/
│   ├── build_dataset.py     # Script to parse and extract chunks from PDFs
│   ├── ingest.py            # Pipelines to setup Elasticsearch indices & load data
│   ├── main.py              # FastAPI application entry point
│   ├── data/                # Processed JSON output files
│   ├── models/              # Pydantic schema models
│   ├── routers/             # API route definitions
│   ├── services/            # Core business logic (LLM, Elastic search, NLP)
│   └── utils/               # Helper utilities
└── frontend/
    ├── src/
    │   ├── components/      # Reusable React components (Search bars, Result Cards, AI Modals)
    │   ├── hooks/           # Custom React hooks (e.g., useExplain)
    │   ├── pages/           # Route pages (Home, Results)
    │   └── App.jsx          # Root component
    ├── package.json         # Node.js dependencies
    └── tailwind.config.js   # Tailwind rules & theming
```

---

## ⚙️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+)
- [Python](https://www.python.org/) 3.9+
- Elasticsearch Cluster (Local or Cloud)
- *(Optional)* [Ollama](https://ollama.ai/) installed locally for local LLM features.

---

### 1. Backend Setup

1. **Navigate to backend and setup Virtual Environment:**
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   # source venv/bin/activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   ```bash
   copy .env.example .env
   ```
   *Edit `.env` and configure your Elasticsearch credentials, URL, and preferred LLM provider (`ollama` | `openai` | `gemini`).*

4. **Data Ingestion (Optional/First-Time Setup):**
   If you have a customized `ed3book.pdf` or similar text dump, parse and index it:
   ```bash
   # Parse PDF into chunked JSON components
   python build_dataset.py
   # Push chunks into Elasticsearch index
   python ingest.py --force
   ```

5. **Start the FastAPI Server:**
   ```bash
   uvicorn main:app --reload
   # The API will be available at http://localhost:8000
   ```

---

### 2. Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install node modules:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   copy .env.example .env
   ```
   *Make sure `VITE_API_URL` points to your active backend (e.g. `http://localhost:8000/api`).*

4. **Run the Development Server:**
   ```bash
   npm run dev
   # Access the Web App at http://localhost:5173
   ```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `ES_HOST` | Elasticsearch Cluster URL | `http://localhost:9200` |
| `ES_INDEX` | The Target ES Index | `nlp_textbook` |
| `ES_USERNAME` | ES Basic Auth Username | |
| `ES_PASSWORD` | ES Basic Auth Password | |
| `ENABLE_SEMANTIC_SEARCH` | Toggle Vector/Semantic Mode | `false` |
| `SEMANTIC_MODEL` | HuggingFace ST Model | `all-MiniLM-L6-v2` |
| `LLM_PROVIDER` | `ollama`, `openai`, or `gemini` | `ollama` |
| `LLM_MODEL` | Provider specific model | e.g., `llama3`, `gpt-4o-mini` |

*Add API Keys for OpenAI (`OPENAI_API_KEY`) or Gemini (`GEMINI_API_KEY`) based on your active `LLM_PROVIDER`.*

### Frontend (`frontend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base API Endpoint for FastAPI | `http://localhost:8000/api` |

---

## ⚠️ Important Deployment Notes
- **DO NOT** commit your `.env` files to version control.
- Ensure `backend/venv/` and `frontend/node_modules/` are included in your `.gitignore` files.
- In production, set your environment secrets via your hosting provider's configuration panel (e.g., Vercel, Render, AWS, Heroku).
- Verify CORS settings in `backend/main.py` if deploying the frontend and backend on different public domains.
