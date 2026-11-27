# Architecture

Browser (HTML/CSS/ES modules) → FastAPI routes → service layer → model inference or SQLite.

- `backend/main.py`: application and static hosting.
- `backend/routers/auth.py`: account lifecycle and session authorization.
- `backend/routers/care.py`: image inference, symptom assessment, chatbot, milk and history routes.
- `backend/services/vision.py`: lazy-loaded ONNX and Transformers models, preprocessing and scores.
- `backend/services/health.py`: symptom matching against JSON knowledge data.
- `backend/services/assistant.py`: semantic text embedding and retrieval.
- `backend/db.py`: schema initialization and transactional connections.
- `frontend/api.js`: shared API client; `frontend/app.js`: navigation and views.

Images are processed in memory, not stored. Prediction labels and milk records are scoped to the authenticated user. This implementation uses a local SQLite database and a same-origin browser app instead of Flutter and Firebase. English only; no veterinary appointments, voice support or mobile TFLite build. No clinical validation or production hardening.
