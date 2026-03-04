"""
Enterprise Policy Assistant – Flask Backend
Serves the frontend and exposes /upload and /chat API endpoints.
"""

import os
import uuid
import tempfile

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

from rag_engine import RAGEngine

load_dotenv()

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB limit

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}

# ------------------------------------------------------------------ #
#  Session-scoped RAG engines (in-memory)
# ------------------------------------------------------------------ #
sessions: dict[str, RAGEngine] = {}


def get_or_create_session(session_id: str | None) -> tuple[str, RAGEngine]:
    """Return existing engine or create a new session."""
    if session_id and session_id in sessions:
        return session_id, sessions[session_id]
    new_id = str(uuid.uuid4())
    sessions[new_id] = RAGEngine()
    return new_id, sessions[new_id]


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ------------------------------------------------------------------ #
#  Routes
# ------------------------------------------------------------------ #

@app.route("/")
def index():
    return send_from_directory("static", "index.html")


@app.route("/upload", methods=["POST"])
def upload():
    session_id = request.form.get("session_id")
    session_id, engine = get_or_create_session(session_id)

    if "files" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files selected"}), 400

    processed_files = []
    temp_dir = tempfile.mkdtemp()

    for f in files:
        if f and f.filename and allowed_file(f.filename):
            filename = secure_filename(f.filename)
            ext = "." + filename.rsplit(".", 1)[1].lower()
            file_path = os.path.join(temp_dir, filename)
            f.save(file_path)
            processed_files.append((file_path, f.filename, ext))

    if not processed_files:
        return jsonify({"error": "No valid files. Supported: PDF, TXT, DOCX"}), 400

    result = engine.process_documents(processed_files)

    # Clean up temp files
    for file_path, _, _ in processed_files:
        try:
            os.remove(file_path)
        except OSError:
            pass
    try:
        os.rmdir(temp_dir)
    except OSError:
        pass

    result["session_id"] = session_id
    return jsonify(result)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    if not data or "query" not in data:
        return jsonify({"error": "Missing 'query' in request body"}), 400

    session_id = data.get("session_id")
    if not session_id or session_id not in sessions:
        return jsonify({
            "answer": "Please upload documents first before asking questions.",
            "sources": [],
        })

    engine = sessions[session_id]
    result = engine.query(data["query"])
    result["session_id"] = session_id
    return jsonify(result)


@app.route("/session/info", methods=["GET"])
def session_info():
    session_id = request.args.get("session_id")
    if not session_id or session_id not in sessions:
        return jsonify({"documents": [], "ready": False})
    engine = sessions[session_id]
    return jsonify({
        "documents": engine.documents_loaded,
        "ready": engine.vectorstore is not None,
    })


if __name__ == "__main__":
    print("=" * 60)
    print("  Enterprise Policy Assistant")
    print("  Open http://localhost:5000 in your browser")
    print("=" * 60)
    app.run(debug=True, host="0.0.0.0", port=5000)
