# TaskFlow AI 🚀

> Intelligent project management platform with AI-powered sprint insights, delay prediction, and workload balancing. A Jira/Linear alternative built for teams that want to actually ship on time.

---

## What We're Building

TaskFlow AI is a full-stack project management tool with a real AI layer on top — not AI as a buzzword, but AI that reads your sprint data and tells you something actionable. The core product is a Kanban/sprint board. The differentiator is the AI dashboard that flags risks, estimates effort, detects bottlenecks, and surfaces insights your team would otherwise miss.

**Key design decisions:**
- AI features that need historical data are gated behind a progress bar and seeded with demo data so they're useful from day one
- Three roles: Admin, Member, Guest — scoped at both org and project level
- Every piece of data is scoped to an `organizationId` — multi-tenancy is built in from the start, not bolted on later

---

## Features

### Auth & Workspace
- User signup and login with JWT (access + refresh tokens)
- Google OAuth
- Organization creation with unique slug
- Team member invitations via signed email link
- Three roles: Admin, Member, Guest — at both org and project level
- Private and public projects within an org

### Project Management
- Projects with name, description, color, visibility, archive support
- Tasks with title, rich text description, assignee, priority (P0–P3), status, labels, due date, story points
- Subtasks and checklist items per task
- Activity log on every task — who changed what and when
- Kanban board with drag-and-drop columns
- List view with sortable, inline-editable columns
- Filters by assignee, priority, status, label, due date — saveable as named views
- Calendar view — tasks plotted by due date, color-coded by priority

### Sprints
- Sprint creation with name, goal, start and end dates
- Backlog — all tasks not in a sprint, drag to assign
- Burndown chart — ideal line vs actual remaining points, auto-updates on task completion
- Sprint close — move incomplete tasks to backlog or next sprint, writes sprint history

### Collaboration
- Comment threads per task with markdown support
- @mentions in comments — triggers in-app notification to tagged user
- In-app notifications — assigned to you, @mentioned, deadline today, sprint ending tomorrow
- Real-time board sync via SSE — card moves and status changes appear for all open board views instantly

### AI — Available from Day One
- **Story point estimator** — paste a task title and description, get a Fibonacci point suggestion with reasoning
- **Sprint risk score** — 0–100 score with Low/Medium/High label and a plain-English explanation of why
- **Delay detection** — flags tasks likely to miss their deadline with an AI-generated reason per task
- **Workload distribution** — bar chart of open story points per team member right now
- **Bottleneck detection** — flags tasks stuck in "In Review" or "Blocked" for 3+ days
- **Assignment suggestion** — ranks team members by current load when creating a task

### AI — Data-Gated (demo seeded, unlocks with real sprint history)
- **Velocity tracking** — planned vs completed points per sprint over time, unlocks at 3 sprints
- **Productivity trends** — task completion rate per member per week, unlocks at 4 weeks of activity
- **Sprint retrospective AI** — generated automatically on sprint close: what went well, what didn't, what to try next, unlocks at 2 sprints
- **Prioritization suggestions** — Claude recommends task reordering based on due dates and historical rates, unlocks at 3 sprints

### Polish
- Keyboard shortcuts — `C` create task, `Esc` close, `/` search, `?` help modal
- Email notifications — daily digest of tasks due today, assigned notification
- Empty states, loading skeletons, mobile-responsive list and task views
- Demo org on signup — pre-seeded project and sprint history so every AI feature works immediately

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React Router, Tailwind CSS, dnd-kit (drag and drop), Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT (access + refresh tokens), bcrypt |
| AI | Anthropic Claude API (`claude-sonnet-4-20250514`) |
| Real-time | Server-Sent Events (SSE) |
| Email | Nodemailer (invites + daily digest) |
| Deploy | Vercel (frontend), Railway (backend + MongoDB) |

---

## Project Structure

```
taskflow-ai/
├── client/                   # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── board/        # Kanban board, task cards
│   │   │   ├── sprint/       # Sprint view, burndown chart
│   │   │   ├── ai/           # AI dashboard, insight cards
│   │   │   └── shared/       # Buttons, modals, avatars
│   │   ├── pages/            # Route-level components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # Auth context, org context
│   │   └── utils/            # API client, helpers
│   └── public/
│
├── server/                   # Express backend
│   ├── routes/
│   │   ├── auth.js
│   │   ├── organizations.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── sprints.js
│   │   ├── comments.js
│   │   ├── notifications.js
│   │   └── ai.js
│   ├── models/               # Mongoose schemas
│   ├── middleware/            # Auth, RBAC, org-scope
│   ├── services/
│   │   ├── claude.js         # All Claude API calls
│   │   ├── sse.js            # Real-time board sync
│   │   └── seed.js           # Demo data generator
│   └── index.js
│
└── README.md
```

---

## Data Models

### Organization
```js
{
  _id, name, slug,
  members: [{ userId, role }],  // role: 'admin' | 'member' | 'guest'
  createdAt
}
```

### Project
```js
{
  _id, orgId, name, color,
  visibility: 'public' | 'private',
  memberIds: [],
  archivedAt
}
```

### Task
```js
{
  _id, orgId, projectId, sprintId,
  title, description,           // description is HTML (rich text)
  status, priority,             // priority: 'p0' | 'p1' | 'p2' | 'p3'
  assigneeId, labels: [],
  storyPoints, dueDate,
  subtasks: [], checklist: [],
  createdBy, createdAt
}
```

### Sprint
```js
{
  _id, orgId, projectId,
  name, goal, startDate, endDate,
  status: 'planned' | 'active' | 'complete',
  velocityPoints                // written when sprint closes
}
```

### Comment
```js
{ _id, taskId, orgId, authorId, body, mentions: [], createdAt }
```

### ActivityLog
```js
{ _id, orgId, taskId, actorId, action, diff: {}, createdAt }
```

### Notification
```js
{ _id, orgId, userId, type, entityId, read, createdAt }
```

### SprintHistory *(written on sprint close, read by AI)*
```js
{
  _id, orgId, sprintId,
  plannedPoints, completedPoints,
  memberStats: [{ userId, pointsCompleted }],
  retrospectiveSummary          // generated by Claude on close
}
```

---

## Phases

---

### Phase 1 — Foundation
**Timeline: Weeks 1–2**

This phase is all infrastructure. Nothing visible to a demo audience, but everything else depends on it being solid.

#### Week 1 — Auth + Org + Database

**Stack: Node.js, Express.js, MongoDB, JWT**

- [ ] Initialize Express app with folder structure above
- [ ] Connect MongoDB, set up Mongoose
- [ ] User model: `name`, `email`, `passwordHash`, `orgId`
- [ ] `POST /auth/signup` — hash password with bcrypt, return JWT pair
- [ ] `POST /auth/login` — verify password, return JWT pair
- [ ] `POST /auth/refresh` — validate refresh token, return new access token
- [ ] Auth middleware — verify JWT on every protected route, attach `req.user`
- [ ] Organization model + `POST /organizations` — create org, auto-add creator as Admin
- [ ] Org-scope middleware — every request reads `orgId` from `req.user`, attaches to `req.org`. **Every DB query must include `orgId`.**
- [ ] `POST /organizations/invite` — generate signed invite token, send email via Nodemailer
- [ ] `POST /organizations/join/:token` — validate token, add user to org with Member role
- [ ] RBAC middleware — check `req.user.role` against required role for the route

**React: Auth pages**
- [ ] Signup page
- [ ] Login page
- [ ] Invite accept page (reads token from URL, shows org name, prompts signup/login)
- [ ] Auth context — stores user + token, provides `useAuth()` hook
- [ ] Protected route wrapper — redirects to `/login` if no token

---

#### Week 2 — Projects + Tasks + Kanban

**Stack: React, Express, MongoDB, dnd-kit**

**Backend**
- [ ] Project model + CRUD routes (`/projects`)
- [ ] Task model + CRUD routes (`/tasks`)
- [ ] `GET /tasks?projectId=&sprintId=&status=&assigneeId=` — filtered task list
- [ ] ActivityLog — write a log entry on every task mutation (status change, reassign, priority edit, etc.)
- [ ] `GET /tasks/:id/activity` — return activity log for a task

**React: Core UI**
- [ ] Sidebar navigation — org name, project list, settings link
- [ ] Project creation modal
- [ ] Kanban board — columns per status (Todo, In Progress, In Review, Done)
- [ ] Drag-and-drop with dnd-kit — moving a card calls `PATCH /tasks/:id` with new status
- [ ] Task card — shows title, priority badge, assignee avatar, due date
- [ ] Task detail panel (slide-in sidebar) — all fields, activity log, subtasks, checklist
- [ ] List view — sortable table, inline status/assignee/priority editing
- [ ] Rich text editor for task description (use Quill or TipTap)

---

### Phase 2 — Collaboration & Sprints
**Timeline: Weeks 3–4**

The product becomes usable by a real team this phase.

#### Week 3 — Sprints + Backlog + Burndown

**Stack: React, Express, MongoDB, Recharts**

**Backend**
- [ ] Sprint model + CRUD routes (`/sprints`)
- [ ] `POST /sprints/:id/close` — mark sprint complete, write `SprintHistory` document, move incomplete tasks to backlog
- [ ] Backlog query — `GET /tasks?projectId=&sprintId=null`
- [ ] Burndown data endpoint — `GET /sprints/:id/burndown` — returns `{ date, remainingPoints }[]` computed from task completions

**React**
- [ ] Sprint panel — create sprint with name, goal, start/end dates
- [ ] Sprint board — same Kanban view but filtered to current sprint
- [ ] Backlog view — list of unassigned tasks, drag to assign to sprint
- [ ] Bulk select — checkbox + "Move to sprint" action
- [ ] Burndown chart (Recharts line chart) — ideal line vs actual remaining points
- [ ] "Close sprint" button — modal showing incomplete tasks, option to move them to backlog or next sprint

---

#### Week 4 — Comments, Notifications, Real-time, Filters

**Stack: React, Express, MongoDB, SSE**

**Backend**
- [ ] Comment model + routes (`POST /comments`, `GET /tasks/:id/comments`)
- [ ] @mention parser — extract `@username` from comment body, create Notification for each
- [ ] Notification routes — `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`
- [ ] SSE endpoint — `GET /sse` — client connects once, server pushes task update events for the org
- [ ] On any task mutation, emit SSE event `{ type: 'task_updated', taskId, changes }`
- [ ] Saved views — `POST /views`, `GET /views?projectId=` — store a named filter combo per project

**React**
- [ ] Comment thread in task detail panel — markdown rendering, submit on Cmd+Enter
- [ ] @mention autocomplete — type `@` to open member picker
- [ ] Bell icon in nav — badge shows unread count, dropdown shows notification list
- [ ] SSE client — `EventSource` connection, updates board state on incoming events
- [ ] Filter bar above board/list — filter by assignee, priority, status, label, due date
- [ ] Save filter as named view — "Save view" button, named views appear in sidebar under the project

---

### Phase 3A — AI Instant Features
**Timeline: Weeks 5–6**

These features call Claude and work from day one with zero historical data.

**Stack: Node.js, Express, Anthropic Claude API**

All Claude calls go through `server/services/claude.js`. Use `tool_use` (structured output) for anything returning a number or list. Use text generation for explanations.

#### Backend — `server/routes/ai.js`

- [ ] `POST /ai/estimate-points` — accepts `{ title, description }`, returns `{ points: 5, reasoning: "..." }`

  ```
  Prompt: "You are a senior software engineer estimating story points using Fibonacci (1,2,3,5,8,13).
  Task: {title}. Description: {description}.
  Return JSON: { points: number, reasoning: string }"
  ```

- [ ] `GET /ai/sprint-risk/:sprintId` — computes risk score 0–100

  ```
  Inputs: incompleteRatio, daysRemaining, avgPointsPerDay
  Prompt: "Given sprint data: {data}, return JSON: { score: number, level: 'low'|'medium'|'high', explanation: string }"
  ```

- [ ] `GET /ai/delays/:projectId` — returns tasks at risk of missing deadline

  ```
  Logic: tasks where dueDate < today + 2 days and status != 'done'
  Claude adds explanation per task
  ```

- [ ] `GET /ai/workload/:orgId` — returns `{ userId, name, openPoints }[]` — computed from DB, no Claude needed

- [ ] `GET /ai/bottlenecks/:projectId` — tasks stuck in "In Review" or "Blocked" for 3+ days, with Claude explanation

- [ ] `GET /ai/suggest-assignee/:taskId` — ranks team members by current open point load, returns sorted list

#### React — AI Dashboard page

- [ ] Sprint risk card — score gauge (0–100), level badge, Claude explanation, shown on sprint view
- [ ] Delay detection panel — list of at-risk tasks with reason, click to open task
- [ ] Workload distribution — horizontal bar chart (Recharts), one bar per team member, shows open points
- [ ] Bottleneck list — tasks flagged with days stuck + explanation
- [ ] Assignment suggester — shown in "Create task" modal, "Who has capacity?" section with ranked member list
- [ ] Story point estimator — shown in task detail, "Estimate with AI" button next to story points field

---

### Phase 3B — AI Data-Gated Features
**Timeline: Weeks 5–6, parallel with 3A**

These features need sprint history. They show demo data below the threshold and real data above it.

#### How the gate works

```
For each gated feature:
  if (realSprintCount >= threshold) → use real SprintHistory data
  else → use seeded demo data, show "Demo mode" badge
```

The progress bar UI is a persistent banner in the AI dashboard:

```
[ ████░░░░░░ ]  2 of 5 sprints completed
Complete 3 more sprints to unlock Velocity Tracking with your real data.
```

Copy rule: always say "Complete N sprints" not "Upgrade". This is a data gate, not a paywall.

#### Seed script — `server/services/seed.js`

Run once on new org creation. Generates:
- 6 synthetic sprints with varying completion rates (one overrun, one great, four mixed)
- 3 fake team members with different workload patterns
- Realistic task names in a software context
- One member with trailing productivity (makes the trends feature obviously useful)

```bash
node server/services/seed.js --orgId <id>
```

#### Gated Features

**Velocity Tracking** — gated at 3 completed sprints
- [ ] `GET /ai/velocity/:projectId` — returns `{ sprintName, plannedPoints, completedPoints }[]`
- [ ] Line chart (Recharts) — planned vs completed per sprint
- [ ] Demo: 6 seeded sprints shown with "Demo mode" badge

**Productivity Trends** — gated at 4 weeks of activity
- [ ] `GET /ai/productivity/:orgId` — task completion rate per member per week
- [ ] Area chart per member — one line per team member over 8 weeks
- [ ] Demo: realistic pattern with one underperforming member visible

**Sprint Retrospective AI** — gated at 2 completed sprints
- [ ] Triggered automatically when sprint is closed via `POST /sprints/:id/close`
- [ ] Claude reads: task list, completion rate, comments, blockers, velocity delta vs previous sprint
- [ ] Returns: 3-paragraph plain-English retrospective (what went well, what didn't, what to try next)
- [ ] Written to `SprintHistory.retrospectiveSummary`, shown in "Past Sprints" view
- [ ] Editable before sharing

**Prioritization Suggestions** — gated at 3 completed sprints
- [ ] `GET /ai/prioritize/:sprintId` — Claude suggests reordering based on due dates, dependencies, historical completion rate
- [ ] Returns: `{ suggestions: [{ taskId, reason, suggestedPriority }] }`
- [ ] Shown as a dismissible card in the sprint view — "Consider moving these tasks up"
- [ ] Never auto-applied, always a suggestion

---

### Phase 4 — Polish & Ship
**Timeline: Weeks 7–8**

#### Week 7 — Polish

- [ ] Calendar view — monthly calendar, tasks plotted by due date, color-coded by priority
- [ ] Keyboard shortcuts — `C` create task, `Esc` close panel, `/` focus search, `?` shortcut help modal
- [ ] Email notifications — daily digest (tasks due today), assigned notification via Nodemailer
- [ ] Empty states — every list/board has a helpful empty state, not just a blank space
- [ ] Mobile responsiveness — list view and task detail must be usable on mobile
- [ ] Loading skeletons — replace all loading spinners with skeleton screens

#### Week 8 — Testing + Deploy

**Testing**
- [ ] Unit tests for AI scoring logic (sprint risk score algorithm, delay detection logic)
- [ ] Integration tests: auth flow (signup → login → refresh), task CRUD, sprint close + SprintHistory write
- [ ] Use Jest + Supertest for backend, React Testing Library for frontend

**Deploy**
- [ ] Frontend → Vercel. Connect GitHub repo, set env vars.
- [ ] Backend + MongoDB → Railway. One service for Express, one for MongoDB.
- [ ] Env secrets audit — confirm no secrets in source code, all via `.env`
- [ ] Set up a `main` (production) and `dev` (staging) branch with auto-deploy on push

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/taskflow-ai.git
cd taskflow-ai

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Set up environment variables
cp server/.env.example server/.env
# Fill in your values

# Run backend (port 5000)
cd server && npm run dev

# Run frontend (port 3000)
cd client && npm run dev
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production — auto-deploys to Vercel + Railway |
| `dev` | Staging — all PRs merge here first |
| `feature/phase-1-auth` | Feature branches — named by phase and feature |

PRs require one review before merging to `dev`. Never push directly to `main`.

---

## Demo Org

On first signup, the server auto-creates a pre-seeded demo project for the new organization. It contains:
- A live active sprint with realistic tasks in various states
- 6 past sprints of history (seeds all gated AI features immediately)
- 3 demo team members with different workload patterns

This eliminates the cold-start problem. New users see the full product — including all AI features — before they've added a single real task.
