import express from 'express';
import {
  startSession,
  submitSession,
  getSessionResults,
  listSessions,
  getResponseHighlights,
} from '../controllers/sessionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/start', startSession);
router.post('/:sessionId/submit', submitSession);
router.get('/:sessionId/results', getSessionResults);
router.get('/:sessionId/responses/:responseId/highlights', getResponseHighlights);
router.get('/', listSessions);

export default router;
