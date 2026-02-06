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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

httpServer.listen(PORT, () => {
  console.log(`Parse API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
