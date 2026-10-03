"""
AI Analysis Pipeline for WAT Analyzer.
Loads transformer models (DistilBERT, RoBERTa, Sentence-Transformers) at startup
and provides NLP scoring, trait vector mapping, and perturbation-based token highlights.
Includes resilient lightweight fallback mode and incoherent input/gibberish detection.
"""

import re
import numpy as np
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Global model holders
_sentiment_pipeline = None
_emotion_pipeline = None
_embedding_model = None
_models_loaded = False

# Lexicons for lightweight fallback mode
POSITIVE_WORDS = {
    "achieve", "action", "brave", "calm", "confident", "courage", "decide", "effort",
    "focus", "growth", "guide", "help", "hope", "improve", "inspire", "lead", "learn",
    "opportunity", "overcome", "passion", "peace", "persist", "resolve", "responsible",
    "solution", "solve", "strength", "succeed", "success", "support", "team", "trust",
    "victory", "win", "wisdom", "duty", "dedication", "determination", "resilient"
}

NEGATIVE_WORDS = {
    "afraid", "anger", "anxious", "blame", "broken", "danger", "defeat", "depressed",
    "despair", "difficult", "disaster", "doubt", "fail", "failure", "fear", "grief",
    "hate", "helpless", "hesitate", "hopeless", "hurt", "loss", "pain", "panic",
    "pessimistic", "regret", "sad", "scared", "sorrow", "stuck", "trouble", "weak", "worry",
    "give up", "give_up", "quit", "run away", "coward"
}

COMMON_ENGLISH_WORDS = {
    'a', 'about', 'above', 'act', 'action', 'after', 'again', 'against', 'all', 'always', 'am',
    'an', 'and', 'any', 'are', 'army', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
    'believe', 'best', 'better', 'big', 'brave', 'bring', 'build', 'but', 'by', 'call', 'calm',
    'can', 'care', 'cause', 'change', 'clear', 'come', 'courage', 'day', 'decide', 'decision',
    'defeat', 'determination', 'discipline', 'do', 'does', 'done', 'duty', 'each', 'early',
    'effort', 'empathy', 'end', 'even', 'every', 'face', 'fail', 'failure', 'fear', 'feel',
    'fight', 'find', 'first', 'focus', 'for', 'forward', 'friend', 'friends', 'from', 'get',
    'give', 'goal', 'goals', 'good', 'great', 'grow', 'growth', 'guide', 'hard', 'has', 'have',
    'he', 'help', 'her', 'here', 'him', 'his', 'honest', 'honor', 'hope', 'how', 'i', 'if',
    'improve', 'in', 'initiative', 'inspire', 'into', 'is', 'it', 'its', 'job', 'join', 'joy',
    'just', 'keep', 'kind', 'know', 'lead', 'leader', 'leadership', 'learn', 'life', 'like',
    'listen', 'live', 'long', 'look', 'lose', 'love', 'loyalty', 'make', 'man', 'many', 'matter',
    'may', 'me', 'mean', 'mind', 'mission', 'more', 'most', 'move', 'much', 'must', 'my',
    'myself', 'nation', 'need', 'never', 'new', 'no', 'not', 'now', 'of', 'off', 'often',
    'old', 'on', 'once', 'one', 'only', 'open', 'opportunity', 'or', 'order', 'other', 'our',
    'out', 'over', 'overcome', 'own', 'part', 'patience', 'peace', 'people', 'person', 'positive',
    'power', 'practice', 'problem', 'protect', 'proud', 'purpose', 'reach', 'ready', 'real',
    'reason', 'remain', 'resilience', 'resolve', 'respect', 'responsibility', 'right', 'rise',
    'risk', 'rule', 'run', 'same', 'say', 'see', 'self', 'serve', 'service', 'set', 'shall',
    'she', 'should', 'show', 'side', 'simple', 'skill', 'so', 'solution', 'solve', 'some',
    'speak', 'spirit', 'stand', 'stay', 'step', 'still', 'strength', 'strong', 'student',
    'succeed', 'success', 'support', 'take', 'task', 'team', 'tell', 'test', 'than', 'that',
    'the', 'their', 'them', 'then', 'there', 'these', 'they', 'thing', 'think', 'this', 'those',
    'through', 'time', 'to', 'together', 'too', 'trust', 'truth', 'try', 'turn', 'two', 'under',
    'understand', 'unity', 'up', 'us', 'use', 'very', 'victory', 'view', 'vision', 'vital',
    'want', 'war', 'was', 'way', 'we', 'well', 'were', 'what', 'when', 'where', 'which', 'who',
    'why', 'will', 'win', 'wisdom', 'with', 'word', 'work', 'world', 'would', 'year', 'yes',
    'you', 'young', 'your'
}

VALID_SHORT_WORDS = {
    'a', 'i', 'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it',
    'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we', 'ok'
}

def is_gibberish(text: str, prompt_word: str = "") -> bool:
    """Detect if response is empty, random keystrokes, prompt echoing, or unintelligible."""
    clean = text.strip()
    if not clean or len(clean) < 3:
        return True
    
    # Prompt echoing without association (e.g. prompt is 'Obstacle' and user wrote 'obstacle')
    if prompt_word:
        clean_prompt = re.sub(r'[^a-zA-Z]', '', prompt_word.strip().lower())
        clean_text_norm = re.sub(r'[^a-zA-Z]', '', clean.lower())
        if clean_text_norm == clean_prompt:
            return True

    # Punctuation/symbols mashed inside words (e.g. s/ajflk,ns, ds.vns,md)
    punct_count = len(re.findall(r'[/\\,\.;:_\-+=~!@#$%^&*`]', clean))
    if punct_count > 0 and len(clean) < 25 and (punct_count / len(clean)) > 0.12:
        return True

    words = re.findall(r'[a-zA-Z]+', clean.lower())
    if not words:
        return True
    
    total_letters = sum(len(w) for w in words)
    if total_letters < 4:
        return True

    for w in words:
        if re.search(r'(.)\1{2,}', w):  # Repeating characters 3+ (e.g. aaa, kkk)
            return True
        if len(w) >= 4 and re.search(r'[^aeiouy]{4,}', w) and w not in COMMON_ENGLISH_WORDS:  # 4+ consonants
            return True
        if len(w) >= 3 and not re.search(r'[aeiouy]', w):  # No vowel in 3+ chars (e.g. dns, vns, mnd)
            return True
        if len(w) > 3:
            vowels = len(re.findall(r'[aeiouy]', w))
            if (vowels / len(w)) < 0.20 and w not in COMMON_ENGLISH_WORDS:
                return True

    recognized = sum(1 for w in words if w in COMMON_ENGLISH_WORDS or w in VALID_SHORT_WORDS)
    ratio = recognized / len(words)
    return ratio < 0.50

def load_models():
    """Load transformer models in background thread."""
    global _sentiment_pipeline, _emotion_pipeline, _embedding_model, _models_loaded
    
    if _models_loaded:
        return
    
    try:
        from transformers import pipeline
        from sentence_transformers import SentenceTransformer
        try:
            from ..config import settings
        except (ImportError, ValueError):
            from config import settings
        
        logger.info("Loading sentiment model (%s)...", settings.SENTIMENT_MODEL)
        _sentiment_pipeline = pipeline(
            "sentiment-analysis",
            model=settings.SENTIMENT_MODEL,
            top_k=None,
            device=-1
        )
        
        logger.info("Loading emotion model (%s)...", settings.EMOTION_MODEL)
        _emotion_pipeline = pipeline(
            "text-classification",
            model=settings.EMOTION_MODEL,
            top_k=None,
            device=-1
        )
        
        logger.info("Loading embedding model (%s)...", settings.EMBEDDING_MODEL)
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
        
        _models_loaded = True
        logger.info("All transformer models loaded successfully!")
        
    except Exception as e:
        logger.warning(f"Could not load HuggingFace models ({e}). Operating in lightweight fallback mode.")
        _models_loaded = False

def analyze_sentiment(text: str, prompt_word: str = "") -> Dict[str, float]:
    """Run transformer sentiment analysis, returns label probabilities."""
    clean_text = text.strip()
    if not clean_text or is_gibberish(clean_text, prompt_word):
        return {"positive": 0.05, "negative": 0.95}
    
    if _sentiment_pipeline:
        try:
            results = _sentiment_pipeline(clean_text[:512])
            if results and isinstance(results[0], list):
                results = results[0]
            scores = {}
            for r in results:
                label = r["label"].lower()
                scores[label] = round(float(r["score"]), 4)
            return scores
        except Exception as e:
            logger.warning(f"Transformer sentiment error: {e}")
    
    # Lightweight fallback
    words = set(re.findall(r'\b\w+\b', clean_text.lower()))
    pos_count = len(words & POSITIVE_WORDS)
    neg_count = len(words & NEGATIVE_WORDS)
    
    if pos_count == 0 and neg_count == 0:
        return {"positive": 0.5, "negative": 0.5}
    total = pos_count + neg_count
    pos_ratio = round((pos_count + 1) / (total + 2), 4)
    return {"positive": pos_ratio, "negative": round(1.0 - pos_ratio, 4)}

def analyze_emotions(text: str, prompt_word: str = "") -> Dict[str, float]:
    """Run emotion classification, returns top emotion scores."""
    clean_text = text.strip()
    if not clean_text or is_gibberish(clean_text, prompt_word):
        return {"confusion": 0.95}
    
    if _emotion_pipeline:
        try:
            results = _emotion_pipeline(clean_text[:512])
            if results and isinstance(results[0], list):
                results = results[0]
            emotions = {}
            for r in results:
                emotions[r["label"]] = round(float(r["score"]), 4)
            sorted_emotions = dict(sorted(emotions.items(), key=lambda x: x[1], reverse=True)[:10])
            return sorted_emotions
        except Exception as e:
            logger.warning(f"Transformer emotion error: {e}")
    
    # Fallback default emotions
    sentiment = analyze_sentiment(clean_text, prompt_word)
    if sentiment.get("positive", 0.5) >= 0.6:
        return {"optimism": 0.75, "joy": 0.55, "courage": 0.65}
    elif sentiment.get("positive", 0.5) <= 0.35:
        return {"fear": 0.65, "sadness": 0.55, "hesitation": 0.60}
    else:
        return {"neutral": 0.60, "calm": 0.40}

def compute_embedding(text: str, prompt_word: str = "") -> List[float]:
    """Compute sentence embedding vector using Sentence-BERT."""
    if not text.strip() or is_gibberish(text, prompt_word):
        return [0.0] * 384
    
    if _embedding_model:
        try:
            embedding = _embedding_model.encode(text)
            return embedding.tolist()
        except Exception as e:
            logger.warning(f"Embedding error: {e}")
    
    return [0.0] * 384

def extract_features(text: str, prompt_word: str = "") -> Dict[str, Any]:
    """Extract linguistic markers from text (pronouns, passive voice, action verbs)."""
    if not text.strip() or is_gibberish(text, prompt_word):
        return {
            "word_count": len(text.split()), "first_person": 0, "third_person": 0,
            "agency_verb_count": 0, "passive_voice": False,
            "content_word_ratio": 0.0, "has_action": False,
            "is_gibberish": True
        }
    
    words = text.lower().split()
    word_count = len(words)
    
    first_person = sum(1 for w in words if w in {"i", "me", "my", "mine", "myself", "we", "our", "us"})
    third_person = sum(1 for w in words if w in {"he", "she", "they", "them", "their", "his", "her", "it"})
    
    has_action = any(w.endswith("ed") or w.endswith("ing") for w in words)
    agency_count = 1 if has_action else 0
    
    passive_pattern = re.compile(r'\b(was|were|been|being|is|are|am)\s+\w+ed\b', re.IGNORECASE)
    has_passive = bool(passive_pattern.search(text))
    
    function_words = {"the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "and", "but", "or", "if", "then"}
    content_words = [w for w in words if w not in function_words and len(w) > 2 and w in COMMON_ENGLISH_WORDS]
    content_ratio = len(content_words) / max(word_count, 1)
    
    return {
        "word_count": word_count,
        "first_person": first_person,
        "third_person": third_person,
        "agency_verb_count": agency_count,
        "passive_voice": has_passive,
        "content_word_ratio": round(content_ratio, 3),
        "has_action": agency_count > 0,
        "is_gibberish": False
    }

_trait_anchors = {}

def get_trait_similarity(text_embedding: List[float], text: str = "", prompt_word: str = "") -> Dict[str, float]:
    """Compute semantic similarity against trait anchors."""
    global _trait_anchors
    
    traits = ["positivity", "emotional_stability", "agency", "leadership", "responsibility", "empathy", "clarity"]
    
    if is_gibberish(text, prompt_word):
        return {k: 0.06 for k in traits}

    if _embedding_model and any(text_embedding):
        if not _trait_anchors:
            anchor_texts = {
                "positivity": "optimistic positive hopeful bright wonderful successful",
                "emotional_stability": "calm composed relaxed steady peaceful resilient",
                "agency": "action initiative taking charge deciding building creating",
                "leadership": "leading guiding organizing motivating inspiring direction",
                "responsibility": "ownership accountable duty reliable trustworthy",
                "empathy": "understanding caring compassionate team supportive",
                "clarity": "clear direct articulate precise explicit distinct"
            }
            for trait, anchor_text in anchor_texts.items():
                emb = _embedding_model.encode(anchor_text)
                _trait_anchors[trait] = emb / (np.linalg.norm(emb) + 1e-9)
        
        emb_array = np.array(text_embedding)
        norm = np.linalg.norm(emb_array)
        if norm > 0:
            emb_array = emb_array / (norm + 1e-9)
            similarities = {}
            for trait, anchor in _trait_anchors.items():
                sim = float(np.dot(emb_array, anchor))
                similarities[trait] = (sim + 1.0) / 2.0
            return similarities

    # Fallback keyword-based trait similarity
    words = set(re.findall(r'\b\w+\b', text.lower()))
    keyword_map = {
        "positivity": {"hope", "good", "win", "happy", "success", "bright", "positive", "growth", "victory"},
        "emotional_stability": {"calm", "peace", "steady", "composed", "patient", "resolve", "stable", "resilient"},
        "agency": {"do", "act", "build", "lead", "decide", "initiate", "make", "create", "drive", "take"},
        "leadership": {"guide", "team", "inspire", "lead", "manage", "direct", "vision", "mentor", "leader"},
        "responsibility": {"duty", "care", "own", "accountable", "promise", "honest", "protect", "serve"},
        "empathy": {"understand", "feel", "help", "care", "together", "listen", "support", "friend"},
        "clarity": {"clear", "direct", "simple", "exact", "focus", "precise", "stated", "express"}
    }
    
    # Penalize negative keywords
    neg_matches = len(words & NEGATIVE_WORDS)
    
    sims = {}
    for trait in traits:
        matches = len(words & keyword_map[trait])
        base_score = 0.40 + (matches * 0.18) - (neg_matches * 0.15)
        sims[trait] = round(max(0.10, min(0.92, base_score)), 3)
    return sims

def compute_trait_vector(
    sentiment: Dict[str, float],
    emotions: Dict[str, float],
    features: Dict[str, Any],
    embedding: List[float] = None,
    wpm: Optional[float] = None,
    filler_count: Optional[int] = None,
    composure_score: Optional[float] = None,
    text: str = "",
    prompt_word: str = ""
) -> Dict[str, float]:
    """Combine NLP outputs and linguistic indicators into a standardized psychological trait vector."""
    if is_gibberish(text, prompt_word):
        return {
            "positivity": 0.08,
            "emotional_stability": 0.10,
            "agency": 0.05,
            "leadership": 0.05,
            "responsibility": 0.05,
            "empathy": 0.05,
            "clarity": 0.04,
        }

    similarities = get_trait_similarity(embedding or [], text, prompt_word)
    
    pos_score = sentiment.get("positive", 0.5)
    positivity = (pos_score + similarities.get("positivity", 0.5)) / 2.0
    
    neg_emotions = sum(emotions.get(e, 0) for e in ["anger", "fear", "sadness", "disgust"])
    pos_emotions = sum(emotions.get(e, 0) for e in ["joy", "optimism", "pride", "love"])
    stability_base = max(0.0, min(1.0, 0.5 + (pos_emotions - neg_emotions) * 0.5))
    emotional_stability = (stability_base * 0.6) + (similarities.get("emotional_stability", 0.5) * 0.4)
    
    first_person = min(features.get("first_person", 0) / 2.0, 0.5)
    agency = (similarities.get("agency", 0.5) * 0.7) + (first_person * 0.3)
    leadership = (similarities.get("leadership", 0.5) * 0.6) + (agency * 0.4)
    responsibility = (similarities.get("responsibility", 0.5) * 0.6) + (first_person * 0.4)
    
    third_person = min(features.get("third_person", 0) / 2.0, 0.5)
    empathy = (similarities.get("empathy", 0.5) * 0.7) + (third_person * 0.3)
    
    content_ratio = features.get("content_word_ratio", 0)
    clarity = (similarities.get("clarity", 0.5) * 0.5) + (content_ratio * 0.5)
    
    # Modifiers for speech pace & fillers if present
    if wpm is not None:
        if wpm < 100 or wpm > 180:
            leadership = max(0.0, leadership - 0.1)
        elif 120 <= wpm <= 160:
            leadership = min(1.0, leadership + 0.1)
            
    if filler_count is not None and filler_count > 0:
        penalty = min(0.3, filler_count * 0.05)
        clarity = max(0.0, clarity - penalty)
        emotional_stability = max(0.0, emotional_stability - (penalty / 2))
        
    if composure_score is not None:
        emotional_stability = (emotional_stability * 0.5) + (composure_score * 0.5)
        positivity = (positivity * 0.7) + (composure_score * 0.3)
    
    return {
        "positivity": round(max(0.0, min(1.0, positivity)), 3),
        "emotional_stability": round(max(0.0, min(1.0, emotional_stability)), 3),
        "agency": round(max(0.0, min(1.0, agency)), 3),
        "leadership": round(max(0.0, min(1.0, leadership)), 3),
        "responsibility": round(max(0.0, min(1.0, responsibility)), 3),
        "empathy": round(max(0.0, min(1.0, empathy)), 3),
        "clarity": round(max(0.0, min(1.0, clarity)), 3),
    }

def compute_token_highlights(text: str, trait_scores: Dict[str, float], prompt_word: str = "") -> List[Dict[str, Any]]:
    """
    Perturbation-based local explainability.
    Systematically removes each token and measures the trait vector delta.
    """
    clean_text = text.strip()
    if not clean_text:
        return []
    
    if is_gibberish(clean_text, prompt_word):
        return [{"token": w, "weight": -1.0, "traits": ["incoherent"]} for w in clean_text.split()]
    
    words = clean_text.split()
    if len(words) <= 1:
        return [{"token": words[0] if words else "", "weight": 0.5, "traits": list(trait_scores.keys())}]
    
    base_sentiment = analyze_sentiment(clean_text, prompt_word)
    base_emotions = analyze_emotions(clean_text, prompt_word)
    base_features = extract_features(clean_text, prompt_word)
    base_embedding = compute_embedding(clean_text, prompt_word)
    base_traits = compute_trait_vector(base_sentiment, base_emotions, base_features, base_embedding, text=clean_text, prompt_word=prompt_word)
    
    highlights = []
    for i, word in enumerate(words):
        reduced = " ".join(words[:i] + words[i+1:])
        if not reduced.strip():
            highlights.append({"token": word, "weight": 0.5, "traits": []})
            continue
        
        red_sentiment = analyze_sentiment(reduced, prompt_word)
        red_emotions = analyze_emotions(reduced, prompt_word)
        red_features = extract_features(reduced, prompt_word)
        red_embedding = compute_embedding(reduced, prompt_word)
        red_traits = compute_trait_vector(red_sentiment, red_emotions, red_features, red_embedding, text=reduced, prompt_word=prompt_word)
        
        total_impact = 0.0
        influenced_traits = []
        for trait_name in base_traits:
            diff = base_traits[trait_name] - red_traits.get(trait_name, 0)
            if abs(diff) > 0.02:
                influenced_traits.append(trait_name)
                total_impact += diff
        
        weight = max(-1.0, min(1.0, total_impact))
        highlights.append({
            "token": word,
            "weight": round(weight, 3),
            "traits": influenced_traits
        })
    
    return highlights

def analyze_single_response(text: str, wpm: Optional[float] = None, filler_count: Optional[int] = None, composure_score: Optional[float] = None, prompt_word: str = "") -> Dict[str, Any]:
    """Execute complete analysis pipeline for an individual response."""
    sentiment = analyze_sentiment(text, prompt_word)
    emotions = analyze_emotions(text, prompt_word)
    features = extract_features(text, prompt_word)
    embedding = compute_embedding(text, prompt_word)
    traits = compute_trait_vector(sentiment, emotions, features, embedding, wpm, filler_count, composure_score, text=text, prompt_word=prompt_word)
    
    return {
        "sentiment_scores": sentiment,
        "emotion_scores": emotions,
        "features": features,
        "embedding": embedding,
        "trait_scores": traits,
    }
    
    return {
        "sentiment_scores": sentiment,
        "emotion_scores": emotions,
        "features": features,
        "embedding": embedding,
        "trait_scores": traits,
    }

def analyze_session_responses(responses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Analyze all responses across a session."""
    results = []
    for resp in responses:
        text = resp.get("user_text", "")
        wpm = resp.get("wpm")
        filler = resp.get("filler_count")
        composure = resp.get("composure_score")
        analysis = analyze_single_response(text, wpm, filler, composure)
        results.append(analysis)
    return results

def compute_session_averages(trait_scores_list: List[Dict[str, float]]) -> Dict[str, float]:
    """Compute aggregate trait averages across all responses."""
    if not trait_scores_list:
        return {}
    
    keys = trait_scores_list[0].keys()
    averages = {}
    for key in keys:
        vals = [t.get(key, 0) for t in trait_scores_list]
        averages[key] = round(sum(vals) / len(vals), 3)
    return averages
