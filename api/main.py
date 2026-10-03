"""
WAT Analyzer - Python AI Microservice.
Dedicated inference service hosting DistilBERT, RoBERTa, Sentence-BERT,
and Google Gemini rewrite coaching for the MERN stack.
"""

import logging
import threading
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
ROOT_DIR = CURRENT_DIR.parent
for p in (str(CURRENT_DIR), str(ROOT_DIR)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from .services.ai_pipeline import (
        load_models, compute_token_highlights,
        analyze_single_response, compute_session_averages
    )
    from .trait_mapper import map_traits_to_domain, generate_trait_explanation
    from .routers import rewrite
except (ImportError, ValueError):
    from services.ai_pipeline import (
        load_models, compute_token_highlights,
        analyze_single_response, compute_session_averages
    )
    from trait_mapper import map_traits_to_domain, generate_trait_explanation
    from routers import rewrite

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ─── App Lifespan ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing WAT Analyzer AI Microservice...")
    # Load ML models in background thread
    logger.info("Loading ML models in background thread...")
    t = threading.Thread(target=load_models, daemon=True)
    t.start()
    
    yield
    logger.info("Shutting down WAT Analyzer AI Microservice...")

# ─── FastAPI App ────────────────────────────────────────────────────

app = FastAPI(
    title="WAT Analyzer AI Microservice",
    description="Dedicated Transformer NLP Inference Engine for MERN",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Exception Handling ─────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"AI Service Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "AI pipeline error occurred."},
    )

# ─── Include AI Routers ─────────────────────────────────────────────
app.include_router(rewrite.router)

# ─── AI Microservice Endpoints ──────────────────────────────────────

@app.post("/ai/analyze")
def ai_analyze_session(payload: dict):
    """
    Dedicated AI microservice endpoint for MERN architecture.
    Receives candidate sentences from Node.js/Express,
    executes DistilBERT, RoBERTa, Sentence-BERT & token perturbation,
    and returns psychological trait vectors & domain assessments.
    """
    module = payload.get("module", "ssb")
    responses_data = payload.get("responses", [])

    analyzed_responses = []
    trait_scores_list = []

    for i, resp in enumerate(responses_data):
        user_text = resp.get("user_text", "")
        prompt_word = resp.get("prompt_word", "")
        wpm = resp.get("wpm")
        filler = resp.get("filler_count")
        composure = resp.get("composure_score")

        analysis = analyze_single_response(user_text, wpm, filler, composure, prompt_word=prompt_word)
        trait_scores = analysis.get("trait_scores", {})
        trait_scores_list.append(trait_scores)

        domain_traits = map_traits_to_domain(trait_scores, module)
        token_highlights = compute_token_highlights(user_text, trait_scores, prompt_word=prompt_word)

        analyzed_responses.append({
            "id": i + 1,
            "prompt_id": resp.get("prompt_id"),
            "prompt_word": resp.get("prompt_word", f"Word #{i+1}"),
            "prompt_themes": resp.get("prompt_themes", []),
            "order_index": resp.get("order_index", i),
            "user_text": user_text,
            "wpm": wpm,
            "filler_count": filler,
            "composure_score": composure,
            "sentiment_scores": analysis.get("sentiment_scores"),
            "emotion_scores": analysis.get("emotion_scores"),
            "trait_scores": trait_scores,
            "domain_traits": domain_traits,
            "token_highlights": token_highlights,
            "features": analysis.get("features"),
        })

    overall_scores = compute_session_averages(trait_scores_list)
    overall_domain = map_traits_to_domain(overall_scores, module)
    explanations = []
    for trait_key, score in overall_scores.items():
        explanations.append({
            "trait": trait_key,
            "explanation": generate_trait_explanation(trait_key, score, module)
        })

    return {
        "overall_scores": overall_scores,
        "overall_domain_traits": overall_domain,
        "explanations": explanations,
        "responses": analyzed_responses,
        "response_count": len(analyzed_responses)
    }

@app.post("/ai/highlights")
def ai_token_highlights(payload: dict):
    user_text = payload.get("user_text", "")
    prompt_word = payload.get("prompt_word", "")
    trait_scores = payload.get("trait_scores", {})
    highlights = compute_token_highlights(user_text, trait_scores, prompt_word=prompt_word)
    return {"token_highlights": highlights}

@app.get("/api/health")
@app.get("/health")
def health():
    try:
        from services.ai_pipeline import _models_loaded
    except (ImportError, ValueError):
        from .services.ai_pipeline import _models_loaded
    return {
        "status": "ok",
        "service": "Python AI Microservice",
        "models_loaded": _models_loaded,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/", response_class=HTMLResponse)
def root():
    return """
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>WAT Analyzer - Python AI Microservice</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #020617; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: rgba(255,255,255,0.05); padding: 2.5rem; border-radius: 1.25rem; max-width: 520px; text-align: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .icon { font-size: 3rem; margin-bottom: 1rem; }
          h1 { color: #38bdf8; margin: 0 0 0.75rem 0; font-size: 1.75rem; }
          p { color: #94a3b8; font-size: 1rem; line-height: 1.6; margin: 0.5rem 0; }
          .badge { display: inline-block; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; border: 1px solid rgba(56, 189, 248, 0.3); margin-bottom: 1rem; }
          .btn { display: inline-block; background: linear-gradient(135deg, #0284c7, #7c3aed); color: white; padding: 0.85rem 1.75rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; margin-top: 1.25rem; transition: opacity 0.2s; }
          .btn:hover { opacity: 0.9; }
          .links { margin-top: 1.5rem; font-size: 0.9rem; color: #64748b; }
          .links a { color: #a78bfa; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">🤖</div>
          <div class="badge">AI Microservice Tier</div>
          <h1>Python Inference Engine Running</h1>
          <p>This service powers <strong>DistilBERT</strong>, <strong>RoBERTa</strong>, and <strong>Sentence-BERT</strong> for the MERN architecture.</p>
          <p><a class="btn" href="http://localhost:3000">Open MERN App (localhost:3000)</a></p>
          <div class="links">
            Interactive AI Docs: <a href="/docs">/docs (Swagger UI)</a>
          </div>
        </div>
      </body>
    </html>
    """
