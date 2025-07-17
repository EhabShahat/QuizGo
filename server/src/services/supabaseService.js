const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class SupabaseService {
  constructor() {
    this.client = supabase;
  }

  // Quiz methods
  async createQuiz(quizData) {
    try {
      const { data, error } = await this.client
        .from('quizzes')
        .insert(quizData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating quiz:', error);
      throw error;
    }
  }

  async getQuiz(quizId) {
    try {
      const { data, error } = await this.client
        .from('quizzes')
        .select(`
          *,
          quiz_items (
            *,
            quiz_item_options (*)
          )
        `)
        .eq('id', quizId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting quiz:', error);
      throw error;
    }
  }

  async updateQuiz(quizId, updates) {
    try {
      const { data, error } = await this.client
        .from('quizzes')
        .update(updates)
        .eq('id', quizId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating quiz:', error);
      throw error;
    }
  }

  async deleteQuiz(quizId) {
    try {
      const { error } = await this.client
        .from('quizzes')
        .delete()
        .eq('id', quizId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting quiz:', error);
      throw error;
    }
  }

  async getRecentQuizzes(hostId, limit = 10) {
    try {
      const { data, error } = await this.client
        .from('quizzes')
        .select(`
          *,
          quiz_items (count)
        `)
        .eq('host_id', hostId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data?.map(quiz => ({
        ...quiz,
        question_count: quiz.quiz_items?.[0]?.count || 0,
      })) || [];
    } catch (error) {
      console.error('Error getting recent quizzes:', error);
      return [];
    }
  }

  // Quiz Items methods
  async createQuizItem(itemData) {
    try {
      const { data, error } = await this.client
        .from('quiz_items')
        .insert(itemData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating quiz item:', error);
      throw error;
    }
  }

  async updateQuizItem(itemId, updates) {
    try {
      const { data, error } = await this.client
        .from('quiz_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating quiz item:', error);
      throw error;
    }
  }

  async deleteQuizItem(itemId) {
    try {
      const { error } = await this.client
        .from('quiz_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting quiz item:', error);
      throw error;
    }
  }

  async reorderQuizItems(quizId, itemOrders) {
    try {
      const updates = itemOrders.map(({ id, order_index }) => ({
        id,
        order_index,
      }));

      const { data, error } = await this.client
        .from('quiz_items')
        .upsert(updates)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error reordering quiz items:', error);
      throw error;
    }
  }

  // Quiz Item Options methods
  async createQuizItemOptions(itemId, options) {
    try {
      const optionsData = options.map((option, index) => ({
        quiz_item_id: itemId,
        option_text: option.text || option.option_text,
        option_index: index,
        is_correct: option.isCorrect || option.is_correct || false,
      }));

      const { data, error } = await this.client
        .from('quiz_item_options')
        .insert(optionsData)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating quiz item options:', error);
      throw error;
    }
  }

  async updateQuizItemOptions(itemId, options) {
    try {
      // Delete existing options
      await this.client
        .from('quiz_item_options')
        .delete()
        .eq('quiz_item_id', itemId);
      
      // Create new options
      return await this.createQuizItemOptions(itemId, options);
    } catch (error) {
      console.error('Error updating quiz item options:', error);
      throw error;
    }
  }

  // Game methods
  async createGame(quizId, gameData = {}) {
    try {
      // Generate unique 6-digit PIN
      let pin;
      let attempts = 0;
      do {
        pin = this.generateGamePin();
        attempts++;
      } while (await this.isGamePinTaken(pin) && attempts < 10);

      if (attempts >= 10) {
        throw new Error('Failed to generate unique game PIN');
      }
      
      const { data, error } = await this.client
        .from('games')
        .insert({
          quiz_id: quizId,
          pin,
          status: 'waiting',
          ...gameData,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating game:', error);
      throw error;
    }
  }

  async getGame(gameId) {
    try {
      const { data, error } = await this.client
        .from('games')
        .select(`
          *,
          quizzes (
            *,
            quiz_items (
              *,
              quiz_item_options (*)
            )
          )
        `)
        .eq('id', gameId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting game:', error);
      throw error;
    }
  }

  async getGameByPin(pin) {
    try {
      const { data, error } = await this.client
        .from('games')
        .select(`
          *,
          quizzes (
            *,
            quiz_items (
              *,
              quiz_item_options (*)
            )
          )
        `)
        .eq('pin', pin)
        .in('status', ['waiting', 'active'])
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error getting game by PIN:', error);
      return null;
    }
  }

  async updateGame(gameId, updates) {
    try {
      const { data, error } = await this.client
        .from('games')
        .update(updates)
        .eq('id', gameId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  }

  async isGamePinTaken(pin) {
    try {
      const { data, error } = await this.client
        .from('games')
        .select('id')
        .eq('pin', pin)
        .in('status', ['waiting', 'active'])
        .single();
      
      if (error && error.code === 'PGRST116') {
        return false; // No rows found, PIN is available
      }
      
      return data !== null;
    } catch (error) {
      console.error('Error checking game PIN:', error);
      return true; // Assume taken on error to be safe
    }
  }

  // Player methods
  async createOrUpdatePlayer(gameId, playerData) {
    try {
      const { data, error } = await this.client
        .from('game_players')
        .upsert({
          game_id: gameId,
          ...playerData,
          last_activity: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating/updating player:', error);
      throw error;
    }
  }

  async getGamePlayers(gameId) {
    try {
      const { data, error } = await this.client
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting game players:', error);
      return [];
    }
  }

  async updatePlayer(playerId, updates) {
    try {
      const { data, error } = await this.client
        .from('game_players')
        .update({
          ...updates,
          last_activity: new Date().toISOString(),
        })
        .eq('id', playerId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating player:', error);
      throw error;
    }
  }

  async removePlayer(playerId) {
    try {
      const { error } = await this.client
        .from('game_players')
        .delete()
        .eq('id', playerId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing player:', error);
      throw error;
    }
  }

  // Answer methods
  async createAnswer(answerData) {
    try {
      const { data, error } = await this.client
        .from('player_answers')
        .insert(answerData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  async bulkCreateAnswers(answersData) {
    try {
      const { data, error } = await this.client
        .from('player_answers')
        .insert(answersData)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error bulk creating answers:', error);
      throw error;
    }
  }

  async getQuestionAnswers(gameId, questionIndex) {
    try {
      const { data, error } = await this.client
        .from('player_answers')
        .select(`
          *,
          game_players (nickname)
        `)
        .eq('game_id', gameId)
        .eq('question_index', questionIndex);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting question answers:', error);
      return [];
    }
  }

  // Analytics methods
  async createGameAnalytics(gameId, questionIndex, analyticsData) {
    try {
      const { data, error } = await this.client
        .from('game_analytics')
        .insert({
          game_id: gameId,
          question_index: questionIndex,
          ...analyticsData,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating game analytics:', error);
      throw error;
    }
  }

  async getGameAnalytics(gameId) {
    try {
      const { data, error } = await this.client
        .from('game_analytics')
        .select('*')
        .eq('game_id', gameId)
        .order('question_index', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting game analytics:', error);
      return [];
    }
  }

  // Dashboard stats
  async getDashboardStats(hostId) {
    try {
      // Get quiz count
      const { count: quizCount } = await this.client
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', hostId);

      // Get game count
      const { count: gameCount } = await this.client
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', hostId);

      // Get total players across all games
      const { data: games } = await this.client
        .from('games')
        .select('id')
        .eq('host_id', hostId);

      let totalPlayers = 0;
      if (games && games.length > 0) {
        const gameIds = games.map(g => g.id);
        const { count: playerCount } = await this.client
          .from('game_players')
          .select('*', { count: 'exact', head: true })
          .in('game_id', gameIds);
        
        totalPlayers = playerCount || 0;
      }

      return {
        totalQuizzes: quizCount || 0,
        totalGames: gameCount || 0,
        totalPlayers,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalQuizzes: 0,
        totalGames: 0,
        totalPlayers: 0,
      };
    }
  }

  // File upload methods
  async uploadFile(bucket, path, file) {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file);
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async getFileUrl(bucket, path) {
    try {
      const { data } = this.client.storage
        .from(bucket)
        .getPublicUrl(path);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  async deleteFile(bucket, path) {
    try {
      const { error } = await this.client.storage
        .from(bucket)
        .remove([path]);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Utility methods
  generateGamePin() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Real-time subscriptions
  subscribeToGame(gameId, callback) {
    return this.client
      .channel(`game:${gameId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'games',
          filter: `id=eq.${gameId}`
        }, 
        callback
      )
      .subscribe();
  }

  subscribeToGamePlayers(gameId, callback) {
    return this.client
      .channel(`game_players:${gameId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'game_players',
          filter: `game_id=eq.${gameId}`
        }, 
        callback
      )
      .subscribe();
  }

  unsubscribe(subscription) {
    if (subscription) {
      this.client.removeChannel(subscription);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const { data, error } = await this.client
        .from('quizzes')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }
}

// Create singleton instance
const supabaseService = new SupabaseService();

module.exports = { supabaseService };