-- QuizGo Core Database Schema
-- Initial migration to create core tables for quizzes, questions, and games

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT quizzes_title_not_empty CHECK (length(trim(title)) > 0)
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'multiple_choice',
    options JSONB NOT NULL,
    correct_answer JSONB NOT NULL,
    points INTEGER DEFAULT 100,
    time_limit INTEGER DEFAULT 30,
    media_url TEXT,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT questions_text_not_empty CHECK (length(trim(question_text)) > 0),
    CONSTRAINT questions_points_positive CHECK (points > 0),
    CONSTRAINT questions_time_limit_positive CHECK (time_limit > 0),
    CONSTRAINT questions_order_index_non_negative CHECK (order_index >= 0),
    CONSTRAINT questions_valid_type CHECK (question_type IN ('multiple_choice', 'true_false', 'multiple_select'))
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pin VARCHAR(6) UNIQUE NOT NULL,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'waiting',
    current_question INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT games_pin_format CHECK (pin ~ '^[0-9]{6}$'),
    CONSTRAINT games_valid_status CHECK (status IN ('waiting', 'active', 'ended')),
    CONSTRAINT games_current_question_non_negative CHECK (current_question >= 0),
    CONSTRAINT games_started_after_created CHECK (started_at IS NULL OR started_at >= created_at),
    CONSTRAINT games_ended_after_started CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

-- Create game_players table for tracking players in games
CREATE TABLE IF NOT EXISTS game_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    nickname VARCHAR(50) NOT NULL,
    socket_id VARCHAR(100),
    score INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_connected BOOLEAN DEFAULT true,
    
    CONSTRAINT game_players_nickname_not_empty CHECK (length(trim(nickname)) > 0),
    CONSTRAINT game_players_score_non_negative CHECK (score >= 0),
    CONSTRAINT game_players_unique_nickname_per_game UNIQUE (game_id, nickname)
);

-- Create player_answers table for tracking player responses
CREATE TABLE IF NOT EXISTS player_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    selected_answer JSONB,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT player_answers_question_index_non_negative CHECK (question_index >= 0),
    CONSTRAINT player_answers_points_non_negative CHECK (points_earned >= 0),
    CONSTRAINT player_answers_response_time_non_negative CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
    CONSTRAINT player_answers_unique_per_question UNIQUE (game_id, player_id, question_index)
);

-- Create game_analytics table for storing game statistics
CREATE TABLE IF NOT EXISTS game_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    total_players INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    average_response_time_ms INTEGER,
    difficulty_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT game_analytics_question_index_non_negative CHECK (question_index >= 0),
    CONSTRAINT game_analytics_total_players_positive CHECK (total_players > 0),
    CONSTRAINT game_analytics_correct_answers_non_negative CHECK (correct_answers >= 0),
    CONSTRAINT game_analytics_correct_answers_not_exceed_total CHECK (correct_answers <= total_players),
    CONSTRAINT game_analytics_response_time_non_negative CHECK (average_response_time_ms IS NULL OR average_response_time_ms >= 0),
    CONSTRAINT game_analytics_difficulty_range CHECK (difficulty_score IS NULL OR (difficulty_score >= 0 AND difficulty_score <= 1)),
    CONSTRAINT game_analytics_unique_per_question UNIQUE (game_id, question_index)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_quizzes_updated_at 
    BEFORE UPDATE ON quizzes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();