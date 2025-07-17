const express = require('express');
const router = express.Router();
const gameService = require('../services/gameService');
const supabaseService = require('../services/supabaseService');

// Create a new game
router.post('/create', async (req, res) => {
  try {
    const { quizId, hostId, settings = {} } = req.body;

    if (!quizId || !hostId) {
      return res.status(400).json({
        error: 'Quiz ID and Host ID are required'
      });
    }

    // Verify quiz exists
    const quiz = await supabaseService.getQuiz(quizId);
    if (!quiz) {
      return res.status(404).json({
        error: 'Quiz not found'
      });
    }

    // Create game session using Supabase
    const gameSession = await gameService.createGameSession(quizId, hostId, {
      maxPlayers: 100,
      questionTimer: 30000, // 30 seconds
      showAnswers: true,
      randomizeQuestions: false,
      ...settings
    });

    res.status(201).json({
      success: true,
      game: gameSession,
      message: 'Game created successfully'
    });

  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      error: 'Failed to create game',
      details: error.message
    });
  }
});

// Join a game by PIN
router.post('/join', async (req, res) => {
  try {
    const { pin, playerName } = req.body;

    if (!pin || !playerName) {
      return res.status(400).json({
        error: 'Game PIN and player name are required'
      });
    }

    // Get game by PIN
    const gameSession = await gameService.getGameByPin(pin);
    if (!gameSession) {
      return res.status(404).json({
        error: 'Game not found or expired'
      });
    }

    // Check game status
    if (gameSession.status !== 'waiting') {
      return res.status(400).json({
        error: 'Game is not accepting new players'
      });
    }

    // Check max players
    if (gameSession.player_count >= (gameSession.settings?.maxPlayers || 100)) {
      return res.status(400).json({
        error: 'Game is full'
      });
    }

    // Add player to game
    const playerData = await gameService.addPlayerToGame(
      gameSession.id, 
      playerName
    );

    res.status(200).json({
      success: true,
      player: playerData,
      game: {
        id: gameSession.id,
        pin: gameSession.game_pin,
        status: gameSession.status,
        playerCount: gameSession.player_count + 1
      },
      message: 'Successfully joined game'
    });

  } catch (error) {
    console.error('Error joining game:', error);
    
    if (error.message.includes('already taken')) {
      return res.status(400).json({
        error: 'Player name already taken'
      });
    }

    res.status(500).json({
      error: 'Failed to join game',
      details: error.message
    });
  }
});

// Get game by PIN
router.get('/pin/:pin', async (req, res) => {
  try {
    const { pin } = req.params;
    
    if (!pin || pin.length !== 6) {
      return res.status(400).json({
        error: 'Invalid PIN',
        message: 'PIN must be 6 digits',
      });
    }

    const game = await gameService.getGameByPin(pin);
    
    if (!game) {
      return res.status(404).json({
        error: 'Game not found',
        message: 'No active game found with this PIN',
      });
    }

    res.json({
      success: true,
      data: {
        id: game.id,
        pin: game.game_pin,
        status: game.status,
        playerCount: game.player_count,
        quizTitle: game.quizzes?.title,
        totalQuestions: game.quizzes?.questions?.length || 0,
      },
    });

  } catch (error) {
    console.error('Error getting game by PIN:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve game',
    });
  }
});

// Get game details
router.get('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    const gameSession = await gameService.getGameSession(gameId);
    if (!gameSession) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    res.status(200).json({
      success: true,
      game: gameSession,
      quiz: gameSession.quizzes ? {
        id: gameSession.quizzes.id,
        title: gameSession.quizzes.title,
        description: gameSession.quizzes.description,
        questionCount: gameSession.quizzes.questions?.length || 0
      } : null
    });

  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({
      error: 'Failed to get game details',
      details: error.message
    });
  }
});

// Update game status
router.patch('/:gameId/status', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { status, hostId } = req.body;

    if (!status || !hostId) {
      return res.status(400).json({
        error: 'Status and host ID are required'
      });
    }

    const gameSession = await gameService.getGameSession(gameId);
    if (!gameSession) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    // Verify host
    if (gameSession.host_id !== hostId) {
      return res.status(403).json({
        error: 'Only the host can update game status'
      });
    }

    // Validate status transition
    const validStatuses = ['waiting', 'starting', 'active', 'paused', 'ended'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status'
      });
    }

    const updatedGame = await gameService.updateGameSession(gameId, { status });

    res.status(200).json({
      success: true,
      game: updatedGame,
      message: 'Game status updated successfully'
    });

  } catch (error) {
    console.error('Error updating game status:', error);
    res.status(500).json({
      error: 'Failed to update game status',
      details: error.message
    });
  }
});

// Start game
router.post('/:gameId/start', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { hostId } = req.body;

    const gameSession = await gameService.getGameSession(gameId);
    if (!gameSession) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    // Verify host
    if (gameSession.host_id !== hostId) {
      return res.status(403).json({
        error: 'Only the host can start the game'
      });
    }

    if (gameSession.player_count === 0) {
      return res.status(400).json({
        error: 'Cannot start game with no players'
      });
    }

    const updatedGame = await gameService.startGame(gameId);

    res.status(200).json({
      success: true,
      game: updatedGame,
      message: 'Game started successfully'
    });

  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({
      error: 'Failed to start game',
      details: error.message
    });
  }
});

// Next question
router.post('/:gameId/next-question', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { hostId } = req.body;

    const gameSession = await gameService.getGameSession(gameId);
    if (!gameSession) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    // Verify host
    if (gameSession.host_id !== hostId) {
      return res.status(403).json({
        error: 'Only the host can control questions'
      });
    }

    const updatedGame = await gameService.nextQuestion(gameId);

    res.status(200).json({
      success: true,
      game: updatedGame,
      message: updatedGame.status === 'ended' ? 'Game completed' : 'Next question'
    });

  } catch (error) {
    console.error('Error moving to next question:', error);
    res.status(500).json({
      error: 'Failed to move to next question',
      details: error.message
    });
  }
});

// Submit answer
router.post('/:gameId/answer', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, questionIndex, selectedAnswer, timeTaken } = req.body;

    if (playerId === undefined || questionIndex === undefined || selectedAnswer === undefined) {
      return res.status(400).json({
        error: 'Player ID, question index, and selected answer are required'
      });
    }

    const result = await gameService.submitAnswer(
      gameId, 
      playerId, 
      questionIndex, 
      selectedAnswer, 
      timeTaken || 0
    );

    res.status(200).json({
      success: true,
      answer: result,
      message: 'Answer submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({
      error: 'Failed to submit answer',
      details: error.message
    });
  }
});

// Get game players
router.get('/:gameId/players', async (req, res) => {
  try {
    const { gameId } = req.params;

    const players = await gameService.getGamePlayers(gameId);

    res.status(200).json({
      success: true,
      players,
      playerCount: players.length
    });

  } catch (error) {
    console.error('Error getting game players:', error);
    res.status(500).json({
      error: 'Failed to get game players',
      details: error.message
    });
  }
});

// Get leaderboard
router.get('/:gameId/leaderboard', async (req, res) => {
  try {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = await gameService.getLeaderboard(gameId, limit);

    res.status(200).json({
      success: true,
      leaderboard
    });

  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      error: 'Failed to get leaderboard',
      details: error.message
    });
  }
});

// End game and cleanup
router.delete('/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { hostId } = req.body;

    const gameSession = await gameService.getGameSession(gameId);
    if (!gameSession) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    // Verify host
    if (gameSession.host_id !== hostId) {
      return res.status(403).json({
        error: 'Only the host can end the game'
      });
    }

    await gameService.endGame(gameId);

    res.status(200).json({
      success: true,
      message: 'Game ended successfully'
    });

  } catch (error) {
    console.error('Error ending game:', error);
    res.status(500).json({
      error: 'Failed to end game',
      details: error.message
    });
  }
});

module.exports = router;