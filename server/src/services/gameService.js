const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class GameService {
  // Create a new game session (replaces Redis game session)
  async createGameSession(quizId, hostId, settings = {}) {
    try {
      const gamePin = await this.generateUniquePin();
      
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          game_pin: gamePin,
          quiz_id: quizId,
          host_id: hostId,
          settings,
          status: 'waiting'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating game session:', error);
      throw error;
    }
  }

  // Generate unique game PIN
  async generateUniquePin() {
    const { data, error } = await supabase
      .rpc('generate_game_pin');
    
    if (error) throw error;
    return data;
  }

  // Get game session by PIN (replaces Redis PIN lookup)
  async getGameByPin(pin) {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            questions
          )
        `)
        .eq('game_pin', pin)
        .in('status', ['waiting', 'starting', 'active', 'paused'])
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting game by PIN:', error);
      return null;
    }
  }

  // Get game session by ID
  async getGameSession(gameId) {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          quizzes (
            id,
            title,
            description,
            questions
          )
        `)
        .eq('id', gameId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting game session:', error);
      return null;
    }
  }

  // Update game session (replaces Redis session updates)
  async updateGameSession(gameId, updates) {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating game session:', error);
      throw error;
    }
  }

  // Add player to game (replaces Redis player management)
  async addPlayerToGame(gameId, playerName, socketId = null) {
    try {
      // Check if player name already exists in this game
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('id')
        .eq('game_session_id', gameId)
        .eq('player_name', playerName)
        .single();

      if (existingPlayer) {
        throw new Error('Player name already taken in this game');
      }

      const { data, error } = await supabase
        .from('game_players')
        .insert({
          game_session_id: gameId,
          player_name: playerName,
          socket_id: socketId,
          is_connected: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding player to game:', error);
      throw error;
    }
  }

  // Remove player from game
  async removePlayerFromGame(gameId, playerId) {
    try {
      const { error } = await supabase
        .from('game_players')
        .update({ is_connected: false })
        .eq('game_session_id', gameId)
        .eq('id', playerId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing player from game:', error);
      throw error;
    }
  }

  // Get all players in a game
  async getGamePlayers(gameId) {
    try {
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_session_id', gameId)
        .eq('is_connected', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting game players:', error);
      return [];
    }
  }

  // Get leaderboard (replaces Redis sorted sets)
  async getLeaderboard(gameId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('game_leaderboards')
        .select('*')
        .eq('game_session_id', gameId)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Update player score
  async updatePlayerScore(playerId, score) {
    try {
      const { data, error } = await supabase
        .from('game_players')
        .update({ score })
        .eq('id', playerId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating player score:', error);
      throw error;
    }
  }

  // Submit player answer (replaces Redis answer batching)
  async submitAnswer(gameId, playerId, questionIndex, selectedAnswer, timeTaken) {
    try {
      // Get the correct answer from the quiz
      const gameSession = await this.getGameSession(gameId);
      const question = gameSession.quizzes.questions[questionIndex];
      const isCorrect = selectedAnswer === question.correct_answer;
      
      // Calculate points (time-based scoring)
      const maxPoints = 1000;
      const timeBonus = Math.max(0, maxPoints - (timeTaken / 10)); // 10ms = 1 point deduction
      const pointsEarned = isCorrect ? Math.round(timeBonus) : 0;

      const { data, error } = await supabase
        .from('player_answers')
        .insert({
          game_session_id: gameId,
          player_id: playerId,
          question_index: questionIndex,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          time_taken: timeTaken,
          points_earned: pointsEarned
        })
        .select()
        .single();

      if (error) throw error;

      // Update player's total score
      const { data: player } = await supabase
        .from('game_players')
        .select('score')
        .eq('id', playerId)
        .single();

      const newScore = (player?.score || 0) + pointsEarned;
      await this.updatePlayerScore(playerId, newScore);

      return { ...data, new_score: newScore };
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  // Broadcast game event (replaces Socket.io)
  async broadcastGameEvent(gameId, eventType, eventData = {}) {
    try {
      const { data, error } = await supabase
        .from('game_events')
        .insert({
          game_session_id: gameId,
          event_type: eventType,
          event_data: eventData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error broadcasting game event:', error);
      throw error;
    }
  }

  // Start game
  async startGame(gameId) {
    try {
      const updatedGame = await this.updateGameSession(gameId, {
        status: 'active',
        current_question_index: 0
      });

      await this.broadcastGameEvent(gameId, 'game_started', {
        message: 'Game has started!',
        current_question_index: 0
      });

      return updatedGame;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  }

  // Next question
  async nextQuestion(gameId) {
    try {
      const gameSession = await this.getGameSession(gameId);
      const nextIndex = gameSession.current_question_index + 1;
      
      if (nextIndex >= gameSession.quizzes.questions.length) {
        return await this.endGame(gameId);
      }

      const updatedGame = await this.updateGameSession(gameId, {
        current_question_index: nextIndex
      });

      await this.broadcastGameEvent(gameId, 'next_question', {
        question_index: nextIndex,
        question: gameSession.quizzes.questions[nextIndex]
      });

      return updatedGame;
    } catch (error) {
      console.error('Error moving to next question:', error);
      throw error;
    }
  }

  // End game
  async endGame(gameId) {
    try {
      const updatedGame = await this.updateGameSession(gameId, {
        status: 'ended'
      });

      const leaderboard = await this.getLeaderboard(gameId);

      await this.broadcastGameEvent(gameId, 'game_ended', {
        message: 'Game has ended!',
        final_leaderboard: leaderboard
      });

      return updatedGame;
    } catch (error) {
      console.error('Error ending game:', error);
      throw error;
    }
  }

  // Subscribe to game events (replaces Socket.io rooms)
  subscribeToGameEvents(gameId, callback) {
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `game_session_id=eq.${gameId}`
        },
        callback
      )
      .subscribe();

    return channel;
  }

  // Subscribe to player changes
  subscribeToPlayerChanges(gameId, callback) {
    const channel = supabase
      .channel(`players:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_session_id=eq.${gameId}`
        },
        callback
      )
      .subscribe();

    return channel;
  }

  // Subscribe to game session changes
  subscribeToGameSession(gameId, callback) {
    const channel = supabase
      .channel(`session:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameId}`
        },
        callback
      )
      .subscribe();

    return channel;
  }

  // Clean up expired games
  async cleanupExpiredGames() {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_games');

      if (error) throw error;
      console.log(`Cleaned up ${data} expired games`);
      return data;
    } catch (error) {
      console.error('Error cleaning up expired games:', error);
      return 0;
    }
  }
}

module.exports = new GameService();