# WAT Analyzer: AI-Powered Psychometric Assessment Platform
### *Architecture: MERN Stack (React, Node.js, Express, MongoDB) + Python AI Microservice*

---

## 🏗️ Architecture Overview

The platform uses a **Polyglot Microservices Architecture** to separate high-concurrency web I/O from compute-heavy machine learning inference:

```
┌────────────────────────────────────────────────────────┐
│                   REACT (Port 3000)                    │
│   (Vite UI, Camera HUD, Web Speech API, Test Timer)    │
└───────────────────────────┬────────────────────────────┘
                            │ (Client Requests via REST)
                            ▼
┌────────────────────────────────────────────────────────┐
│             EXPRESS.JS + NODE.JS (Port 5000)           │
│   (Main API Gateway: Auth, Sessions, Business Logic)   │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
    (Mongoose BSON Queries)      (Internal HTTP POST)
               ▼                          ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│     MONGODB (Port 27017)  │  │  PYTHON AI MICROSERVICE │
│   - Users Collection      │  │       (Port 8000)       │
│   - Sessions Collection   │  │  - DistilBERT           │
│   (Stores JSON reports)   │  │  - RoBERTa              │
└───────────────────────────┘  │  - Sentence-BERT        │
                               │  - Token Perturbation   │
                               └─────────────────────────┘
```

---

## 🛠️ Technology Stack

1. **Frontend (React)**:
   - React 18, Vite, Tailwind CSS.
   - Browser Web Speech API for real-time speech transcription & WPM tracking.
   - Camera video stream with composure metric visualization.
2. **Backend API Gateway (Express & Node.js)**:
   - Express.js running on Port `5000`.
   - Native Bcrypt (`bcryptjs`, 12 rounds) for password hashing.
   - Stateless JWT Bearer token authentication.
   - Mongoose ODM managing MongoDB connections.
3. **Database (MongoDB)**:
   - Running on Port `27017` (`wat_analyzer` database).
   - Document-oriented schema: perfectly handles nested psychometric trait scores, emotion distributions, and token attribution arrays without relational SQL joins.
4. **AI Inference Microservice (Python FastAPI)**:
   - Running on Port `8000`.
   - **DistilBERT** (`distilbert-base-uncased-finetuned-sst-2-english`) for sentiment polarity.
   - **RoBERTa** (`j-hartmann/emotion-english-distilroberta-base`) for fine-grained 7-class emotion scoring.
   - **Sentence-BERT** (`all-MiniLM-L6-v2`) for 384-dimensional dense semantic vector similarity.
   - Perturbation-based explainability (XAI) for token-level impact attribution.

---

## 🚀 How to Run

### Method 1: One-Click Launcher (Windows)
Double-click `run_all.bat` to launch all 3 tiers simultaneously.

### Method 2: Manual Terminal Commands
1. **Start MongoDB**: Ensure MongoDB service is running on `127.0.0.1:27017`.
2. **Start Python AI Microservice (Port 8000)**:
   ```bash
   cd api
   venv\Scripts\python -m uvicorn main:app --port 8000
   ```
3. **Start Express Gateway (Port 5000)**:
   ```bash
   cd server
   npm start
   ```
4. **Start React Frontend (Port 3000)**:
   ```bash
   cd web
   npm run dev
   ```

Open your browser at **`http://localhost:3000`**.
Default credentials: `username: gaurav` | `password: password123`.

---

## 💼 Resume Bullets (Tailored for Full-Stack / MERN Developer Roles)

- **AI-Powered Psychometric Assessment Platform (MERN + Python AI Microservice)**:
  - Architected a full-stack psychometric testing platform using **React, Node.js, Express, and MongoDB**, decoupled from a **Python AI microservice** for transformer inference.
  - Implemented secure JWT authentication and password hashing with **12-round Bcrypt**, designing idempotent REST endpoints to prevent duplicate test submissions.
  - Modeled document schemas in **MongoDB** to store dynamic, nested psychometric trait vectors, speech telemetry (WPM, filler words), and emotional distributions without relational table overhead.
  - Connected the Express gateway to a Python microservice hosting **DistilBERT**, **RoBERTa**, and **Sentence-BERT** models, performing cosine similarity against psychological trait anchors and leave-one-out token perturbation for explainable AI (XAI).
