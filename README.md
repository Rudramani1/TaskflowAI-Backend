# TaskFlow AI - Intelligent Project Management Platform

A full-stack Jira/Linear-like project management platform with AI-powered insights, real-time collaboration, and Kanban boards.

## 🚀 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Real-time | Server-Sent Events (SSE) |
| Auth | JWT (bcryptjs) |

## 📁 Project Structure

```
TaskFlow/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/       # Navbar, Sidebar
│   │   ├── pages/            # Dashboard, Login, Signup, Projects, Tasks, Profile
│   │   ├── features/         # auth/, tasks/, projects/, ai/
│   │   ├── services/         # axiosInstance, api
│   │   ├── hooks/            # useAuth, useTasks, useProjects
│   │   ├── styles/           # CSS files
│   │   ├── utils/            # Helper functions
│   │   ├── App.jsx           # Root component
│   │   └── main.jsx          # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/                  # Express Backend
│   ├── controllers/          # auth, task, project, ai, sprint, comment
│   ├── models/               # User, Organization, Project, Task, Sprint, etc.
│   ├── routes/               # API routes
│   ├── middleware/            # auth, role, error handling
│   ├── services/             # AI engine, email, SSE, seed
│   ├── config/               # DB connection
│   ├── server.js             # Entry point
│   ├── package.json
│   └── .env
│
└── README.md
```

## 🛠 Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB Atlas connection (already configured in .env)

### 1. Install dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
```

### 2. Seed the database (optional but recommended)

```bash
cd backend
npm run seed
```

This creates sample users, organization, projects, and tasks.

### 3. Start the backend

```bash
cd backend
npm run dev
```

Server starts at `http://localhost:5000`

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend starts at `http://localhost:5173`

## 🔑 Demo Credentials

After running the seeder:

| Email | Password | Role |
|-------|----------|------|
| sandeep@taskflow.ai | password123 | Admin |
| priya@taskflow.ai | password123 | Manager |
| rahul@taskflow.ai | password123 | Member |
| anita@taskflow.ai | password123 | Member |

## ✨ Features

### Core (Phase 1)
- ✅ JWT Authentication (Signup/Login)
- ✅ Organization/Workspace management
- ✅ Project CRUD with member management
- ✅ Task management (create, update, delete, filter, search)
- ✅ Kanban board with drag-and-drop
- ✅ List view for tasks
- ✅ Task detail with subtasks, checklists, comments
- ✅ Activity logging
- ✅ Real-time updates via SSE

### Advanced (Phase 2)
- ✅ Sprint management
- ✅ Drag-and-drop Kanban
- ✅ Filters and search
- ✅ Role-based access control (RBAC)
- ✅ Responsive design

### AI Features (Phase 3 - Rule-based, no paid APIs)
- ✅ Sprint risk scoring
- ✅ Delay prediction
- ✅ Task effort estimation
- ✅ Smart assignee suggestion
- ✅ Productivity trends
- ✅ Workload distribution analysis
- ✅ Auto-prioritize tasks
- ✅ Bottleneck detection
- ✅ Intelligent insights dashboard

## 🔌 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/signup | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get profile |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| POST | /api/tasks/:id/comments | Add comment |
| GET | /api/ai/insights/:projectId | AI insights |
| GET | /api/ai/delay-prediction/:projectId | Delay predictions |
| GET | /api/ai/workload | Workload analysis |
| POST | /api/ai/auto-prioritize/:projectId | Auto-prioritize |

## 📝 Environment Variables

Backend `.env` (already created in `/backend`):
```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
```
