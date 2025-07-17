const { v4: uuidv4 } = require('uuid');
const { 
  getGameSession, 
  setGameSession,
  setPlayerSession,
  getPlayerSession,
  updateLeaderboard,
  addAnswerToBatch,
  incrementMetric,
} = require('../config/redis');
const { supabaseService } = require('../services/supabaseService');
const { broadcastToGame, broadcastToHost } = require('../config/socket');
const gameHandlers = require('./gameHandlers');

// Handle setting player name
const handleSetPlayerName = async (socket, data, callback) => {
  try {
    const { name } = data;
    const gameId = socket.gameId;

    if (!gameId) {
      return callback({ 
        success: false, 
        message: 'Not in a game' 
      });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return callback({ 
        success: false, 
        message: 'Invalid name' 
      });
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length > 20) {
      return callback({ 
        success: false, 
        message: 'Name too long (max 20 characters)' 
      });
    }

    // Check if name is available
    const isAvailable = await gameHandlers.isPlayerNameAvailable(
      gameId, 
      trimmedName, 
      socket.playerId
    );

    if (!isAvailable) {
      return callback({ 
        success: false, 
        message: 'Name already taken' 
      });
    }

    // Generate player ID if not exists
    if (!socket.playerId) {
      socket.playerId = uuidv4();
    }

    // Create player data
    const playerData = {
      id: socket.playerId,
      nickname: trimmedName,
      score: 0,
      current_streak: 0,
      longest_streak: 0,
      socket_id: socket.id,
      is_ready: false,
      has_answered: false,
    };

    // Add player to game
    const players = await gameHandlers.addPlayerToGame(gameId, playerData);

    // Set player session
    await setPlayerSession(socket.playerId, {
      gameId,
      nickname: trimmedName,
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
    });

    // Update socket data
    socket.playerName = trimmedName;
    socket.join(`player:${socket.playerId}`);

    // Notify other players
    socket.to(`game:${gameId}`).emit('player-joined', {
      playerId: socket.playerId,
      playerName: trimmedName,
      totalPlayers: players.length,
      players: players.map(p => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score || 0,
      })),
    });

    // Notify host
    broadcastToHost(gameId, 'player-joined', {
      playerId: socket.playerId,
      playerName: trimmedName,
      totalPlayers: players.length,
      socketId: socket.id,
    });

    // Track metrics
    await incrementMetric('players_joined');

    callback({ 
      success: true,
      playerId: socket.playerId,
      playerName: trimmedName,
      totalPlayers: players.length,
    });

    console.log(`👤 Player ${trimmedName} (${socket.playerId}) joined game ${gameId}`);

  } catch (error) {
    console.error('Error in handleSetPlayerName:', error);
    callback({ 
      success: false, 
      message: 'Failed to set player name' 
    });
  }
};

// Handle answer submission
const handleSubmitAnswer = async (socket, data, callback) => {
  try {
    const { answerIndex, responseTime, questionStartTime } = data;
    const gameId = socket.gameId;
    const playerId = socket.playerId;
    const playerName = socket.playerName;

    if (!gameId || !playerId) {
      return callback({ 
        success: false, 
        message: 'Not in a game' 
      });
    }

    if (answerIndex === undefined || answerIndex === null) {
      return callback({ 
        success: false, 
        message: 'Invalid answer' 
      });
    }

    // Get current game session
    const gameSession = await getGameSession(gameId);
    if (!gameSession) {
      return callback({ 
        success: false, 
        message: 'Game not found' 
      });
    }

    if (gameSession.status !== 'active') {
      return callback({ 
        success: false, 
        message: 'Game not active' 
      });
    }

    // Get current question
    const currentQuestionIndex = gameSession.current_question || 0;
    const currentQuestion = gameSession.current_question_data;

    if (!currentQuestion) {
      return callback({ 
        success: false, 
        message: 'No active question' 
      });
    }

    // Check if player already answered
    const playerSession = await getPlayerSession(playerId);
    if (playerSession && playerSession.has_answered_current) {
      return callback({ 
        success: false, 
        message: 'Already answered this question' 
      });
    }

    // Validate answer index
    const maxAnswerIndex = currentQuestion.options ? currentQuestion.options.length - 1 : 1;
    if (answerIndex < 0 || answerIndex > maxAnswerIndex) {
      return callback({ 
        success: false, 
        message: 'Invalid answer index' 
      });
    }

    // Calculate response time
    const actualResponseTime = responseTime || 
      (questionStartTime ? Math.round((Date.now() - questionStartTime) / 1000) : 30);

    // Determine if answer is correct
    let isCorrect = false;
    if (currentQuestion.question_type === 'multiple_select') {
      // For multiple select, check if all selected answers are correct
      const correctAnswers = currentQuestion.options
        .map((opt, idx) => opt.is_correct ? idx : -1)
        .filter(idx => idx >= 0);
      isCorrect = Array.isArray(answerIndex) && 
        answerIndex.length === correctAnswers.length &&
        answerIndex.every(idx => correctAnswers.includes(idx));
    } else {
      // For single answer questions
      const selectedOption = currentQuestion.options[answerIndex];
      isCorrect = selectedOption && selectedOption.is_correct;
    }

    // Calculate score
    let points = 0;
    if (isCorrect) {
      const basePoints = currentQuestion.points || 1000;
      const timeLimit = currentQuestion.time_limit || 30;
      
      // Base points
      points = basePoints;
      
      // Double points power-up
      if (currentQuestion.is_double_points) {
        points *= 2;
      }
      
      // Speed bonus (up to 50% extra)
      const speedBonusPercent = Math.max(0, (timeLimit - actualResponseTime) / timeLimit);
      const speedBonus = Math.floor(basePoints * speedBonusPercent * 0.5);
      points += speedBonus;
      
      // Streak bonus
      const currentStreak = (playerSession?.current_streak || 0) + 1;
      let streakBonus = 0;
      if (currentStreak >= 3) streakBonus += 100;
      if (currentStreak >= 5) streakBonus += 250;
      if (currentStreak >= 10) streakBonus += 500;
      points += streakBonus;
    }

    // Create answer record
    const answerData = {
      game_id: gameId,
      player_id: playerId,
      question_index: currentQuestionIndex,
      answer_index: answerIndex,
      is_correct: isCorrect,
      response_time: actualResponseTime,
      points_earned: points,
      answered_at: new Date().toISOString(),
    };

    // Add to batch for bulk processing
    await addAnswerToBatch(gameId, currentQuestionIndex, answerData);

    // Update player session
    const updatedPlayerSession = {
      ...playerSession,
      has_answered_current: true,
      current_streak: isCorrect ? (playerSession?.current_streak || 0) + 1 : 0,
      longest_streak: Math.max(
        playerSession?.longest_streak || 0,
        isCorrect ? (playerSession?.current_streak || 0) + 1 : 0
      ),
      total_score: (playerSession?.total_score || 0) + points,
    };
    
    await setPlayerSession(playerId, updatedPlayerSession);

    // Update leaderboard
    await updateLeaderboard(gameId, playerId, updatedPlayerSession.total_score, playerName);

    // Notify player of result
    socket.emit('answer-submitted', {
      isCorrect,
      points,
      totalScore: updatedPlayerSession.total_score,
      streak: updatedPlayerSession.current_streak,
      responseTime: actualResponseTime,
    });

    // Notify host of answer submission
    broadcastToHost(gameId, 'player-answered', {
      playerId,
      playerName,
      answerIndex,
      isCorrect,
      points,
      responseTime: actualResponseTime,
      totalAnswered: await getAnsweredCount(gameId, currentQuestionIndex),
    });

    // Track metrics
    await incrementMetric('answers_submitted');
    if (isCorrect) {
      await incrementMetric('correct_answers');
    }

    callback({ 
      success: true,
      isCorrect,
      points,
      totalScore: updatedPlayerSession.total_score,
      streak: updatedPlayerSession.current_streak,
    });

    console.log(`📝 ${playerName} answered question ${currentQuestionIndex}: ${isCorrect ? 'correct' : 'incorrect'} (+${points} points)`);

  } catch (error) {
    console.error('Error in handleSubmitAnswer:', error);
    callback({ 
      success: false, 
      message: 'Failed to submit answer' 
    });
  }
};

// Handle player ready status
const handlePlayerReady = async (socket, data, callback) => {
  try {
    const { isReady = true } = data;
    const gameId = socket.gameId;
    const playerId = socket.playerId;
    const playerName = socket.playerName;

    if (!gameId || !playerId) {
      return callback({ 
        success: false, 
        message: 'Not in a game' 
      });
    }

    // Update player session
    const playerSession = await getPlayerSession(playerId);
    const updatedSession = {
      ...playerSession,
      is_ready: isReady,
      ready_at: isReady ? new Date().toISOString() : null,
    };
    
    await setPlayerSession(playerId, updatedSession);

    // Update game session
    const gameSession = await getGameSession(gameId);
    if (gameSession && gameSession.players) {
      const playerIndex = gameSession.players.findIndex(p => p.id === playerId);
      if (playerIndex >= 0) {
        gameSession.players[playerIndex].is_ready = isReady;
        await setGameSession(gameId, gameSession);
      }
    }

    // Notify host
    broadcastToHost(gameId, 'player-ready-status', {
      playerId,
      playerName,
      isReady,
      readyCount: await getReadyPlayerCount(gameId),
      totalPlayers: gameSession?.players?.length || 0,
    });

    callback({ success: true });

    console.log(`✅ ${playerName} is ${isReady ? 'ready' : 'not ready'} in game ${gameId}`);

  } catch (error) {
    console.error('Error in handlePlayerReady:', error);
    callback({ 
      success: false, 
      message: 'Failed to update ready status' 
    });
  }
};

// Get count of players who have answered current question
const getAnsweredCount = async (gameId, questionIndex) => {
  try {
    const gameSession = await getGameSession(gameId);
    if (!gameSession || !gameSession.players) return 0;

    let answeredCount = 0;
    for (const player of gameSession.players) {
      const playerSession = await getPlayerSession(player.id);
      if (playerSession && playerSession.has_answered_current) {
        answeredCount++;
      }
    }

    return answeredCount;
  } catch (error) {
    console.error('Error getting answered count:', error);
    return 0;
  }
};

// Get count of ready players
const getReadyPlayerCount = async (gameId) => {
  try {
    const gameSession = await getGameSession(gameId);
    if (!gameSession || !gameSession.players) return 0;

    let readyCount = 0;
    for (const player of gameSession.players) {
      const playerSession = await getPlayerSession(player.id);
      if (playerSession && playerSession.is_ready) {
        readyCount++;
      }
    }

    return readyCount;
  } catch (error) {
    console.error('Error getting ready count:', error);
    return 0;
  }
};

// Reset player answer status for new question
const resetPlayerAnswerStatus = async (gameId) => {
  try {
    const gameSession = await getGameSession(gameId);
    if (!gameSession || !gameSession.players) return;

    // Reset answer status for all players
    for (const player of gameSession.players) {
      const playerSession = await getPlayerSession(player.id);
      if (playerSession) {
        await setPlayerSession(player.id, {
          ...playerSession,
          has_answered_current: false,
          is_ready: false,
        });
      }
    }

    console.log(`🔄 Reset answer status for all players in game ${gameId}`);

  } catch (error) {
    console.error('Error resetting player answer status:', error);
  }
};

// Get player statistics
const getPlayerStats = async (playerId) => {
  try {
    const playerSession = await getPlayerSession(playerId);
    if (!playerSession) return null;

    return {
      totalScore: playerSession.total_score || 0,
      currentStreak: playerSession.current_streak || 0,
      longestStreak: playerSession.longest_streak || 0,
      hasAnswered: playerSession.has_answered_current || false,
      isReady: playerSession.is_ready || false,
    };
  } catch (error) {
    console.error('Error getting player stats:', error);
    return null;
  }
};

// Handle player timeout (didn't answer in time)
const handlePlayerTimeout = async (gameId, questionIndex) => {
  try {
    const gameSession = await getGameSession(gameId);
    if (!gameSession || !gameSession.players) return;

    // Reset streak for players who didn't answer
    for (const player of gameSession.players) {
      const playerSession = await getPlayerSession(player.id);
      if (playerSession && !playerSession.has_answered_current) {
        await setPlayerSession(player.id, {
          ...playerSession,
          current_streak: 0, // Reset streak for timeout
          has_answered_current: true, // Mark as "answered" to prevent further submissions
        });
      }
    }

    console.log(`⏰ Handled timeout for question ${questionIndex} in game ${gameId}`);

  } catch (error) {
    console.error('Error handling player timeout:', error);
  }
};

module.exports = {
  handleSetPlayerName,
  handleSubmitAnswer,
  handlePlayerReady,
  getAnsweredCount,
  getReadyPlayerCount,
  resetPlayerAnswerStatus,
  getPlayerStats,
  handlePlayerTimeout,
};