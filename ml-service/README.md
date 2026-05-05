# TaskFlow AI — ML Microservice 🧠

Machine Learning microservice for **TaskFlow AI** — enhances the existing rule-based AI engine with trained scikit-learn/XGBoost models.

## Architecture

```
Node.js Backend (:5000) ──HTTP──▶ ML Service (:8000) ──read-only──▶ MongoDB
        │                              │
        ▼                              ▼
  Rule-based AI (fallback)      Trained ML Models (joblib)
```

- **Independent**: Runs on a separate port, never modifies the database
- **Optional**: If this service is down, Node.js falls back to rule-based AI
- **Read-only**: Only reads from MongoDB — no writes

## Quick Start

```bash
# 1. Navigate to ml-service directory
cd ml-service

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment
cp .env.example .env
# Edit .env with your MongoDB connection string

# 5. Start the server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

### Predictions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict/effort` | Predict story points |
| POST | `/predict/delay` | Predict delay risk |
| POST | `/predict/priority` | Suggest task priority |
| POST | `/predict/assignee` | Recommend best assignee |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/user-productivity` | User productivity metrics |

### Training
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/train` | Train/retrain all models |
| GET | `/train/status` | Check training progress |

## Response Format

All prediction endpoints return:
```json
{
  "prediction": "...",
  "confidence": 0.85,
  "fallback": false
}
```

If model is unavailable:
```json
{
  "prediction": null,
  "confidence": 0.0,
  "fallback": true
}
```

## ML Models

| Model | Algorithm | Task |
|-------|-----------|------|
| Effort | GradientBoostingRegressor | Story point estimation |
| Delay | RandomForestClassifier | Deadline risk prediction |
| Priority | XGBClassifier | Priority suggestion (p0-p3) |
| Assignee | XGBClassifier + Cosine Similarity | Team member recommendation |

## Training

Models are trained from your MongoDB data. Minimum thresholds:
- **Effort**: 30 completed tasks with story points
- **Delay**: 20 completed tasks with due dates
- **Priority**: 30 tasks with priority set
- **Assignee**: 20 completed tasks with assignees

```bash
# Trigger training via API
curl -X POST http://localhost:8000/train -H "Content-Type: application/json" -d '{"orgId": "your-org-id"}'
```
