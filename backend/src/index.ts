import dotenv from 'dotenv';
dotenv.config({ override: true }); // Load env vars BEFORE any other imports, override existing

import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import morgan from 'morgan';
import { logger, morganStream, logError } from './utils/logger.js';
import { validateEnv } from './utils/validateEnv.js';

// Validate environment variables before anything else
try {
  validateEnv();
} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

// Initialize Sentry before other imports
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1, // Capture 10% of transactions for performance monitoring
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
    ],
  });
}

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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
import repositoryRoutes from './routes/repositories.js';
import searchRoutes from './routes/search.js';
import notificationRoutes from './routes/notifications.js';
import templateRoutes from './routes/templates.js';
import annotationRoutes from './routes/annotations.js';
import semanticRoutes from './routes/semantics.js';
import highlightRoutes from './routes/highlights.js';
import versionRoutes from './routes/versions.js';
import knowledgeGraphRoutes from './routes/knowledgeGraph.js';
import dataTableRoutes from './routes/dataTables.js';
import timelineRoutes from './routes/timelines.js';
import mediaRoutes from './routes/media.js';
import parameterRoutes from './routes/parameters.js';
import experimentRoutes from './routes/experiments.js';
import analyticsRoutes from './routes/analytics.js';

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

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// HTTP request logging
app.use(morgan('combined', { stream: morganStream }));

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
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
app.use('/uploads', express.static('uploads'));

// Rate limiting configuration
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/health', // Skip health checks
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Very strict rate limiting for password reset (prevent email spam)
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 password reset requests per hour
  message: { error: 'Too many password reset attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for AI/analysis endpoints (expensive operations)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 AI requests per minute
  message: { error: 'Too many AI requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: { error: 'Too many file uploads, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global rate limiter to all API routes
app.use('/api', globalLimiter);

// Apply stricter limits to specific routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/analyses/*/messages', aiLimiter);
app.use('/api/documents', uploadLimiter);

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
app.use('/api/repositories', repositoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/annotations', annotationRoutes);
app.use('/api/semantics', semanticRoutes);
app.use('/api/highlights', highlightRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/knowledge-graphs', knowledgeGraphRoutes);
app.use('/api/data-tables', dataTableRoutes);
app.use('/api/timelines', timelineRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/parameters', parameterRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Make io globally available for notifications
(global as any).io = io;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// S3 health check
app.get('/api/health/s3', (req, res) => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY || '';
  const bucket = process.env.AWS_S3_BUCKET || '';
  const region = process.env.AWS_REGION || '';

  res.json({
    status: accessKeyId && secretKey && bucket ? 'configured' : 'missing',
    region: region,
    bucket: bucket,
    accessKeyIdSet: !!accessKeyId,
    accessKeyIdLength: accessKeyId.length,
    accessKeyIdPrefix: accessKeyId.substring(0, 4),
    secretKeySet: !!secretKey,
    secretKeyLength: secretKey.length,
    // Check for common issues
    issues: [
      accessKeyId.includes(' ') ? 'Access key contains spaces' : null,
      secretKey.includes(' ') ? 'Secret key contains spaces' : null,
      accessKeyId.startsWith('"') || accessKeyId.endsWith('"') ? 'Access key has quotes' : null,
      secretKey.startsWith('"') || secretKey.endsWith('"') ? 'Secret key has quotes' : null,
      !accessKeyId.startsWith('AKIA') && accessKeyId.length > 0 ? 'Access key should start with AKIA' : null,
    ].filter(Boolean),
  });
});

// Database health check
app.get('/api/health/db', async (req, res) => {
  const dbUrl = process.env.DATABASE_URL || '';
  const hostPart = dbUrl.split('@')[1]?.split('/')[0] || 'unknown';
  const dbName = dbUrl.split('/').pop()?.split('?')[0] || 'unknown';

  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', host: hostPart });
  } catch (error: any) {
    console.error('Database health check failed:', error?.message);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error?.message || 'Unknown error',
      host: hostPart,
      dbName: dbName,
      urlSet: !!process.env.DATABASE_URL,
      urlLength: dbUrl.length
    });
  }
});

// Sentry error handler - must be before other error handlers
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler - catches multer and other middleware errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler caught:', err);
  console.error('Error name:', err?.name);
  console.error('Error message:', err?.message);
  console.error('Error code:', err?.code);
  console.error('Error stack:', err?.stack);

  // Capture error in Sentry (if not already captured by Sentry handler)
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, {
      extra: {
        url: req.url,
        method: req.method,
        body: req.body,
      },
    });
  }

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

// Socket.io connection handling with error handling
io.on('connection', (socket) => {
  logger.info('User connected', { socketId: socket.id });

  // Join a workspace room
  socket.on('join-workspace', (workspaceId: string) => {
    try {
      socket.join(`workspace:${workspaceId}`);
      logger.debug('Socket joined workspace', { socketId: socket.id, workspaceId });
    } catch (error) {
      logError('Socket join-workspace error', error, { socketId: socket.id, workspaceId });
      if (process.env.SENTRY_DSN) Sentry.captureException(error);
    }
  });

  // Join an analysis room
  socket.on('join-analysis', (analysisId: string) => {
    try {
      socket.join(`analysis:${analysisId}`);
      logger.debug('Socket joined analysis', { socketId: socket.id, analysisId });
    } catch (error) {
      logError('Socket join-analysis error', error, { socketId: socket.id, analysisId });
      if (process.env.SENTRY_DSN) Sentry.captureException(error);
    }
  });

  // Join user's personal notification room
  socket.on('join-user', (userId: string) => {
    try {
      socket.join(`user:${userId}`);
      logger.debug('Socket joined user room', { socketId: socket.id, userId });
    } catch (error) {
      logError('Socket join-user error', error, { socketId: socket.id, userId });
      if (process.env.SENTRY_DSN) Sentry.captureException(error);
    }
  });

  socket.on('leave-user', (userId: string) => {
    try {
      socket.leave(`user:${userId}`);
    } catch (error) {
      logError('Socket leave-user error', error, { socketId: socket.id, userId });
    }
  });

  // Leave rooms
  socket.on('leave-workspace', (workspaceId: string) => {
    try {
      socket.leave(`workspace:${workspaceId}`);
    } catch (error) {
      logError('Socket leave-workspace error', error, { socketId: socket.id, workspaceId });
    }
  });

  socket.on('leave-analysis', (analysisId: string) => {
    try {
      socket.leave(`analysis:${analysisId}`);
    } catch (error) {
      logError('Socket leave-analysis error', error, { socketId: socket.id, analysisId });
    }
  });

  // Presence tracking
  socket.on('user-active', (data: { workspaceId: string; userId: string; userName: string }) => {
    try {
      socket.to(`workspace:${data.workspaceId}`).emit('user-presence', {
        type: 'active',
        userId: data.userId,
        userName: data.userName,
      });
    } catch (error) {
      logError('Socket user-active error', error, { socketId: socket.id, data });
      if (process.env.SENTRY_DSN) Sentry.captureException(error);
    }
  });

  socket.on('disconnect', () => {
    logger.info('User disconnected', { socketId: socket.id });
  });

  // Handle socket errors
  socket.on('error', (error) => {
    logError('Socket error', error, { socketId: socket.id });
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`Parse API server running on port ${PORT}`);
});

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logError('Unhandled Promise Rejection', reason as Error, { promise: String(promise) });
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(reason);
  }
  // Don't exit - log and continue
});

process.on('uncaughtException', (error: Error) => {
  logError('Uncaught Exception', error);
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }
  // Give Sentry time to send the error, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown handlers
async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logError('Error during graceful shutdown', error as Error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
