# TaskFlow AI — Backend ⚙️

The core Node.js API server for **TaskFlow AI**. This backend handles authentication, task management, real-time synchronization, and orchestrates the AI logic (routing between the built-in rule engine and the separate Python ML microservice).

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose)
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time:** Server-Sent Events (SSE)
- **File Parsing:** `csv-parse` (for importing historical sprint data)

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or local MongoDB instance)

### 1. Install Dependencies
Navigate to the `backend` directory and install the required packages:
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy the example environment file and fill in your values:
```bash
cp .env.example .env
```
Ensure the `.env` file contains at least:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_key
CLIENT_URL=http://localhost:5173

# Optional: Link to the Python ML Microservice
ML_SERVICE_URL=http://localhost:8000
```

### 3. Run the Server
Start the backend server in development mode:
```bash
npm run dev
```
The server will start on `http://localhost:5000`.

## Architecture Overview

- **Controllers (`controllers/`):** Handle incoming HTTP requests and format responses.
- **Models (`models/`):** Mongoose schemas for Users, Tasks, Sprints, Organizations, and Sprint History.
- **Routes (`routes/`):** Define the API endpoints and attach middleware (e.g., authentication checks).
- **Services (`services/`):** Contains the core business logic.
  - `ai-engine.js`: The built-in rule-based AI engine for estimations and analytics.
  - `ml-client.js`: HTTP client that talks to the standalone Python ML microservice with auto-fallback.
- **Middleware (`middleware/`):** Custom Express middleware for JWT verification and error handling.

## Real-time Events (SSE)
This application uses **Server-Sent Events** rather than WebSockets for lightweight, unidirectional real-time updates (e.g., notifying clients when a task's status changes). The SSE endpoint is located at `/api/events`.

## AI Integration Strategy (Fallback Pattern)
The backend acts as the orchestrator for AI features:
1. It attempts to call the **Python ML Microservice** via `ml-client.js`.
2. If the ML service is unreachable, down, or returning an error, it **seamlessly falls back** to the local `ai-engine.js` heuristics. 
3. This ensures 100% uptime for AI features regardless of the ML microservice status.
