const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { addClient } = require('./services/sse');
const { initTransporter } = require('./services/email');
const authMiddleware = require('./middleware/authMiddleware');

dotenv.config();

const app = express();

// ── CORS — supports comma-separated CLIENT_URL and Vercel preview deploys ──
const allowedOrigins = (process.env.CLIENT_URL || 'https://taskflow-ai-ruddy-nine.vercel.app')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow exact matches from CLIENT_URL
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any Vercel preview deployment for this project
    if (origin.match(/^https:\/\/taskflow-ai.*\.vercel\.app$/)) return callback(null, true);
    // Allow localhost during development
    if (origin.match(/^http:\/\/localhost:\d+$/)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'TaskFlow AI Backend', timestamp: new Date().toISOString() });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE endpoint for real-time updates
app.get('/api/sse', authMiddleware, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Register client for org-scoped broadcasts
  const orgId = req.user.organizationId?.toString();
  if (orgId) {
    addClient(orgId, res);
  }

  // Keep alive ping every 30s
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/sprints', require('./routes/sprintRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Error handler
app.use(errorHandler);

// Initialize email service
initTransporter();

// Start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TaskFlow AI server running on port ${PORT}`);
    console.log(`📡 SSE endpoint: /api/sse`);
    console.log(`🧠 AI Engine: Self-learning (rule-based → data-trained)`);
    console.log(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
  });
});

module.exports = app;
