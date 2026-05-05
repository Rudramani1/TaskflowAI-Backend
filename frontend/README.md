# TaskFlow AI — Frontend 🎨

The frontend for **TaskFlow AI**, an intelligent, AI-powered project management platform. This is a modern single-page application (SPA) built to deliver a highly responsive and interactive user experience.

## Tech Stack
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS (v4)
- **Routing:** React Router DOM
- **State & Data Fetching:** Axios
- **Drag & Drop:** `@dnd-kit/core` & `@dnd-kit/sortable` (for Kanban boards)
- **Charts:** Recharts (for analytics and velocity charts)
- **Rich Text:** React Quill (for task descriptions and notes)

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 1. Install Dependencies
Navigate to the `frontend` directory and install the required packages:
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root of the `frontend` directory based on the example (if available) or add the backend URL:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run the Development Server
Start the Vite development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

## Scripts

- `npm run dev`: Starts the local development server with hot-module replacement (HMR).
- `npm run build`: Builds the application for production into the `dist/` directory.
- `npm run preview`: Previews the production build locally.

## Project Structure
- `src/components/` - Reusable UI components (buttons, modals, etc.)
- `src/pages/` - Main views and layouts (Dashboard, Kanban Board, Analytics)
- `src/context/` - React Context providers (AuthContext, ThemeContext)
- `src/services/` - Axios API integration layer
- `src/assets/` - Static files like images and icons

## Features
- **Interactive Kanban Boards:** Seamless drag-and-drop task management powered by `dnd-kit`.
- **AI Analytics Dashboards:** Visual representations of team velocity, sprint risks, and workload using `Recharts`.
- **Real-time Sync:** Connected to the backend via Server-Sent Events (SSE) for real-time task updates.
- **Rich Text Editing:** Full rich-text support for task descriptions using `React Quill`.
