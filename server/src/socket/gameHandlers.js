const { v4: uuidv4 } = require('uuid');
const { 
  getGameSession, 
  setGameSession, 
  getGameByPin,
  setPlayerSession,
  getPlayerSession,
  updateLeaderboard,
  getLeaderboard,
} = require('../config/redis');
const { supabaseService } = require('../services/supabaseService');
const { broadcastToGame, broadcastToHost } = require('../config/socket');

// Handle player joining a game
const handleJoinGame = async (socket, data, callback) => {
  try {
    const { gamePin } = data;
    
    if (!gamePin || gamePin.length !== 6) {
      return callback({ 
        success: false, 
        message: 'Invalid game PIN' 
      });
    }

    // Check if game exists and is active
    const gameId = await getGameByPin(gamePin);
    let gameData = null;
    
    if (gameId) {
      // Get from Redis cache first
      gameData = await getGameSession(gameId);
    }
    
    if (!gameData) {
      // Fallback to database
      try {
        gameData = await supabaseService.getGameByPin(gamePin);
        if (gameData) {
          // Cache in Redis
          await setGameSession(gameData.id, gameData);
        }
      } catch (error) {
        console.error('Error fetching game from database:', error);
      }
    }

    if (!gameData) {
      return callback({ 
        success: false, 
        message: 'Game not found or has ended' 
      });
    }

    if (gameData.status !== 'waiting' && gameData.status !== 'active') {
      return callback({ 
        success: false, 
        message: 'Game is not accepting new players' 
      });
    }

    // Check player limit
    const currentPlayers = gameData.players ? gameData.players.length : 0;
    const maxPlayers = gameData.max_players || 200;
    
    if (currentPlayers >= maxPlayers) {
      return callback({ 
        success: false, 
        message: 'Game is full' 
      });
    }

    // Join socket to game room
    socket.join(`game:${gameData.id}`);
    socket.gameId = gameData.id;
    
    // Send success response with game info
    callback({ 
      success: true, 
      gameId: gameData.id,
      quizTitle: gameData.quizzes?.title || 'Quiz',
      quizBackground: gameData.quizzes?.background_value,
      gameMode: gameData.game_mode || 'dual_screen',
      players: gameData.players || [],
      status: gameData.status,
    });

    console.log(`✅ Player ${socket.id} joined game ${gameData.id} (PIN: ${gamePin})`);

  } catch (error) {
    console.error('Error in handleJoinGame:', error);
    callback({ 
      success: false, 
      message: 'Failed to join game' 
    });
  }
};

// Handle player leaving a game
const handleLeaveGame = async (socket, data, callback) => {
  try {
    const gameId = socket.gameId;
    const playerId = socket.playerId;
    
    if (!gameId) {
      return callback({ success: true }); // Already not in a game
    }

    // Remove player from game
    if (playerId) {
      await removePlayerFromGame(gameId, playerId);
      
      // Notify other players
      socket.to(`game:${gameId}`).emit('player-left', {
        playerId,
        playerName: socket.playerName,
        totalPlayers: await getGamePlayerCount(gameId),
      });
    }

    // Leave socket room
    socket.leave(`game:${gameId}`);
    
    // Clean up socket data
    delete socket.gameId;
    delete socket.playerId;
    delete socket.playerName;

    callback({ success: true });
    
    console.log(`👋 Player ${socket.id} left game ${gameId}`);

  } catch (error) {
    console.error('Error in handleLeaveGame:', error);
    callback({ 
      success: false, 
      message: 'Failed to leave game' 
    });
  }
};

// Add player to game session
const addPlayerToGame = async (gameId, playerData) => {
  try {
    // Get current game session
    let gameSession = await getGameSession(gameId);
    
    if (!gameSession) {
      // Load from database if not in cache
      gameSession = await supabaseService.getGame(gameId);
      if (!gameSession) {
        throw new Error('Game not found');
      }
    }

    // Initialize players array if not exists
    if (!gameSession.players) {
      gameSession.players = [];
    }

    // Check if player already exists
    const existingPlayerIndex = gameSession.players.findIndex(
      p => p.id === playerData.id
    );

    if (existingPlayerIndex >= 0) {
      // Update existing player
      gameSession.players[existingPlayerIndex] = {
        ...gameSession.players[existingPlayerIndex],
        ...playerData,
        last_activity: new Date().toISOString(),
      };
    } else {
      // Add new player
      gameSession.players.push({
        ...playerData,
        joined_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      });
    }

    // Update session in Redis
    await setGameSession(gameId, gameSession);

    // Also update in database
    try {
      await supabaseService.createOrUpdatePlayer(gameId, playerData);
    } catch (dbError) {
      console.error('Error updating player in database:', dbError);
      // Continue even if database update fails
    }

    return gameSession.players;

  } catch (error) {
    console.error('Error adding player to game:', error);
    throw error;
  }
};

// Remove player from game session
const removePlayerFromGame = async (gameId, playerId) => {
  try {
    // Get current game session
    let gameSession = await getGameSession(gameId);
    
    if (!gameSession || !gameSession.players) {
      return;
    }

    // Remove player from session
    gameSession.players = gameSession.players.filter(
      p => p.id !== playerId
    );

    // Update session in Redis
    await setGameSession(gameId, gameSession);

    // Update in database
    try {
      await supabaseService.removePlayer(playerId);
    } catch (dbError) {
      console.error('Error removing player from database:', dbError);
    }

    return gameSession.players;

  } catch (error) {
    console.error('Error removing player from game:', error);
    throw error;
  }
};

// Get game player count
const getGamePlayerCount = async (gameId) => {
  try {
    const gameSession = await getGameSession(gameId);
    return gameSession?.players?.length || 0;
  } catch (error) {
    console.error('Error getting player count:', error);
    return 0;
  }
};

// Handle player disconnection
const handlePlayerDisconnection = async (socket) => {
  try {
    const gameId = socket.gameId;
    const playerId = socket.playerId;
    const playerName = socket.playerName;

    if (!gameId || !playerId) return;

    // Remove player from game
    const remainingPlayers = await removePlayerFromGame(gameId, playerId);

    // Notify other players
    socket.to(`game:${gameId}`).emit('player-left', {
      playerId,
      playerName,
      reason: 'disconnected',
      totalPlayers: remainingPlayers.length,
      players: remainingPlayers,
    });

    // Notify host
    broadcastToHost(gameId, 'player-disconnected', {
      playerId,
      playerName,
      totalPlayers: remainingPlayers.length,
    });

    console.log(`🔌 Player ${playerName} (${playerId}) disconnected from game ${gameId}`);

  } catch (error) {
    console.error('Error handling player disconnection:', error);
  }
};

// Get game information
const getGameInfo = async (gameId) => {
  try {
    if (!gameId) return null;

    // Try Redis cache first
    let gameData = await getGameSession(gameId);
    
    if (!gameData) {
      // Fallback to database
      gameData = await supabaseService.getGame(gameId);
      if (gameData) {
        await setGameSession(gameId, gameData);
      }
    }

    return gameData;

  } catch (error) {
    console.error('Error getting game info:', error);
    return null;
  }
};

// Update game status
const updateGameStatus = async (gameId, status, additionalData = {}) => {
  try {
    // Update in Redis
    let gameSession = await getGameSession(gameId);
    if (gameSession) {
      gameSession.status = status;
      gameSession = { ...gameSession, ...additionalData };
      await setGameSession(gameId, gameSession);
    }

    // Update in database
    await supabaseService.updateGame(gameId, { 
      status, 
      ...additionalData 
    });

    return true;

  } catch (error) {
    console.error('Error updating game status:', error);
    return false;
  }
};

// Validate game PIN format
const isValidGamePin = (pin) => {
  return typeof pin === 'string' && 
         pin.length === 6 && 
         /^\d{6}$/.test(pin);
};

// Check if player name is available in game
const isPlayerNameAvailable = async (gameId, playerName, excludePlayerId = null) => {
  try {
    const gameSession = await getGameSession(gameId);
    
    if (!gameSession || !gameSession.players) {
      return true;
    }

    const existingPlayer = gameSession.players.find(
      p => p.nickname.toLowerCase() === playerName.toLowerCase() && 
           p.id !== excludePlayerId
    );

    return !existingPlayer;

  } catch (error) {
    console.error('Error checking player name availability:', error);
    return false;
  }
};

// Get game leaderboard
const getGameLeaderboard = async (gameId, limit = 10) => {
  try {
    // Try Redis cache first
    const leaderboard = await getLeaderboard(gameId, limit);
    
    if (leaderboard.length > 0) {
      return leaderboard;
    }

    // Fallback to calculating from game session
    const gameSession = await getGameSession(gameId);
    if (gameSession && gameSession.players) {
      const sortedPlayers = gameSession.players
        .filter(p => p.score !== undefined)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((player, index) => ({
          rank: index + 1,
          id: player.id,
          name: player.nickname,
          score: player.score,
        }));

      return sortedPlayers;
    }

    return [];

  } catch (error) {
    console.error('Error getting game leaderboard:', error);
    return [];
  }
};

module.exports = {
  handleJoinGame,
  handleLeaveGame,
  addPlayerToGame,
  removePlayerFromGame,
  getGamePlayerCount,
  handlePlayerDisconnection,
  getGameInfo,
  updateGameStatus,
  isValidGamePin,
  isPlayerNameAvailable,
  getGameLeaderboard,
};