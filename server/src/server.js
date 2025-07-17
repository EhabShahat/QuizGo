const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initializeSocket } = require('./config/socket');
const { connectRedis } = require('./config/redis');
const gameRoutes = require('./routes/games');
const quizRoutes = require('./routes/quizzes');
const playerRoutes = require('./routes/players');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
    },
  },
}));

app.use(compression());
app.use(morgan('combined'));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint for Railway
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version,
    services: {
      database: 'unknown',
      redis: 'unknown'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };

  try {
    // Test Supabase connection
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      const { error } = await supabase
        .from('quizzes')
        .select('count')
        .limit(1);
      
      healthCheck.services.database = error ? 'error' : 'healthy';
    } else {
      healthCheck.services.database = 'not_configured';
    }

    // Test Redis connection
    const { getRedisClient } = require('./config/redis');
    const redisClient = getRedisClient();
    
    if (redisClient) {
      try {
        await redisClient.ping();
        healthCheck.services.redis = 'healthy';
      } catch (error) {
        healthCheck.services.redis = 'error';
      }
    } else {
      healthCheck.services.redis = 'not_connected';
    }

    // Determine overall health
    const isHealthy = healthCheck.services.database !== 'error' && 
                     healthCheck.services.redis !== 'error';

    if (isHealthy) {
      res.status(200).json(healthCheck);
    } else {
      healthCheck.status = 'DEGRADED';
      res.status(503).json(healthCheck);
    }

  } catch (error) {
    healthCheck.status = 'ERROR';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});

// Readiness check (for Railway)
app.get('/ready', async (req, res) => {
  try {
    // Quick checks for essential services
    const checks = [];

    // Check if server is listening
    checks.push({ name: 'server', status: 'ready' });

    // Check environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
    const missingEnvVars = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missingEnvVars.length > 0) {
      return res.status(503).json({
        status: 'NOT_READY',
        message: `Missing environment variables: ${missingEnvVars.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }

    checks.push({ name: 'environment', status: 'ready' });

    res.status(200).json({
      status: 'READY',
      timestamp: new Date().toISOString(),
      checks
    });

  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check (simple ping)
app.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    message: 'pong'
  });
});

// API Routes
app.use('/api/games', gameRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/players', playerRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  
  res.status(error.status || 500).json({
    error: error.name || 'Internal Server Error',
    message: error.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Initialize services
async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();
    console.log('✅ Redis connected');

    // Initialize Socket.io
    const io = await initializeSocket(server);
    console.log('✅ Socket.io initialized');

    // Start server
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 QuizGo server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

module.exports = { app, server };