import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

class SupabaseService {
  constructor() {
    this.client = supabase;
  }

  // Auth methods
  async signUp(email, password, userData = {}) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    
    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async getCurrentUser() {
    const { data: { user }, error } = await this.client.auth.getUser();
    if (error) throw error;
    return user;
  }

  // Quiz methods
  async createQuiz(quizData) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await this.client
      .from('quizzes')
      .insert({
        ...quizData,
        host_id: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getQuiz(quizId) {
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
  }

  async updateQuiz(quizId, updates) {
    const { data, error } = await this.client
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteQuiz(quizId) {
    const { error } = await this.client
      .from('quizzes')
      .delete()
      .eq('id', quizId);
    
    if (error) throw error;
  }

  async getRecentQuizzes(limit = 10) {
    const user = await this.getCurrentUser();
    if (!user) return [];

    const { data, error } = await this.client
      .from('quizzes')
      .select(`
        *,
        quiz_items (count)
      `)
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent quizzes:', error);
      return [];
    }
    
    return data?.map(quiz => ({
      ...quiz,
      question_count: quiz.quiz_items?.[0]?.count || 0,
    })) || [];
  }

  // Quiz Items methods
  async createQuizItem(quizId, itemData) {
    const { data, error } = await this.client
      .from('quiz_items')
      .insert({
        quiz_id: quizId,
        ...itemData,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateQuizItem(itemId, updates) {
    const { data, error } = await this.client
      .from('quiz_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteQuizItem(itemId) {
    const { error } = await this.client
      .from('quiz_items')
      .delete()
      .eq('id', itemId);
    
    if (error) throw error;
  }

  // Quiz Item Options methods
  async createQuizItemOptions(itemId, options) {
    const optionsData = options.map((option, index) => ({
      quiz_item_id: itemId,
      option_text: option.text,
      option_index: index,
      is_correct: option.isCorrect || false,
    }));

    const { data, error } = await this.client
      .from('quiz_item_options')
      .insert(optionsData)
      .select();
    
    if (error) throw error;
    return data;
  }

  async updateQuizItemOptions(itemId, options) {
    // Delete existing options
    await this.client
      .from('quiz_item_options')
      .delete()
      .eq('quiz_item_id', itemId);
    
    // Create new options
    return this.createQuizItemOptions(itemId, options);
  }

  // Game methods
  async createGame(quizId, gameData = {}) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('User not authenticated');

    // Generate unique 6-digit PIN
    const pin = this.generateGamePin();
    
    const { data, error } = await this.client
      .from('games')
      .insert({
        quiz_id: quizId,
        host_id: user.id,
        pin,
        status: 'waiting',
        ...gameData,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getGame(gameId) {
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
  }

  async getGameByPin(pin) {
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
      .eq('status', 'waiting')
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateGame(gameId, updates) {
    const { data, error } = await this.client
      .from('games')
      .update(updates)
      .eq('id', gameId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Player methods
  async createPlayer(gameId, playerData) {
    const { data, error } = await this.client
      .from('game_players')
      .insert({
        game_id: gameId,
        ...playerData,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getGamePlayers(gameId) {
    const { data, error } = await this.client
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  async updatePlayer(playerId, updates) {
    const { data, error } = await this.client
      .from('game_players')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Answer methods
  async createAnswer(answerData) {
    const { data, error } = await this.client
      .from('player_answers')
      .insert(answerData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getQuestionAnswers(gameId, questionIndex) {
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
  }

  // Analytics methods
  async createGameAnalytics(analyticsData) {
    const { data, error } = await this.client
      .from('game_analytics')
      .insert(analyticsData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getGameAnalytics(gameId) {
    const { data, error } = await this.client
      .from('game_analytics')
      .select('*')
      .eq('game_id', gameId)
      .order('question_index', { ascending: true });
    
    if (error) throw error;
    return data || [];
  }

  // Dashboard stats
  async getDashboardStats() {
    const user = await this.getCurrentUser();
    if (!user) return null;

    try {
      // Get quiz count
      const { count: quizCount } = await this.client
        .from('quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', user.id);

      // Get game count
      const { count: gameCount } = await this.client
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', user.id);

      // Get total players across all games
      const { data: playerData } = await this.client
        .from('game_players')
        .select('game_id')
        .in('game_id', 
          await this.client
            .from('games')
            .select('id')
            .eq('host_id', user.id)
        );

      return {
        totalQuizzes: quizCount || 0,
        totalGames: gameCount || 0,
        totalPlayers: playerData?.length || 0,
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
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file);
    
    if (error) throw error;
    return data;
  }

  async getFileUrl(bucket, path) {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
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
}

// Create singleton instance
const supabaseService = new SupabaseService();

export { supabaseService };