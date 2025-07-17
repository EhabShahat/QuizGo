const express = require('express');
const { supabaseService } = require('../services/supabaseService');
const { getPlayerSession, updateLeaderboard } = require('../config/redis');
const router = express.Router();

// Get player by ID
router.get('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    // Try Redis cache first
    let playerData = await getPlayerSession(playerId);

    if (!playerData) {
      // Fallback to database
      const { data, error } = await supabaseService.client
        .from('game_players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      playerData = data;
    }

    if (!playerData) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'The specified player does not exist',
      });
    }

    res.json({
      success: true,
      data: playerData,
    });

  } catch (error) {
    console.error('Error getting player:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve player',
    });
  }
});

// Update player
router.put('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated via API
    delete updates.id;
    delete updates.game_id;
    delete updates.joined_at;

    const updatedPlayer = await supabaseService.updatePlayer(playerId, updates);

    if (!updatedPlayer) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'The specified player does not exist',
      });
    }

    res.json({
      success: true,
      data: updatedPlayer,
    });

  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update player',
    });
  }
});

// Get player answers for a game
router.get('/:playerId/answers', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { gameId } = req.query;

    if (!gameId) {
      return res.status(400).json({
        error: 'Missing parameter',
        message: 'Game ID is required',
      });
    }

    const { data, error } = await supabaseService.client
      .from('player_answers')
      .select(`
        *,
        quiz_items (
          content,
          quiz_item_options (*)
        )
      `)
      .eq('player_id', playerId)
      .eq('game_id', gameId)
      .order('question_index', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('Error getting player answers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve player answers',
    });
  }
});

// Get player statistics
router.get('/:playerId/stats', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { gameId } = req.query;

    // Get player session data
    const playerSession = await getPlayerSession(playerId);

    // Get player answers from database
    let answersQuery = supabaseService.client
      .from('player_answers')
      .select('*')
      .eq('player_id', playerId);

    if (gameId) {
      answersQuery = answersQuery.eq('game_id', gameId);
    }

    const { data: answers, error } = await answersQuery;

    if (error) throw error;

    // Calculate statistics
    const totalAnswers = answers?.length || 0;
    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
    const totalPoints = answers?.reduce((sum, a) => sum + (a.points_earned || 0), 0) || 0;
    const avgResponseTime = totalAnswers > 0 
      ? answers.reduce((sum, a) => sum + a.response_time, 0) / totalAnswers 
      : 0;

    const stats = {
      playerId,
      gameId: gameId || null,
      totalAnswers,
      correctAnswers,
      accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0,
      totalPoints,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      currentStreak: playerSession?.current_streak || 0,
      longestStreak: playerSession?.longest_streak || 0,
      isReady: playerSession?.is_ready || false,
      hasAnsweredCurrent: playerSession?.has_answered_current || false,
    };

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    console.error('Error getting player stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve player statistics',
    });
  }
});

// Update player score
router.put('/:playerId/score', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { score, gameId } = req.body;

    if (typeof score !== 'number' || !gameId) {
      return res.status(400).json({
        error: 'Invalid data',
        message: 'Score (number) and gameId are required',
      });
    }

    // Update player in database
    const updatedPlayer = await supabaseService.updatePlayer(playerId, { score });

    if (!updatedPlayer) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'The specified player does not exist',
      });
    }

    // Update leaderboard in Redis
    await updateLeaderboard(gameId, playerId, score, updatedPlayer.nickname);

    res.json({
      success: true,
      data: updatedPlayer,
      message: 'Player score updated successfully',
    });

  } catch (error) {
    console.error('Error updating player score:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update player score',
    });
  }
});

// Remove player from game
router.delete('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    const success = await supabaseService.removePlayer(playerId);

    if (!success) {
      return res.status(404).json({
        error: 'Player not found',
        message: 'The specified player does not exist',
      });
    }

    res.json({
      success: true,
      message: 'Player removed successfully',
    });

  } catch (error) {
    console.error('Error removing player:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove player',
    });
  }
});

// Get players in a game
router.get('/game/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { active = false } = req.query;

    let query = supabaseService.client
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('score', { ascending: false });

    // Filter for active players only (recent activity)
    if (active === 'true') {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      query = query.gte('last_activity', fiveMinutesAgo);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });

  } catch (error) {
    console.error('Error getting game players:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve game players',
    });
  }
});

// Bulk update player scores
router.put('/game/:gameId/scores', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerScores } = req.body;

    if (!Array.isArray(playerScores)) {
      return res.status(400).json({
        error: 'Invalid data',
        message: 'playerScores must be an array',
      });
    }

    const updates = [];
    const leaderboardUpdates = [];

    for (const { playerId, score, nickname } of playerScores) {
      if (playerId && typeof score === 'number') {
        updates.push({
          id: playerId,
          score,
          last_activity: new Date().toISOString(),
        });

        leaderboardUpdates.push(
          updateLeaderboard(gameId, playerId, score, nickname)
        );
      }
    }

    // Update database
    const { data, error } = await supabaseService.client
      .from('game_players')
      .upsert(updates)
      .select();

    if (error) throw error;

    // Update leaderboard in Redis
    await Promise.all(leaderboardUpdates);

    res.json({
      success: true,
      data: data || [],
      message: 'Player scores updated successfully',
    });

  } catch (error) {
    console.error('Error bulk updating player scores:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update player scores',
    });
  }
});

module.exports = router;