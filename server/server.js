import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import axios from 'axios';

import authRoutes from './routes/authRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import rewriteRoutes from './routes/rewriteRoutes.js';
import Prompt from './models/Prompt.js';
import User from './models/User.js';
import { SEED_PROMPTS } from './seed/promptsData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wat_analyzer';
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', async (req, res) => {
  let aiStatus = 'disconnected';
  try {
    const pyCheck = await axios.get(`${PYTHON_AI_URL}/health`, { timeout: 2000 });
    if (pyCheck.data?.status === 'ok') aiStatus = 'connected';
  } catch {}

  res.json({
    status: 'healthy',
    stack: 'MERN + Python AI Microservice',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    ai_service: aiStatus,
    ai_url: PYTHON_AI_URL,
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/rewrite', rewriteRoutes);

// Database Seeding Helper
async function seedInitialData() {
  try {
    // 1. Ensure default candidate user (gaurav / password123)
    const existingUser = await User.findOne({ username: 'gaurav' });
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('password123', 12);
      await User.create({
        username: 'gaurav',
        email: 'gaurav@example.com',
        password: hashedPassword,
        fullName: 'Gaurav Candidate',
        role: 'end_user',
      });
      console.log('✅ Created default user: gaurav / password123');
    }

    // 2. Ensure prompts are seeded for all modules
    const promptCount = await Prompt.countDocuments();
    if (promptCount === 0) {
      const allPrompts = [];
      for (const [moduleKey, prompts] of Object.entries(SEED_PROMPTS)) {
        for (const p of prompts) {
          allPrompts.push({
            module: moduleKey,
            word: p.word,
            themes: p.themes,
            difficulty: p.difficulty,
            language: 'en',
            active: true,
          });
        }
      }
      await Prompt.insertMany(allPrompts);
      console.log(`✅ Seeded ${allPrompts.length} default prompts across modules.`);
    }
  } catch (err) {
    console.error('Error during data seeding:', err);
  }
}

// Start Server
async function startServer() {
  try {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('🚀 Connected to MongoDB successfully!');

    await seedInitialData();

    // Check Python AI Microservice
    try {
      const pyPing = await axios.get(`${PYTHON_AI_URL}/health`, { timeout: 3000 });
      if (pyPing.data?.status === 'ok') {
        console.log(`🤖 Python AI Microservice connected at ${PYTHON_AI_URL}`);
      }
    } catch {
      console.log(`ℹ️ Python AI Microservice not detected on ${PYTHON_AI_URL} (Local NLP fallback ready)`);
    }

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`  MERN Backend API Gateway running on port ${PORT} `);
      console.log(`  Health Check: http://localhost:${PORT}/health   `);
      console.log(`===============================================`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

startServer();
