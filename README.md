# NLP Search Engine

A full-stack NLP search experience built with:

- `frontend`: React + Vite + Tailwind CSS + Framer Motion
- `backend`: FastAPI
- `search`: Elasticsearch

## Project Structure

```text
nlp-search-engine/
  backend/
  frontend/
```

## Local Setup

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload
```

### 2. Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Environment Variables

### Backend

Use `backend/.env`:

```env
ES_HOST=http://localhost:9200
ES_INDEX=nlp_textbook
ES_USERNAME=
ES_PASSWORD=
ES_VERIFY_CERTS=true
FRONTEND_URL=http://localhost:5173
ENABLE_SEMANTIC_SEARCH=false
SEMANTIC_MODEL=all-MiniLM-L6-v2
```

### Frontend

Use `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
```

## Deployment Notes

- Do not commit `.env` files.
- Do not commit `backend/venv/`, `__pycache__/`, or local PDFs.
- Set deployment secrets through your hosting provider environment settings.
- Point the frontend `VITE_API_URL` to your deployed FastAPI backend.
- Point the backend Elasticsearch settings to your deployed Elasticsearch cluster.

## Indexing Data

If you need to recreate the Elasticsearch index:

```bash
cd backend
venv\Scripts\activate
python ingest.py --force
```
