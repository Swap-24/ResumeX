"""
Embedding Engine — Lazy singleton using sentence-transformers.
Thread-safe model loading with in-memory JD embedding cache.
"""
from __future__ import annotations
import os
os.environ["HF_HUB_OFFLINE"] = "1"
import threading
import numpy as np

_MODEL = None
_MODEL_LOCK = threading.Lock()
_MODEL_NAME = "all-MiniLM-L6-v2"

def _get_model():
    global _MODEL
    if _MODEL is None:
        with _MODEL_LOCK:
            if _MODEL is None:
                import logging
                import warnings
                # Silence huggingface_hub logger and warning alerts
                logging.getLogger("huggingface_hub").setLevel(logging.ERROR)
                warnings.filterwarnings("ignore", category=UserWarning, module="huggingface_hub")

                from sentence_transformers import SentenceTransformer
                print(f"[EmbeddingEngine] Loading {_MODEL_NAME} ...")
                _MODEL = SentenceTransformer(_MODEL_NAME)
                print("[EmbeddingEngine] Model ready.")
    return _MODEL

def embed(text: str) -> np.ndarray:
    """Embed a single string. Returns normalized float32 vector (384-dim)."""
    if not text or not text.strip():
        return np.zeros(384, dtype=np.float32)
    model = _get_model()
    vec = model.encode(text, normalize_embeddings=True, show_progress_bar=False)
    return np.array(vec, dtype=np.float32)

def embed_batch(texts: list[str]) -> np.ndarray:
    """Embed a list of strings efficiently in one forward pass."""
    model = _get_model()
    vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False, batch_size=32)
    return np.array(vecs, dtype=np.float32)

def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two normalized vectors. Already normalized -> just dot product."""
    if a is None or b is None:
        return 0.0
    return float(np.clip(np.dot(a, b), -1.0, 1.0))

# --- JD Embedding Cache ---
_JD_CACHE: dict[str, dict[str, np.ndarray]] = {}
_JD_LOCK = threading.Lock()

def get_jd_embeddings(job_id: str, title: str, desc: str, reqs: str) -> dict[str, np.ndarray]:
    """
    Returns cached JD embeddings for a given job_id.
    Computes (and caches) on first call. Thread-safe.
    """
    if job_id in _JD_CACHE:
        return _JD_CACHE[job_id]
    with _JD_LOCK:
        if job_id in _JD_CACHE:
            return _JD_CACHE[job_id]
        full_jd = f"{title}\n{desc}\n{reqs}"
        _JD_CACHE[job_id] = {
            "title": embed(title),
            "desc":  embed(desc[:3000]),
            "reqs":  embed(reqs[:3000]),
            "full":  embed(full_jd[:6000]),
        }
        return _JD_CACHE[job_id]

def warmup() -> None:
    """Pre-load the model. Call at server startup to avoid cold-start latency on first upload."""
    _get_model()
