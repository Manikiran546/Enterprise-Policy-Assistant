# Enterprise Policy Assistant

AI-powered chatbot for querying company policy documents using RAG (Retrieval-Augmented Generation).

## Features
- Upload PDF, DOCX, TXT documents
- Ask questions — get answers grounded in your documents
- Source citations with every answer
- Advanced RAG pipeline: Query Rewrite → Multi-Query → MMR Retrieval → RAG Fusion → Cross-Encoder Reranking

## Tech Stack
- **Backend:** Python, Flask, LangChain, FAISS, Groq (Llama 3.3)
- **Frontend:** HTML, CSS, JavaScript
- **Embeddings:** HuggingFace `all-MiniLM-L6-v2`

## Setup

1. Clone the repo and create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file:
```
GROQ_API_KEY=your_groq_api_key_here
```

4. Run the server:
```bash
python app.py
```

5. Open http://localhost:5000

## Deployment (Render)

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Set environment variable: `GROQ_API_KEY`
5. Deploy!
