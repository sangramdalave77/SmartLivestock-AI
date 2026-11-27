# CattleSense — AI-powered cattle care companion

Semester I web reimplementation for educational use. This repository provides real inference adapters, authenticated API routes, a responsive frontend and SQLite persistence. It is not a validated veterinary diagnostic product.

## Run locally (Windows, Python 3.11 recommended)

From the repository root in VS Code PowerShell:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m scripts.download_models
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

Open http://127.0.0.1:8000 and create an account. API docs: http://127.0.0.1:8000/docs. SQLite is created automatically. No external database is required. Gemini requires your own API key. Copy `.env.example` to `.env`, enter your key and restart the server. First-time model downloads require internet and substantial disk space. Subsequent launches require only the final command; cached models can be used offline with `HF_HUB_OFFLINE=1` (PowerShell: `$env:HF_HUB_OFFLINE='1'`). `SETUP.bat` and `START.bat` are alternative launchers.

## Features
- Account registration and sign-in, PBKDF2 password hashing, opaque expiring sessions.
- Breed recognition: image preprocessing, Indian bovine CNN with strict checkpoint loading and upstream class mapping.
- Skin screening: pretrained image classifier; scores are not diagnostic probabilities.
- Symptom assessment: transparent rule-based overlap, disease information and veterinary referral advice.
- Care assistant: Gemini generative AI with conversation context and multilingual responses.
- Milk records and assessment history stored per account in SQLite.
- FastAPI OpenAPI documentation and automated tests.

## Additional capabilities
- Live dashboard counts, image quality warnings, uncertainty checks, drag-and-drop image input, ranked results and model lab.
- Searchable eight-condition guide, interactive milk chart and CSV history export.
- Independent evaluation: `python -m scripts.evaluate skin path/to/test_images` (class-labelled folders).

## Model sources
See [model documentation](docs/MODELS.md). Model files are intentionally fetched from upstream rather than committed to Git. No fabricated predictions are returned when models are unavailable. The original project's training data, accuracy measurements and Flutter/TFLite/Firebase implementation are not reproduced.

## Test
```powershell
python -m pip install -r requirements-dev.txt
python -m pytest -q
```
Ten automated API and helper tests passed, including a mocked Gemini route. Gemini requires a user-provided key and live verification. Tests verify API behavior, not real model accuracy; model downloads and browser end-to-end inference were not verified due to network restrictions. Run `python -m scripts.download_models` and test real cattle photographs before presenting. See [verification checklist](docs/TESTING.md).

## Publish on GitHub
Create an empty repository (no initial README), then run:
```powershell
git init
git add .
git commit -m "Initial CattleSense web implementation"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/CattleSense.git
git push -u origin main
```
Replace the remote URL with your own. `.gitignore` excludes databases, virtual environments, secrets and model binaries. Check upstream model licensing before any redistribution. This repository is intended for local academic use, not exposure to the public internet without HTTPS, request limits, rate limiting and security review.
