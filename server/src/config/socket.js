const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getRedisClient, getPubClient, getSubClient } = require('./redis');
const gameHandlers = require('../socket/gameHandlers');
const playerHandlers = require('../socket/playerHandlers');
const hostHandlers = require('../socket/hostHandlers');

let io = null;

const initializeSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    allowEIO3: true,
  });

  // Redis adapter for scaling (if Redis is available)
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      const pubClient = getPubClient();
      const subClient = getSubClient();
      
      if (pubClient && subClient) {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Socket.io Redis adapter configured');
      } else {
        console.warn('⚠️  Redis pub/sub clients not available, creating fallback clients');
        const fallbackPubClient = redisClient.duplicate();
        const fallbackSubClient = redisClient.duplicate();
        await fallbackPubClient.connect();
        await fallbackSubClient.connect();
        io.adapter(createAdapter(fallbackPubClient, fallbackSubClient));
        console.log('✅ Socket.io Redis adapter configured with fallback clients');
      }
    } catch (error) {
      console.warn('⚠️  Socket.io running without Redis adapter:', error.message);
    }
  }

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Track connection metrics
    incrementConnectionCount();

    // Set up event handlers
    setupEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
      handleDisconnection(socket, reason);
      decrementConnectionCount();
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });
  });

  // Middleware for rate limiting
  io.use((socket, next) => {
    const clientIp = socket.handshake.address;
    
    // Simple rate limiting (can be enhanced with Redis)
    if (isRateLimited(clientIp)) {
      return next(new Error('Rate limit exceeded'));
    }
    
    next();
  });

  // Middleware for authentication (optional)
  io.use((socket, next) => {
    // Add authentication logic here if needed
    next();
  });

  return io;
};

const setupEventHandlers = (socket) => {
  // Game events
  socket.on('join-game', (data, callback) => {
    gameHandlers.handleJoinGame(socket, data, callback);
  });

  socket.on('leave-game', (data, callback) => {
    gameHandlers.handleLeaveGame(socket, data, callback);
  });

  // Player events
  socket.on('set-player-name', (data, callback) => {
    playerHandlers.handleSetPlayerName(socket, data, callback);
  });

  socket.on('submit-answer', (data, callback) => {
    playerHandlers.handleSubmitAnswer(socket, data, callback);
  });

  socket.on('player-ready', (data, callback) => {
    playerHandlers.handlePlayerReady(socket, data, callback);
  });

  // Host events
  socket.on('create-game', (data, callback) => {
    hostHandlers.handleCreateGame(socket, data, callback);
  });

  socket.on('start-game', (data, callback) => {
    hostHandlers.handleStartGame(socket, data, callback);
  });

  socket.on('next-question', (data, callback) => {
    hostHandlers.handleNextQuestion(socket, data, callback);
  });

  socket.on('show-results', (data, callback) => {
    hostHandlers.handleShowResults(socket, data, callback);
  });

  socket.on('end-game', (data, callback) => {
    hostHandlers.handleEndGame(socket, data, callback);
  });

  socket.on('pause-game', (data, callback) => {
    hostHandlers.handlePauseGame(socket, data, callback);
  });

  socket.on('resume-game', (data, callback) => {
    hostHandlers.handleResumeGame(socket, data, callback);
  });

  socket.on('kick-player', (data, callback) => {
    hostHandlers.handleKickPlayer(socket, data, callback);
  });

  // Generic event handler for debugging
  socket.onAny((eventName, ...args) => {
    console.log(`📡 Event received: ${eventName} from ${socket.id}`);
  });
};

const handleDisconnection = async (socket, reason) => {
  try {
    // Clean up player from any active games
    const gameId = socket.gameId;
    const playerId = socket.playerId;
    
    if (gameId && playerId) {
      // Notify other players
      socket.to(`game:${gameId}`).emit('player-left', {
        playerId,
        playerName: socket.playerName,
        reason: 'disconnected',
      });

      // Update game session
      await gameHandlers.removePlayerFromGame(gameId, playerId);
    }

    // Clean up host games
    if (socket.isHost && gameId) {
      // Notify players that host disconnected
      socket.to(`game:${gameId}`).emit('host-disconnected', {
        message: 'Host has disconnected. Game will end shortly.',
      });

      // End the game after a delay
      setTimeout(() => {
        io.to(`game:${gameId}`).emit('game-ended', {
          reason: 'host_disconnected',
          message: 'Game ended due to host disconnection',
        });
      }, 5000);
    }
  } catch (error) {
    console.error('Error handling disconnection:', error);
  }
};

// Rate limiting helpers
const connectionCounts = new Map();
const CONNECTION_LIMIT = 10; // per IP per minute
const WINDOW_MS = 60000; // 1 minute

const isRateLimited = (clientIp) => {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  
  if (!connectionCounts.has(clientIp)) {
    connectionCounts.set(clientIp, []);
  }
  
  const connections = connectionCounts.get(clientIp);
  
  // Remove old connections
  const recentConnections = connections.filter(time => time > windowStart);
  connectionCounts.set(clientIp, recentConnections);
  
  // Check if limit exceeded
  if (recentConnections.length >= CONNECTION_LIMIT) {
    return true;
  }
  
  // Add current connection
  recentConnections.push(now);
  return false;
};

// Connection metrics
let activeConnections = 0;

const incrementConnectionCount = () => {
  activeConnections++;
  console.log(`📊 Active connections: ${activeConnections}`);
};

const decrementConnectionCount = () => {
  activeConnections = Math.max(0, activeConnections - 1);
  console.log(`📊 Active connections: ${activeConnections}`);
};

const getActiveConnectionCount = () => {
  return activeConnections;
};

// Utility functions for broadcasting
const broadcastToGame = (gameId, event, data) => {
  if (io) {
    io.to(`game:${gameId}`).emit(event, data);
  }
};

const broadcastToHost = (gameId, event, data) => {
  if (io) {
    io.to(`host:${gameId}`).emit(event, data);
  }
};

const broadcastToPlayer = (playerId, event, data) => {
  if (io) {
    io.to(`player:${playerId}`).emit(event, data);
  }
};

// Staggered broadcasting for large groups
const staggeredBroadcast = async (gameId, event, data, batchSize = 50) => {
  if (!io) return;
  
  try {
    const sockets = await io.in(`game:${gameId}`).fetchSockets();
    
    for (let i = 0; i < sockets.length; i += batchSize) {
      const batch = sockets.slice(i, i + batchSize);
      
      batch.forEach(socket => {
        socket.emit(event, data);
      });
      
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < sockets.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  } catch (error) {
    console.error('Error in staggered broadcast:', error);
    // Fallback to regular broadcast
    io.to(`game:${gameId}`).emit(event, data);
  }
};

const getSocketIO = () => io;

module.exports = {
  initializeSocket,
  getSocketIO,
  broadcastToGame,
  broadcastToHost,
  broadcastToPlayer,
  staggeredBroadcast,
  getActiveConnectionCount,
};