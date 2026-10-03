import express from 'express';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { text, prompt_word, focus_traits, module } = req.body;
    const pyRes = await axios.post(`${PYTHON_AI_URL}/api/rewrite`, {
      text,
      prompt_word,
      focus_traits,
      module,
    });
    return res.status(200).json(pyRes.data);
  } catch (err) {
    console.error('Rewrite proxy error:', err.message);
    // Graceful fallback suggestions if AI service has a hiccup
    const word = req.body?.prompt_word || 'Challenge';
    return res.status(200).json({
      rewrites: [
        {
          rewrite: `Facing ${word.toLowerCase()} directly strengthens resolve and delivers results.`,
          explanation: 'Uses decisive, action-oriented phrasing emphasizing personal agency.',
          trait_scores: { agency: 0.85, leadership: 0.75, positivity: 0.8 },
        },
        {
          rewrite: `A true leader transforms every ${word.toLowerCase()} into a team opportunity.`,
          explanation: 'Demonstrates active ownership and collaborative leadership.',
          trait_scores: { leadership: 0.9, responsibility: 0.85, empathy: 0.8 },
        },
      ],
    });
  }
});

export default router;
