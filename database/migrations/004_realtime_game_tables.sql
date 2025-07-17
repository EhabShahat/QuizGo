-- Real-time game tables for Supabase-only architecture
-- This replaces Redis functionality with PostgreSQL tables

-- Game sessions table (replaces Redis game sessions)
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_pin VARCHAR(6) UNIQUE NOT NULL,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'starting', 'active', 'paused', 'ended')),
  current_question_index INTEGER DEFAULT 0,
  player_count INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '4 hours')
);

-- Game players table (replaces Redis player sessions)
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  socket_id VARCHAR(100),
  score INTEGER DEFAULT 0,
  is_connected BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_session_id, player_name)
);

-- Game events table (for real-time communication)
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player answers table (replaces Redis answer batching)
CREATE TABLE IF NOT EXISTS player_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES game_players(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,
  selected_answer INTEGER,
  is_correct BOOLEAN,
  time_taken INTEGER, -- milliseconds
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboards view (replaces Redis sorted sets)
CREATE OR REPLACE VIEW game_leaderboards AS
SELECT 
  gp.game_session_id,
  gp.id as player_id,
  gp.player_name,
  gp.score,
  ROW_NUMBER() OVER (PARTITION BY gp.game_session_id ORDER BY gp.score DESC, gp.joined_at ASC) as rank
FROM game_players gp
WHERE gp.is_connected = true
ORDER BY gp.game_session_id, gp.score DESC;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_pin ON game_sessions(game_pin);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_expires ON game_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_game_players_session ON game_players(game_session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_session ON game_events(game_session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_player_answers_session ON player_answers(game_session_id, question_index);
CREATE INDEX IF NOT EXISTS idx_leaderboard_lookup ON game_players(game_session_id, score DESC);

-- Function to generate unique game PIN
CREATE OR REPLACE FUNCTION generate_game_pin()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_pin VARCHAR(6);
  pin_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-digit PIN
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if PIN already exists in active games
    SELECT EXISTS(
      SELECT 1 FROM game_sessions 
      WHERE game_pin = new_pin 
      AND status IN ('waiting', 'starting', 'active', 'paused')
      AND expires_at > NOW()
    ) INTO pin_exists;
    
    -- If PIN doesn't exist, return it
    IF NOT pin_exists THEN
      RETURN new_pin;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update player count
CREATE OR REPLACE FUNCTION update_player_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE game_sessions 
    SET player_count = (
      SELECT COUNT(*) FROM game_players 
      WHERE game_session_id = NEW.game_session_id 
      AND is_connected = true
    )
    WHERE id = NEW.game_session_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE game_sessions 
    SET player_count = (
      SELECT COUNT(*) FROM game_players 
      WHERE game_session_id = NEW.game_session_id 
      AND is_connected = true
    )
    WHERE id = NEW.game_session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE game_sessions 
    SET player_count = (
      SELECT COUNT(*) FROM game_players 
      WHERE game_session_id = OLD.game_session_id 
      AND is_connected = true
    )
    WHERE id = OLD.game_session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers to maintain player count
DROP TRIGGER IF EXISTS trigger_update_player_count_insert ON game_players;
CREATE TRIGGER trigger_update_player_count_insert
  AFTER INSERT ON game_players
  FOR EACH ROW EXECUTE FUNCTION update_player_count();

DROP TRIGGER IF EXISTS trigger_update_player_count_update ON game_players;
CREATE TRIGGER trigger_update_player_count_update
  AFTER UPDATE ON game_players
  FOR EACH ROW EXECUTE FUNCTION update_player_count();

DROP TRIGGER IF EXISTS trigger_update_player_count_delete ON game_players;
CREATE TRIGGER trigger_update_player_count_delete
  AFTER DELETE ON game_players
  FOR EACH ROW EXECUTE FUNCTION update_player_count();

-- Function to clean up expired games
CREATE OR REPLACE FUNCTION cleanup_expired_games()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM game_sessions 
  WHERE expires_at < NOW() 
  AND status = 'ended';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Enable real-time for all game tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
ALTER PUBLICATION supabase_realtime ADD TABLE player_answers;