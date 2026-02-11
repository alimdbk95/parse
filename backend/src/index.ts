import dotenv from 'dotenv';
dotenv.config({ override: true }); // Load env vars BEFORE any other imports, override existing

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import analysisRoutes from './routes/analyses.js';
import chartRoutes from './routes/charts.js';
import workspaceRoutes from './routes/workspaces.js';
import settingsRoutes from './routes/settings.js';
import compareRoutes from './routes/compare.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

export const prisma = new PrismaClient();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://parse-je1m.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed!))) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now during debugging
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/analyses', analysisRoutes);
app.use('/api/charts', chartRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/compare', compareRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error: any) {
    console.error('Database health check failed:', error?.message);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error?.message || 'Unknown error',
      host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'
    });
  }
});

// Global error handler - catches multer and other middleware errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler caught:', err);
  console.error('Error name:', err?.name);
  console.error('Error message:', err?.message);
  console.error('Error code:', err?.code);
  console.error('Error stack:', err?.stack);

  // Multer errors
  if (err?.name === 'MulterError') {
    return res.status(400).json({
      error: 'File upload error',
      details: err.message,
      code: err.code
    });
  }

  // File filter errors
  if (err?.message?.includes('File type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      details: err.message
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    details: err?.message || 'Unknown error',
    name: err?.name
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a workspace room
  socket.on('join-workspace', (workspaceId: string) => {
    socket.join(`workspace:${workspaceId}`);
    console.log(`Socket ${socket.id} joined workspace:${workspaceId}`);
  });

  // Join an analysis room
  socket.on('join-analysis', (analysisId: string) => {
    socket.join(`analysis:${analysisId}`);
    console.log(`Socket ${socket.id} joined analysis:${analysisId}`);
  });

  // Leave rooms
  socket.on('leave-workspace', (workspaceId: string) => {
    socket.leave(`workspace:${workspaceId}`);
  });

  socket.on('leave-analysis', (analysisId: string) => {
    socket.leave(`analysis:${analysisId}`);
  });

  // Presence tracking
  socket.on('user-active', (data: { workspaceId: string; userId: string; userName: string }) => {
    socket.to(`workspace:${data.workspaceId}`).emit('user-presence', {
      type: 'active',
      userId: data.userId,
      userName: data.userName,
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Parse API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
