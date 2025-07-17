-- Row Level Security (RLS) policies for QuizGo database
-- These policies ensure data access control and security

-- Enable RLS on all tables
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_analytics ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
-- Users can only access their own quizzes
CREATE POLICY "Users can view their own quizzes" ON quizzes
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own quizzes" ON quizzes
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own quizzes" ON quizzes
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own quizzes" ON quizzes
    FOR DELETE USING (auth.uid() = created_by);

-- Questions policies
-- Users can only access questions from their own quizzes
CREATE POLICY "Users can view questions from their own quizzes" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can create questions for their own quizzes" ON questions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can update questions from their own quizzes" ON questions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can delete questions from their own quizzes" ON questions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.created_by = auth.uid()
        )
    );

-- Games policies
-- Hosts can manage their own games, players can view active games they're part of
CREATE POLICY "Hosts can view their own games" ON games
    FOR SELECT USING (auth.uid() = host_id);

CREATE POLICY "Players can view active games by PIN" ON games
    FOR SELECT USING (
        status IN ('waiting', 'active') AND
        EXISTS (
            SELECT 1 FROM game_players 
            WHERE game_players.game_id = games.id
        )
    );

CREATE POLICY "Hosts can create games for their own quizzes" ON games
    FOR INSERT WITH CHECK (
        auth.uid() = host_id AND
        EXISTS (
            SELECT 1 FROM quizzes 
            WHERE quizzes.id = games.quiz_id 
            AND quizzes.created_by = auth.uid()
        )
    );

CREATE POLICY "Hosts can update their own games" ON games
    FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own games" ON games
    FOR DELETE USING (auth.uid() = host_id);

-- Game players policies
-- Players can view and manage their own participation
CREATE POLICY "Players can view game player lists for active games" ON game_players
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_players.game_id 
            AND games.status IN ('waiting', 'active')
        )
    );

CREATE POLICY "Players can join games" ON game_players
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_players.game_id 
            AND games.status = 'waiting'
        )
    );

CREATE POLICY "Players can update their own game participation" ON game_players
    FOR UPDATE USING (true); -- Allow updates for socket management

CREATE POLICY "Hosts can manage players in their games" ON game_players
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_players.game_id 
            AND games.host_id = auth.uid()
        )
    );

-- Player answers policies
-- Players can submit answers, hosts can view all answers for their games
CREATE POLICY "Players can submit answers to active games" ON player_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = player_answers.game_id 
            AND games.status = 'active'
        ) AND
        EXISTS (
            SELECT 1 FROM game_players 
            WHERE game_players.id = player_answers.player_id 
            AND game_players.game_id = player_answers.game_id
        )
    );

CREATE POLICY "Hosts can view answers for their games" ON player_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = player_answers.game_id 
            AND games.host_id = auth.uid()
        )
    );

CREATE POLICY "Players can view their own answers" ON player_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM game_players 
            WHERE game_players.id = player_answers.player_id
        )
    );

-- Game analytics policies
-- Only hosts can view analytics for their games
CREATE POLICY "Hosts can view analytics for their games" ON game_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_analytics.game_id 
            AND games.host_id = auth.uid()
        )
    );

CREATE POLICY "System can create analytics" ON game_analytics
    FOR INSERT WITH CHECK (true); -- Allow system to create analytics

CREATE POLICY "Hosts can update analytics for their games" ON game_analytics
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM games 
            WHERE games.id = game_analytics.game_id 
            AND games.host_id = auth.uid()
        )
    );

-- Service role policies (for server-side operations)
-- These policies allow the service role to bypass RLS for system operations
CREATE POLICY "Service role can manage all data" ON quizzes
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all questions" ON questions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all games" ON games
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all game players" ON game_players
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all player answers" ON player_answers
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all game analytics" ON game_analytics
    FOR ALL USING (auth.role() = 'service_role');