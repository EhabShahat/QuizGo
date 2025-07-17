const gameHandlers = require('./gameHandlers');
const playerHandlers = require('./playerHandlers');
const hostHandlers = require('./hostHandlers');

// Main socket event handler setup
const setupSocketHandlers = (socket) => {
  console.log(`🔌 Setting up handlers for socket: ${socket.id}`);

  // Game-related events
  socket.on('join-game', async (data, callback) => {
    try {
      await gameHandlers.handleJoinGame(socket, data, callback);
    } catch (error) {
      console.error('Error in join-game handler:', error);
      callback({ success: false, message: 'Failed to join game' });
    }
  });

  socket.on('leave-game', async (data, callback) => {
    try {
      await gameHandlers.handleLeaveGame(socket, data, callback);
    } catch (error) {
      console.error('Error in leave-game handler:', error);
      callback({ success: false, message: 'Failed to leave game' });
    }
  });

  // Player-related events
  socket.on('set-player-name', async (data, callback) => {
    try {
      await playerHandlers.handleSetPlayerName(socket, data, callback);
    } catch (error) {
      console.error('Error in set-player-name handler:', error);
      callback({ success: false, message: 'Failed to set player name' });
    }
  });

  socket.on('submit-answer', async (data, callback) => {
    try {
      await playerHandlers.handleSubmitAnswer(socket, data, callback);
    } catch (error) {
      console.error('Error in submit-answer handler:', error);
      callback({ success: false, message: 'Failed to submit answer' });
    }
  });

  socket.on('player-ready', async (data, callback) => {
    try {
      await playerHandlers.handlePlayerReady(socket, data, callback);
    } catch (error) {
      console.error('Error in player-ready handler:', error);
      callback({ success: false, message: 'Failed to set player ready' });
    }
  });

  // Host-related events
  socket.on('create-game', async (data, callback) => {
    try {
      await hostHandlers.handleCreateGame(socket, data, callback);
    } catch (error) {
      console.error('Error in create-game handler:', error);
      callback({ success: false, message: 'Failed to create game' });
    }
  });

  socket.on('start-game', async (data, callback) => {
    try {
      await hostHandlers.handleStartGame(socket, data, callback);
    } catch (error) {
      console.error('Error in start-game handler:', error);
      callback({ success: false, message: 'Failed to start game' });
    }
  });

  socket.on('next-question', async (data, callback) => {
    try {
      await hostHandlers.handleNextQuestion(socket, data, callback);
    } catch (error) {
      console.error('Error in next-question handler:', error);
      callback({ success: false, message: 'Failed to advance question' });
    }
  });

  socket.on('show-results', async (data, callback) => {
    try {
      await hostHandlers.handleShowResults(socket, data, callback);
    } catch (error) {
      console.error('Error in show-results handler:', error);
      callback({ success: false, message: 'Failed to show results' });
    }
  });

  socket.on('end-game', async (data, callback) => {
    try {
      await hostHandlers.handleEndGame(socket, data, callback);
    } catch (error) {
      console.error('Error in end-game handler:', error);
      callback({ success: false, message: 'Failed to end game' });
    }
  });

  socket.on('pause-game', async (data, callback) => {
    try {
      await hostHandlers.handlePauseGame(socket, data, callback);
    } catch (error) {
      console.error('Error in pause-game handler:', error);
      callback({ success: false, message: 'Failed to pause game' });
    }
  });

  socket.on('resume-game', async (data, callback) => {
    try {
      await hostHandlers.handleResumeGame(socket, data, callback);
    } catch (error) {
      console.error('Error in resume-game handler:', error);
      callback({ success: false, message: 'Failed to resume game' });
    }
  });

  socket.on('kick-player', async (data, callback) => {
    try {
      await hostHandlers.handleKickPlayer(socket, data, callback);
    } catch (error) {
      console.error('Error in kick-player handler:', error);
      callback({ success: false, message: 'Failed to kick player' });
    }
  });

  // Utility events
  socket.on('ping', (callback) => {
    callback({ success: true, timestamp: Date.now() });
  });

  socket.on('get-game-info', async (data, callback) => {
    try {
      const gameInfo = await gameHandlers.getGameInfo(socket.gameId);
      callback({ success: true, data: gameInfo });
    } catch (error) {
      console.error('Error getting game info:', error);
      callback({ success: false, message: 'Failed to get game info' });
    }
  });

  // Debug events (only in development)
  if (process.env.NODE_ENV === 'development') {
    socket.on('debug-info', (callback) => {
      callback({
        success: true,
        data: {
          socketId: socket.id,
          gameId: socket.gameId,
          playerId: socket.playerId,
          playerName: socket.playerName,
          isHost: socket.isHost,
          rooms: Array.from(socket.rooms),
        },
      });
    });
  }

  // Generic error handler
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
    socket.emit('error', {
      message: 'Socket error occurred',
      timestamp: Date.now(),
    });
  });

  // Log all events in development
  if (process.env.NODE_ENV === 'development') {
    socket.onAny((eventName, ...args) => {
      console.log(`📡 Event: ${eventName} from ${socket.id}`, 
        args.length > 0 ? args[0] : '');
    });
  }
};

// Handle socket disconnection cleanup
const handleDisconnection = async (socket, reason) => {
  console.log(`🔌 Handling disconnection for ${socket.id}, reason: ${reason}`);

  try {
    // Player disconnection cleanup
    if (socket.gameId && socket.playerId && !socket.isHost) {
      await gameHandlers.handlePlayerDisconnection(socket);
    }

    // Host disconnection cleanup
    if (socket.gameId && socket.isHost) {
      await hostHandlers.handleHostDisconnection(socket);
    }

    // Clean up socket data
    delete socket.gameId;
    delete socket.playerId;
    delete socket.playerName;
    delete socket.isHost;

  } catch (error) {
    console.error('Error during disconnection cleanup:', error);
  }
};

// Middleware for socket authentication
const authenticateSocket = (socket, next) => {
  // Add authentication logic here if needed
  // For now, allow all connections
  next();
};

// Middleware for rate limiting
const rateLimitSocket = (socket, next) => {
  const clientIp = socket.handshake.address;
  
  // Simple rate limiting logic
  // In production, use Redis for distributed rate limiting
  if (isSocketRateLimited(clientIp)) {
    return next(new Error('Rate limit exceeded'));
  }
  
  next();
};

// Rate limiting helper
const socketConnections = new Map();
const SOCKET_RATE_LIMIT = 5; // connections per minute
const SOCKET_WINDOW_MS = 60000;

const isSocketRateLimited = (clientIp) => {
  const now = Date.now();
  const windowStart = now - SOCKET_WINDOW_MS;
  
  if (!socketConnections.has(clientIp)) {
    socketConnections.set(clientIp, []);
  }
  
  const connections = socketConnections.get(clientIp);
  const recentConnections = connections.filter(time => time > windowStart);
  
  socketConnections.set(clientIp, recentConnections);
  
  if (recentConnections.length >= SOCKET_RATE_LIMIT) {
    return true;
  }
  
  recentConnections.push(now);
  return false;
};

// Clean up old rate limit data periodically
setInterval(() => {
  const now = Date.now();
  const cutoff = now - SOCKET_WINDOW_MS;
  
  for (const [ip, connections] of socketConnections.entries()) {
    const recentConnections = connections.filter(time => time > cutoff);
    
    if (recentConnections.length === 0) {
      socketConnections.delete(ip);
    } else {
      socketConnections.set(ip, recentConnections);
    }
  }
}, SOCKET_WINDOW_MS);

module.exports = {
  setupSocketHandlers,
  handleDisconnection,
  authenticateSocket,
  rateLimitSocket,
};