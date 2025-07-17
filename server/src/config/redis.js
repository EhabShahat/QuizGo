const redis = require('redis');

let redisClient = null;
let pubClient = null;
let subClient = null;

const connectRedis = async () => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redisClusterNodes = process.env.REDIS_CLUSTER_NODES;
    
    // Configuration for Redis client
    const redisConfig = {
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
        connectTimeout: 10000,
        lazyConnect: true,
      },
      // Connection pooling for better performance
      isolationPoolOptions: {
        min: 2,
        max: 10,
      },
    };

    // Support for Redis Cluster if configured
    if (redisClusterNodes) {
      const clusterNodes = redisClusterNodes.split(',').map(node => node.trim());
      redisClient = redis.createCluster({
        rootNodes: clusterNodes.map(node => ({ url: node })),
        defaults: redisConfig,
      });
      console.log('🔗 Connecting to Redis Cluster:', clusterNodes);
    } else {
      redisClient = redis.createClient({
        url: redisUrl,
        ...redisConfig,
      });
      console.log('🔗 Connecting to Redis:', redisUrl);
    }

    // Event handlers
    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('🔌 Redis Client Connected');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis Client Ready');
    });

    redisClient.on('end', () => {
      console.log('🔌 Redis Client Disconnected');
    });

    redisClient.on('reconnecting', () => {
      console.log('🔄 Redis Client Reconnecting...');
    });

    await redisClient.connect();
    
    // Test connection
    await redisClient.ping();
    console.log('✅ Redis connection successful');

    // Create pub/sub clients for Socket.io adapter
    await createPubSubClients();
    
    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    
    // For development, continue without Redis
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️  Running without Redis in development mode');
      return null;
    }
    
    throw error;
  }
};

const createPubSubClients = async () => {
  try {
    if (!redisClient) return;

    // Create dedicated pub/sub clients for Socket.io
    pubClient = redisClient.duplicate();
    subClient = redisClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    console.log('✅ Redis pub/sub clients created for Socket.io adapter');
  } catch (error) {
    console.error('❌ Failed to create pub/sub clients:', error);
  }
};

const getRedisClient = () => {
  return redisClient;
};

const getPubClient = () => {
  return pubClient;
};

const getSubClient = () => {
  return subClient;
};

// Game session management
const setGameSession = async (gameId, sessionData, ttl = 3600) => {
  if (!redisClient) return;
  
  try {
    await redisClient.setEx(
      `game:${gameId}`, 
      ttl, 
      JSON.stringify(sessionData)
    );
  } catch (error) {
    console.error('Error setting game session:', error);
  }
};

const getGameSession = async (gameId) => {
  if (!redisClient) return null;
  
  try {
    const data = await redisClient.get(`game:${gameId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting game session:', error);
    return null;
  }
};

const deleteGameSession = async (gameId) => {
  if (!redisClient) return;
  
  try {
    await redisClient.del(`game:${gameId}`);
  } catch (error) {
    console.error('Error deleting game session:', error);
  }
};

// Enhanced game session utilities
const updateGameState = async (gameId, stateUpdate, ttl = 3600) => {
  if (!redisClient) return;
  
  try {
    const currentSession = await getGameSession(gameId);
    if (currentSession) {
      const updatedSession = { ...currentSession, ...stateUpdate };
      await setGameSession(gameId, updatedSession, ttl);
      return updatedSession;
    }
    return null;
  } catch (error) {
    console.error('Error updating game state:', error);
    return null;
  }
};

const addPlayerToGame = async (gameId, playerData) => {
  if (!redisClient) return;
  
  try {
    const gameSession = await getGameSession(gameId);
    if (gameSession) {
      if (!gameSession.players) {
        gameSession.players = {};
      }
      gameSession.players[playerData.id] = playerData;
      gameSession.playerCount = Object.keys(gameSession.players).length;
      await setGameSession(gameId, gameSession);
      return gameSession;
    }
    return null;
  } catch (error) {
    console.error('Error adding player to game:', error);
    return null;
  }
};

const removePlayerFromGame = async (gameId, playerId) => {
  if (!redisClient) return;
  
  try {
    const gameSession = await getGameSession(gameId);
    if (gameSession && gameSession.players) {
      delete gameSession.players[playerId];
      gameSession.playerCount = Object.keys(gameSession.players).length;
      await setGameSession(gameId, gameSession);
      return gameSession;
    }
    return null;
  } catch (error) {
    console.error('Error removing player from game:', error);
    return null;
  }
};

const getGamePlayers = async (gameId) => {
  if (!redisClient) return [];
  
  try {
    const gameSession = await getGameSession(gameId);
    return gameSession?.players ? Object.values(gameSession.players) : [];
  } catch (error) {
    console.error('Error getting game players:', error);
    return [];
  }
};

// Player session management
const setPlayerSession = async (playerId, sessionData, ttl = 3600) => {
  if (!redisClient) return;
  
  try {
    await redisClient.setEx(
      `player:${playerId}`, 
      ttl, 
      JSON.stringify(sessionData)
    );
  } catch (error) {
    console.error('Error setting player session:', error);
  }
};

const getPlayerSession = async (playerId) => {
  if (!redisClient) return null;
  
  try {
    const data = await redisClient.get(`player:${playerId}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting player session:', error);
    return null;
  }
};

// Leaderboard management
const updateLeaderboard = async (gameId, playerId, score, playerName) => {
  if (!redisClient) return;
  
  try {
    const key = `leaderboard:${gameId}`;
    await redisClient.zAdd(key, {
      score: score,
      value: JSON.stringify({ id: playerId, name: playerName, score }),
    });
    await redisClient.expire(key, 3600); // 1 hour TTL
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
};

const getLeaderboard = async (gameId, limit = 10) => {
  if (!redisClient) return [];
  
  try {
    const key = `leaderboard:${gameId}`;
    const results = await redisClient.zRangeWithScores(key, 0, limit - 1, {
      REV: true, // Highest scores first
    });
    
    return results.map((result, index) => {
      const playerData = JSON.parse(result.value);
      return {
        rank: index + 1,
        ...playerData,
      };
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};

// Game PIN management
const setGamePin = async (pin, gameId, ttl = 3600) => {
  if (!redisClient) return;
  
  try {
    await redisClient.setEx(`pin:${pin}`, ttl, gameId);
  } catch (error) {
    console.error('Error setting game PIN:', error);
  }
};

const getGameByPin = async (pin) => {
  if (!redisClient) return null;
  
  try {
    return await redisClient.get(`pin:${pin}`);
  } catch (error) {
    console.error('Error getting game by PIN:', error);
    return null;
  }
};

const deleteGamePin = async (pin) => {
  if (!redisClient) return;
  
  try {
    await redisClient.del(`pin:${pin}`);
  } catch (error) {
    console.error('Error deleting game PIN:', error);
  }
};

// Answer collection for bulk processing
const addAnswerToBatch = async (gameId, questionIndex, answerData) => {
  if (!redisClient) return;
  
  try {
    const key = `answers:${gameId}:${questionIndex}`;
    await redisClient.lPush(key, JSON.stringify(answerData));
    await redisClient.expire(key, 300); // 5 minutes TTL
  } catch (error) {
    console.error('Error adding answer to batch:', error);
  }
};

const getAnswerBatch = async (gameId, questionIndex) => {
  if (!redisClient) return [];
  
  try {
    const key = `answers:${gameId}:${questionIndex}`;
    const answers = await redisClient.lRange(key, 0, -1);
    return answers.map(answer => JSON.parse(answer));
  } catch (error) {
    console.error('Error getting answer batch:', error);
    return [];
  }
};

const clearAnswerBatch = async (gameId, questionIndex) => {
  if (!redisClient) return;
  
  try {
    const key = `answers:${gameId}:${questionIndex}`;
    await redisClient.del(key);
  } catch (error) {
    console.error('Error clearing answer batch:', error);
  }
};

// Performance metrics
const incrementMetric = async (metric, value = 1) => {
  if (!redisClient) return;
  
  try {
    await redisClient.incrBy(`metrics:${metric}`, value);
  } catch (error) {
    console.error('Error incrementing metric:', error);
  }
};

const getMetric = async (metric) => {
  if (!redisClient) return 0;
  
  try {
    const value = await redisClient.get(`metrics:${metric}`);
    return parseInt(value) || 0;
  } catch (error) {
    console.error('Error getting metric:', error);
    return 0;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  getPubClient,
  getSubClient,
  setGameSession,
  getGameSession,
  deleteGameSession,
  updateGameState,
  addPlayerToGame,
  removePlayerFromGame,
  getGamePlayers,
  setPlayerSession,
  getPlayerSession,
  updateLeaderboard,
  getLeaderboard,
  setGamePin,
  getGameByPin,
  deleteGamePin,
  addAnswerToBatch,
  getAnswerBatch,
  clearAnswerBatch,
  incrementMetric,
  getMetric,
};