# CredCheck Backend API

FastAPI backend for the CredCheck Chrome extension.

## Features

- `/api/analyze` - Analyze content credibility
- `/api/history` - Get recent checks
- `/api/health` - Health check

## Setup

1. Install dependencies:
```bash
pip install fastapi uvicorn httpx python-dotenv
```

2. Create `.env` file:
```
ANTHROPIC_API_KEY=your_key_here
SERPER_API_KEY=optional
NEWSAPI_KEY=optional
```

3. Run server:
```bash
uvicorn main:app --reload --port 8000
```

## API Documentation

Open `/docs` for interactive API documentation.
