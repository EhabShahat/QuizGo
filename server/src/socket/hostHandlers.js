const { v4: uuidv4 } = require('uuid');
const { 
  getGameSession, 
  setGameSession,
  deleteGameSession,
  setGamePin,
  deleteGamePin,
  getLeaderboard,
  getAnswerBatch,
  clearAnswerBatch,
  incrementMetric,
} = require('../config/redis');
const { supabaseService } = require('../services/supabaseService');
const { broadcastToGame, staggeredBroadcast } = require('../config/socket');
const playerHandlers = require('./playerHandlers');

// Handle game creation
const handleCreateGame = async (socket, data, callback) => {
  try {
    const { quizId, gameMode = 'dual_screen', maxPlayers = 200 } = data;

    if (!quizId) {
      return callback({ 
        success: false, 
        message: 'Quiz ID is required' 
      });
    }

    // Get quiz data from database
    const quizData = await supabaseService.getQuiz(quizId);
    if (!quizData) {
      return callback({ 
        success: false, 
        message: 'Quiz not found' 
      });
    }

    // Generate unique game PIN
    let gamePin;
    let attempts = 0;
    do {
      gamePin = generateGamePin();
      attempts++;
    } while (await isGamePinTaken(gamePin) && attempts < 10);

    if (attempts >= 10) {
      return callback({ 
        success: false, 
        message: 'Failed to generate unique game PIN' 
      });
    }

    // Create game in database
    const gameData = await supabaseService.createGame(quizId, {
      pin: gamePin,
      game_mode: gameMode,
      max_players: maxPlayers,
      status: 'waiting',
    });

    if (!gameData) {
      return callback({ 
        success: false, 
        message: 'Failed to create game' 
      });
    }

    // Create game session in Redis
    const gameSession = {
      id: gameData.id,
      pin: gamePin,
      quiz_id: quizId,
      quiz_title: quizData.title,
      quiz_background: quizData.background_value,
      game_mode: gameMode,
      max_players: maxPlayers,
      status: 'waiting',
      current_question: 0,
      total_questions: quizData.quiz_items?.length || 0,
      players: [],
      host_id: socket.id,
      created_at: new Date().toISOString(),
      quiz_items: quizData.quiz_items || [],
    };

    await setGameSession(gameData.id, gameSession);
    await setGamePin(gamePin, gameData.id);

    // Set up host socket
    socket.gameId = gameData.id;
    socket.isHost = true;
    socket.join(`game:${gameData.id}`);
    socket.join(`host:${gameData.id}`);

    // Track metrics
    await incrementMetric('games_created');

    callback({ 
      success: true,
      gameId: gameData.id,
      gamePin,
      quizTitle: quizData.title,
      totalQuestions: gameSession.total_questions,
      gameMode,
      maxPlayers,
    });

    console.log(`🎮 Game created: ${gameData.id} (PIN: ${gamePin}) by host ${socket.id}`);

  } catch (error) {
    console.error('Error in handleCreateGame:', error);
    callback({ 
      success: false, 
      message: 'Failed to create game' 
    });
  }
};

// Handle game start
const handleStartGame = async (socket, data, callback) => {
  try {
    const gameId = socket.gameId;

    if (!gameId || !socket.isHost) {
      return callback({ 
        success: false, 
        message: 'Not authorized to start game' 
      });
    }

    // Get game session
    const gameSession = await getGameSession(gameId);
    if (!gameSession) {
      return callback({ 
        success: false, 
        message: 'Game not found' 
      });
    }

    if (gameSession.status !== 'waiting') {
      return callback({ 
        success: false, 
        message: 'Game already started or ended' 
      });
    }

    if (!gameSession.players || gameSession.players.length === 0) {
      return callback({ 
        success: false, 
        message: 'No players in game' 
      });
    }

    // Update game status
    gameSession.status = 'active';
    gameSession.started_at = new Date().toISOString();
    gameSession.current_question = 0;

    await setGameSession(gameId, gameSession);
    await supabaseService.updateGame(gameId, { 
      status: 'active',
      started_at: new Date().toISOString(),
    });

    // Notify all players
    broadcastToGame(gameId, 'game-started', {
      gameId,
      totalQuestions: gameSession.total_questions,
      gameMode: gameSession.game_mode,
    });

    // Start first question
    await startQuestion(gameId, 0);

    // Track metrics
    await incrementMetric('games_started');

    callback({ success: true });

    console.log(`🚀 Game ${gameId} started with ${gameSession.players.length} players`);

  } catch (error) {
    console.error('Error in handleStartGame:', error);
    callback({ 
      success: false, 
      message: 'Failed to start game' 
    });
  }
};

// Handle next question
const handleNextQuestion = async (socket, data, callback) => {
  try {
    const gameId = socket.gameId;

    if (!gameId || !socket.isHost) {
      return callback({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

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

    const nextQuestionIndex = gameSession.current_question + 1;

    if (nextQuestionIndex >= gameSession.total_questions) {
      // End game if no more questions
      await handleEndGame(socket, {}, callback);
      return;
    }

    // Process current question results
    await processQuestionResults(gameId, gameSession.current_question);

    // Start next question
    await startQuestion(gameId, nextQuestionIndex);

    callback({ success: true });

    console.log(`➡️ Advanced to question ${nextQuestionIndex + 1} in game ${gameId}`);

  } catch (error) {
    console.error('Error in handleNextQuestion:', error);
    callback({ 
      success: false, 
      message: 'Failed to advance question' 
    });
  }
};

// Handle show results
const handleShowResults = async (socket, data, callback) => {
  try {
    const gameId = socket.gameId;

    if (!gameId || !socket.isHost) {
      return callback({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    // Get current question results
    const results = await getQuestionResults(gameId);
    
    // Broadcast results to all players
    broadcastToGame(gameId, 'question-results', results);

    callback({ success: true, results });

  } catch (error) {
    console.error('Error in handleShowResults:', error);
    callback({ 
      success: false, 
      message: 'Failed to show results' 
    });
  }
};

// Handle game end
const handleEndGame = async (socket, data, callback) => {
  try {
    const gameId = socket.gameId;

    if (!gameId || !socket.isHost) {
      return callback({ 
        success: false, 
        message: 'Not authorized to end game' 
      });
    }

    const gameSession = await getGameSession(gameId);
    if (!gameSession) {
      return callback({ 
        success: false, 
        message: 'Game not found' 
      });
    }

    // Process final results
    const finalResults = await processFinalResults(gameId);

    // Update game status
    gameSession.status = 'ended';
    gameSession.ended_at = new Date().toISOString();
    await setGameSession(gameId, gameSession);

    await supabaseService.updateGame(gameId, { 
      status: 'ended',
      ended_at: new Date().toISOString(),
    });

    // Notify all players
    broadcastToGame(gameId, 'game-ended', {
      gameId,
      finalResults,
      leaderboard: finalResults.leaderboard,
    });

    // Clean up
    setTimeout(async () => {
      await deleteGameSession(gameId);
      await deleteGamePin(gameSession.pin);
    }, 300000); // Clean up after 5 minutes

    // Track metrics
    await incrementMetric('games_completed');

    callback({ success: true, finalResults });

    console.log(`🏁 Game ${gameId} ended with ${gameSession.players.length} players`);

  } catch (error) {
    console.error('Error in handleEndGame:', error);
    callback({ 
      success: false, 
      message: 'Failed to end game' 
    });
  }
};

// Handle pause game
const handlePauseGame = async (socket, data, callback) => {
  try {
    const gameId = socket.gameId;

    if (!gameId || !socket.isHost) {
      return callback({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    const gameSession = await getGameSession(gameId);
    if (!gameSession) {
      return callback({ 
        success: false, 
        message: 'Game not found' 
      });
    }

    gameSession.status = 'paused';
    gameSession.paused_at = new Date().toISOString();
    await setGameSession(gameId, gameSession);

    broadcastToGame(gameId, 'game-paused', {
      message: 'Game has been paused by the host',
    });

    callback({ success: true });

    console.log(`⏸️ Game ${gameId} paused`);

  } catch (error) {
    console.error('Error in handlePauseGame:', error);
    callback({ 
      success: false, 
      message: 'Failed to pause game' 
    });
  }
};

// Handle resume game
const handleResumeGame = async (socket, data, callback) => {
  try {
    const gameId = socket.gameId;

    if (!gameId || !socket.isHost) {
      return callback({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    const gameSession = await getGameSession(gameId);
    if (!gameSession) {
      return callback({ 
        success: false, 
        message: 'Game not found' 
      });
    }

    gameSession.status = 'active';
    delete gameSession.paused_at;
    await setGameSession(gameId, gameSession);

    broadcastToGame(gameId, 'game-resumed', {
      message: 'Game has been resumed',
    });

    callback({ success: true });

    console.log(`▶️ Game ${gameId} resumed`);

  } catch (error) {
    console.error('Error in handleResumeGame:', error);
    callback({ 
      success: false, 
      message: 'Failed to resume game' 
    });
  }
};

// Handle kick player
const handleKickPlayer = async (socket, data, callback) => {
  try {
    const { playerId } = data;
    const gameId = socket.gameId;

    if (!gameId || !socket.isHost) {
      return callback({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    if (!playerId) {
      return callback({ 
        success: false, 
        message: 'Player ID required' 
      });
    }

    // Remove player from game
    const gameSession = await getGameSession(gameId);
    if (gameSession && gameSession.players) {
      const playerIndex = gameSession.players.findIndex(p => p.id === playerId);
      if (playerIndex >= 0) {
        const kickedPlayer = gameSession.players[playerIndex];
        gameSession.players.splice(playerIndex, 1);
        await setGameSession(gameId, gameSession);

        // Notify kicked player
        socket.to(`player:${playerId}`).emit('player-kicked', {
          message: 'You have been removed from the game by the host',
        });

        // Notify other players
        broadcastToGame(gameId, 'player-left', {
          playerId,
          playerName: kickedPlayer.nickname,
          reason: 'kicked',
          totalPlayers: gameSession.players.length,
        });

        callback({ success: true });

        console.log(`👢 Player ${kickedPlayer.nickname} kicked from game ${gameId}`);
      } else {
        callback({ 
          success: false, 
          message: 'Player not found' 
        });
      }
    }

  } catch (error) {
    console.error('Error in handleKickPlayer:', error);
    callback({ 
      success: false, 
      message: 'Failed to kick player' 
    });
  }
};

// Handle host disconnection
const handleHostDisconnection = async (socket) => {
  try {
    const gameId = socket.gameId;
    if (!gameId) return;

    // Notify players
    broadcastToGame(gameId, 'host-disconnected', {
      message: 'Host has disconnected. Game will end in 30 seconds.',
    });

    // End game after delay
    setTimeout(async () => {
      const gameSession = await getGameSession(gameId);
      if (gameSession && gameSession.status === 'active') {
        gameSession.status = 'ended';
        gameSession.ended_at = new Date().toISOString();
        gameSession.end_reason = 'host_disconnected';
        
        await setGameSession(gameId, gameSession);
        
        broadcastToGame(gameId, 'game-ended', {
          reason: 'host_disconnected',
          message: 'Game ended due to host disconnection',
        });

        // Clean up after delay
        setTimeout(async () => {
          await deleteGameSession(gameId);
          if (gameSession.pin) {
            await deleteGamePin(gameSession.pin);
          }
        }, 60000);
      }
    }, 30000);

    console.log(`🔌 Host disconnected from game ${gameId}`);

  } catch (error) {
    console.error('Error handling host disconnection:', error);
  }
};

// Helper functions

const generateGamePin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isGamePinTaken = async (pin) => {
  try {
    const existingGame = await supabaseService.getGameByPin(pin);
    return existingGame !== null;
  } catch (error) {
    return false;
  }
};

const startQuestion = async (gameId, questionIndex) => {
  try {
    const gameSession = await getGameSession(gameId);
    if (!gameSession) return;

    const question = gameSession.quiz_items[questionIndex];
    if (!question) return;

    // Update game session
    gameSession.current_question = questionIndex;
    gameSession.current_question_data = question;
    gameSession.question_start_time = Date.now();
    await setGameSession(gameId, gameSession);

    // Reset player answer status
    await playerHandlers.resetPlayerAnswerStatus(gameId);

    // Prepare question data based on game mode
    if (gameSession.game_mode === 'dual_screen') {
      // Send full question to host
      socket.to(`host:${gameId}`).emit('question-data-host', {
        questionIndex,
        question,
        totalQuestions: gameSession.total_questions,
      });

      // Send only answer options to players
      broadcastToGame(gameId, 'answer-options-only', {
        questionIndex,
        options: question.quiz_item_options || [],
        timeLimit: question.time_limit || 30,
        isDoublePoints: question.is_double_points || false,
      });
    } else {
      // Send full question to all players (normal mode)
      broadcastToGame(gameId, 'question-data', {
        questionIndex,
        question,
        totalQuestions: gameSession.total_questions,
      });
    }

    // Start timer
    startQuestionTimer(gameId, question.time_limit || 30);

    console.log(`❓ Started question ${questionIndex + 1} in game ${gameId}`);

  } catch (error) {
    console.error('Error starting question:', error);
  }
};

const startQuestionTimer = (gameId, timeLimit) => {
  let timeRemaining = timeLimit;
  
  const timer = setInterval(async () => {
    timeRemaining--;
    
    // Broadcast timer update
    broadcastToGame(gameId, 'timer-update', timeRemaining);
    
    if (timeRemaining <= 0) {
      clearInterval(timer);
      
      // Handle timeout
      await playerHandlers.handlePlayerTimeout(gameId, 
        (await getGameSession(gameId))?.current_question || 0);
      
      // Notify that time is up
      broadcastToGame(gameId, 'timer-ended', {});
      
      console.log(`⏰ Timer ended for game ${gameId}`);
    }
  }, 1000);
};

const processQuestionResults = async (gameId, questionIndex) => {
  try {
    // Get all answers for this question
    const answers = await getAnswerBatch(gameId, questionIndex);
    
    // Process answers and update database
    if (answers.length > 0) {
      await supabaseService.bulkCreateAnswers(answers);
    }
    
    // Clear answer batch
    await clearAnswerBatch(gameId, questionIndex);
    
    // Calculate analytics
    const analytics = calculateQuestionAnalytics(answers);
    await supabaseService.createGameAnalytics(gameId, questionIndex, analytics);
    
    return analytics;

  } catch (error) {
    console.error('Error processing question results:', error);
    return null;
  }
};

const getQuestionResults = async (gameId) => {
  try {
    const gameSession = await getGameSession(gameId);
    if (!gameSession) return null;

    const currentQuestion = gameSession.current_question;
    const answers = await getAnswerBatch(gameId, currentQuestion);
    const leaderboard = await getLeaderboard(gameId, 10);

    return {
      questionIndex: currentQuestion,
      totalAnswers: answers.length,
      correctAnswers: answers.filter(a => a.is_correct).length,
      leaderboard,
      answerDistribution: calculateAnswerDistribution(answers),
    };

  } catch (error) {
    console.error('Error getting question results:', error);
    return null;
  }
};

const processFinalResults = async (gameId) => {
  try {
    const leaderboard = await getLeaderboard(gameId, 50);
    const gameSession = await getGameSession(gameId);
    
    return {
      gameId,
      totalPlayers: gameSession?.players?.length || 0,
      totalQuestions: gameSession?.total_questions || 0,
      leaderboard,
      gameMode: gameSession?.game_mode,
      duration: gameSession?.started_at ? 
        Date.now() - new Date(gameSession.started_at).getTime() : 0,
    };

  } catch (error) {
    console.error('Error processing final results:', error);
    return null;
  }
};

const calculateAnswerDistribution = (answers) => {
  const distribution = {};
  
  answers.forEach(answer => {
    const key = answer.answer_index;
    distribution[key] = (distribution[key] || 0) + 1;
  });
  
  return distribution;
};

const calculateQuestionAnalytics = (answers) => {
  const totalAnswers = answers.length;
  const correctAnswers = answers.filter(a => a.is_correct).length;
  const avgResponseTime = answers.reduce((sum, a) => sum + a.response_time, 0) / totalAnswers;
  
  return {
    total_responses: totalAnswers,
    correct_responses: correctAnswers,
    avg_response_time: avgResponseTime,
    difficulty_score: totalAnswers > 0 ? correctAnswers / totalAnswers : 0,
    answer_distribution: calculateAnswerDistribution(answers),
  };
};

module.exports = {
  handleCreateGame,
  handleStartGame,
  handleNextQuestion,
  handleShowResults,
  handleEndGame,
  handlePauseGame,
  handleResumeGame,
  handleKickPlayer,
  handleHostDisconnection,
};