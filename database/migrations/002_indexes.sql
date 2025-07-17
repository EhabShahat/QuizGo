-- Performance optimization indexes for QuizGo database

-- Indexes for games table (most critical for real-time lookups)
CREATE INDEX IF NOT EXISTS idx_games_pin ON games(pin);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_host_id ON games(host_id);
CREATE INDEX IF NOT EXISTS idx_games_quiz_id ON games(quiz_id);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);

-- Indexes for questions table (for quiz loading performance)
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);

-- Indexes for quizzes table (for quiz management)
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_active ON quizzes(is_active);
CREATE INDEX IF NOT EXISTS idx_quizzes_title ON quizzes USING gin(to_tsvector('english', title));

-- Indexes for game_players table (for real-time player management)
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_socket_id ON game_players(socket_id);
CREATE INDEX IF NOT EXISTS idx_game_players_joined_at ON game_players(joined_at);
CREATE INDEX IF NOT EXISTS idx_game_players_last_activity ON game_players(last_activity);
CREATE INDEX IF NOT EXISTS idx_game_players_is_connected ON game_players(is_connected);

-- Indexes for player_answers table (for scoring and analytics)
CREATE INDEX IF NOT EXISTS idx_player_answers_game_id ON player_answers(game_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_player_id ON player_answers(player_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_question_index ON player_answers(question_index);
CREATE INDEX IF NOT EXISTS idx_player_answers_game_question ON player_answers(game_id, question_index);
CREATE INDEX IF NOT EXISTS idx_player_answers_answered_at ON player_answers(answered_at);
CREATE INDEX IF NOT EXISTS idx_player_answers_is_correct ON player_answers(is_correct);

-- Indexes for game_analytics table (for reporting)
CREATE INDEX IF NOT EXISTS idx_game_analytics_game_id ON game_analytics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_analytics_question_index ON game_analytics(question_index);
CREATE INDEX IF NOT EXISTS idx_game_analytics_created_at ON game_analytics(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_games_active_by_host ON games(host_id, status) WHERE status IN ('waiting', 'active');
CREATE INDEX IF NOT EXISTS idx_questions_quiz_order ON questions(quiz_id, order_index) WHERE quiz_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_player_answers_scoring ON player_answers(game_id, player_id, points_earned);
CREATE INDEX IF NOT EXISTS idx_game_players_active ON game_players(game_id, is_connected) WHERE is_connected = true;