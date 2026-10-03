import axios from 'axios';
import Session from '../models/Session.js';
import Prompt from '../models/Prompt.js';
import { SEED_PROMPTS } from '../seed/promptsData.js';

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

export const startSession = async (req, res) => {
  try {
    const { module = 'ssb', prompt_count = 15, timer_seconds = 15 } = req.body;

    let prompts = await Prompt.find({ module, active: true }).lean();

    // If database has no prompts yet, seed from data
    if (!prompts || prompts.length === 0) {
      const defaultList = SEED_PROMPTS[module] || SEED_PROMPTS.ssb;
      const created = await Prompt.insertMany(
        defaultList.map((p) => ({ ...p, module, active: true }))
      );
      prompts = created.map((p) => p.toObject());
    }

    // Shuffle and sample
    const shuffled = [...prompts].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(prompt_count, shuffled.length));

    const newSession = await Session.create({
      user: req.user._id,
      module,
      timer_seconds,
      is_complete: false,
      started_at: new Date(),
    });

    return res.status(200).json({
      session_id: newSession._id.toString(),
      prompts: selected.map((p, idx) => ({
        id: p._id ? p._id.toString() : idx + 1,
        word: p.word,
        module: p.module,
        themes: p.themes || [],
        difficulty: p.difficulty || 1,
        language: p.language || 'en',
        active: true,
      })),
      timer_seconds,
    });
  } catch (err) {
    console.error('Start session error:', err);
    return res.status(500).json({ detail: 'Failed to initialize session' });
  }
};

export const submitSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { responses } = req.body;

    const session = await Session.findOne({ _id: sessionId, user: req.user._id });
    if (!session) {
      return res.status(404).json({ detail: 'Session not found' });
    }

    // Idempotent: if already analyzed, return existing
    if (session.is_complete) {
      return res.status(200).json({
        session_id: session._id.toString(),
        overall_scores: session.overall_scores,
        response_count: session.responses.length,
        status: 'already_submitted',
      });
    }

    // Fetch prompt words if missing
    const enrichedResponses = await Promise.all(
      (responses || []).map(async (r, idx) => {
        let promptWord = '';
        let promptThemes = [];
        if (r.prompt_id) {
          try {
            const promptDoc = await Prompt.findById(r.prompt_id);
            if (promptDoc) {
              promptWord = promptDoc.word;
              promptThemes = promptDoc.themes || [];
            }
          } catch {}
        }
        return {
          prompt_id: r.prompt_id,
          prompt_word: promptWord || `Word #${idx + 1}`,
          prompt_themes: promptThemes,
          order_index: r.order_index ?? idx,
          user_text: r.user_text || '',
          wpm: r.wpm || 0,
          filler_count: r.filler_count || 0,
          composure_score: r.composure_score || 0.5,
        };
      })
    );

    // Call Python AI Microservice for NLP Inference
    let aiResult = null;
    try {
      const pyRes = await axios.post(
        `${PYTHON_AI_URL}/ai/analyze`,
        {
          session_id: sessionId,
          module: session.module,
          responses: enrichedResponses,
        },
        { timeout: 30000 }
      );
      aiResult = pyRes.data;
    } catch (aiErr) {
      console.warn('Python AI service unreachable on port 8000. Running local NLP evaluator:', aiErr.message);
      aiResult = evaluateLocally(enrichedResponses, session.module);
    }

    const overallScores = aiResult.overall_scores;
    const overallDomain = aiResult.overall_domain_traits || [];
    const explanations = aiResult.explanations || [];
    const analyzedResponses = aiResult.responses;

    // Update Session in MongoDB
    session.overall_scores = overallScores;
    session.overall_domain_traits = overallDomain;
    session.explanations = explanations;
    session.responses = analyzedResponses;
    session.is_complete = true;
    session.completed_at = new Date();

    await session.save();

    return res.status(200).json({
      session_id: session._id.toString(),
      overall_scores: session.overall_scores,
      response_count: analyzedResponses.length,
      status: 'analyzed',
    });
  } catch (err) {
    console.error('Submit session error:', err);
    return res.status(500).json({ detail: 'Failed to process session submission' });
  }
};

export const getSessionResults = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ _id: sessionId, user: req.user._id }).lean();

    if (!session) {
      return res.status(404).json({ detail: 'Session not found' });
    }

    return res.status(200).json({
      session_id: session._id.toString(),
      module: session.module,
      started_at: session.started_at ? session.started_at.toISOString() : null,
      completed_at: session.completed_at ? session.completed_at.toISOString() : null,
      overall_scores: session.overall_scores,
      overall_domain_traits: session.overall_domain_traits || [],
      explanations: session.explanations || [],
      responses: (session.responses || []).map((r, i) => ({
        id: r.id || i + 1,
        prompt_word: r.prompt_word || 'Word',
        prompt_themes: r.prompt_themes || [],
        user_text: r.user_text || '',
        sentiment_scores: r.sentiment_scores,
        emotion_scores: r.emotion_scores,
        trait_scores: r.trait_scores,
        domain_traits: r.domain_traits || [],
        token_highlights: r.token_highlights || [],
        features: r.features,
        order_index: r.order_index,
        wpm: r.wpm,
        filler_count: r.filler_count,
        composure_score: r.composure_score,
      })),
      timer_seconds: session.timer_seconds,
    });
  } catch (err) {
    console.error('Get session results error:', err);
    return res.status(500).json({ detail: 'Error fetching session results' });
  }
};

export const listSessions = async (req, res) => {
  try {
    const { module } = req.query;
    const filter = { user: req.user._id, is_complete: true };
    if (module) filter.module = module;

    const sessions = await Session.find(filter)
      .sort({ completed_at: -1 })
      .limit(50)
      .lean();

    return res.status(200).json(
      sessions.map((s) => ({
        id: s._id.toString(),
        module: s.module,
        started_at: s.started_at,
        completed_at: s.completed_at,
        overall_scores: s.overall_scores,
        response_count: s.responses ? s.responses.length : 0,
      }))
    );
  } catch (err) {
    console.error('List sessions error:', err);
    return res.status(500).json({ detail: 'Error fetching sessions' });
  }
};

export const getResponseHighlights = async (req, res) => {
  try {
    const { sessionId, responseId } = req.params;
    const session = await Session.findOne({ _id: sessionId, user: req.user._id });
    if (!session) {
      return res.status(404).json({ detail: 'Session not found' });
    }

    const resp = session.responses.find(
      (r, idx) => (r.id && r.id.toString() === responseId) || idx.toString() === responseId
    );

    if (!resp) {
      return res.status(404).json({ detail: 'Response not found' });
    }

    if (resp.token_highlights && resp.token_highlights.length > 0) {
      return res.status(200).json({
        response_id: responseId,
        user_text: resp.user_text,
        token_highlights: resp.token_highlights,
        trait_scores: resp.trait_scores,
        domain_traits: resp.domain_traits,
      });
    }

    // Call Python AI microservice if highlights not cached
    try {
      const pyRes = await axios.post(`${PYTHON_AI_URL}/ai/highlights`, {
        user_text: resp.user_text,
        trait_scores: resp.trait_scores,
      });
      resp.token_highlights = pyRes.data.token_highlights;
      await session.save();
    } catch {}

    return res.status(200).json({
      response_id: responseId,
      user_text: resp.user_text,
      token_highlights: resp.token_highlights || [],
      trait_scores: resp.trait_scores,
      domain_traits: resp.domain_traits,
    });
  } catch (err) {
    return res.status(500).json({ detail: 'Error loading highlights' });
  }
};

// ─── Local Fallback NLP Engine (Prevents flat 50% on gibberish / downtime) ─────

const COMMON_WORDS_SET = new Set([
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
]);

const VALID_SHORT_SET = new Set([
  'a', 'i', 'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it',
  'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us', 'we', 'ok'
]);

function isGibberish(text, promptWord = '') {
  const clean = (text || '').trim();
  if (!clean || clean.length < 3) return true;

  if (promptWord) {
    const cleanPrompt = promptWord.toLowerCase().replace(/[^a-z]/g, '');
    const cleanText = clean.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanText === cleanPrompt) return true;
  }

  const punctCount = (clean.match(/[/\\,.;:_\-+=~!@#$%^&*`]/g) || []).length;
  if (punctCount > 0 && clean.length < 25 && (punctCount / clean.length) > 0.12) return true;

  const words = clean.toLowerCase().match(/[a-z]+/g) || [];
  if (words.length === 0) return true;

  const totalLetters = words.reduce((acc, w) => acc + w.length, 0);
  if (totalLetters < 4) return true;

  for (const w of words) {
    if (/(.)\1{2,}/.test(w)) return true;
    if (w.length >= 4 && /[^aeiouy]{4,}/.test(w) && !COMMON_WORDS_SET.has(w)) return true;
    if (w.length >= 3 && !/[aeiouy]/.test(w)) return true;
    if (w.length > 3) {
      const vowels = (w.match(/[aeiouy]/g) || []).length;
      if ((vowels / w.length) < 0.20 && !COMMON_WORDS_SET.has(w)) return true;
    }
  }

  const recognized = words.filter(w => COMMON_WORDS_SET.has(w) || VALID_SHORT_SET.has(w)).length;
  return (recognized / words.length) < 0.50;
}

function evaluateLocally(responses, module = 'ssb') {
  const analyzedResponses = responses.map((r, i) => {
    const text = (r.user_text || '').trim();
    const promptWord = r.prompt_word || '';
    const gibberish = isGibberish(text, promptWord);

    let traitScores;
    let highlights = [];

    if (gibberish) {
      traitScores = {
        positivity: 0.08,
        emotional_stability: 0.10,
        agency: 0.05,
        leadership: 0.05,
        responsibility: 0.05,
        empathy: 0.05,
        clarity: 0.04,
      };
      highlights = text.split(/\s+/).map(w => ({
        token: w,
        weight: -1,
        traits: ['incoherent']
      }));
    } else {
      const words = new Set(text.toLowerCase().match(/\b\w+\b/g) || []);
      const posMatches = ['brave', 'courage', 'lead', 'protect', 'duty', 'honor', 'team', 'win', 'action', 'serve'].filter(w => words.has(w)).length;
      const negMatches = ['fear', 'fail', 'quit', 'afraid', 'defeat', 'trouble'].filter(w => words.has(w)).length;
      const score = Math.max(0.2, Math.min(0.85, 0.45 + (posMatches * 0.15) - (negMatches * 0.15)));
      traitScores = {
        positivity: score,
        emotional_stability: parseFloat((score + 0.05).toFixed(3)),
        agency: parseFloat(Math.max(0.1, score - 0.05).toFixed(3)),
        leadership: score,
        responsibility: score,
        empathy: score,
        clarity: parseFloat(Math.min(0.9, 0.4 + (words.size * 0.05)).toFixed(3)),
      };
      highlights = text.split(/\s+/).map(w => ({
        token: w,
        weight: posMatches > 0 ? 0.3 : 0,
        traits: ['positivity']
      }));
    }

    return {
      ...r,
      id: i + 1,
      trait_scores: traitScores,
      token_highlights: highlights,
      features: {
        word_count: text.split(/\s+/).filter(Boolean).length,
        is_gibberish: gibberish,
      },
      domain_traits: [
        {
          trait: 'leadership',
          label: 'Leadership & Commanding Presence',
          score: traitScores.leadership,
          level: traitScores.leadership > 0.6 ? 'strength' : (traitScores.leadership > 0.3 ? 'developing' : 'needs_focus'),
          olq: 'Effective Intelligence'
        }
      ]
    };
  });

  const overallScores = {
    positivity: 0,
    emotional_stability: 0,
    agency: 0,
    leadership: 0,
    responsibility: 0,
    empathy: 0,
    clarity: 0,
  };
  for (const resp of analyzedResponses) {
    for (const k of Object.keys(overallScores)) {
      overallScores[k] += resp.trait_scores[k] || 0;
    }
  }
  const count = Math.max(analyzedResponses.length, 1);
  for (const k of Object.keys(overallScores)) {
    overallScores[k] = parseFloat((overallScores[k] / count).toFixed(3));
  }

  return {
    overall_scores: overallScores,
    overall_domain_traits: [
      {
        trait: 'leadership',
        label: 'Overall Performance',
        score: overallScores.leadership,
        level: overallScores.leadership > 0.6 ? 'strength' : (overallScores.leadership > 0.3 ? 'developing' : 'needs_focus'),
        olq: 'Effective Intelligence'
      }
    ],
    explanations: overallScores.positivity < 0.25 ? [
      {
        trait: 'overall',
        explanation: 'Low coherence or random input detected. Responses should be meaningful, spontaneous sentences to demonstrate officer-like qualities.'
      }
    ] : [
      {
        trait: 'overall',
        explanation: 'Session evaluated using baseline NLP heuristics.'
      }
    ],
    responses: analyzedResponses,
  };
}
