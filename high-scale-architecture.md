# High-Scale Architecture for 200+ Players

## 🚀 Scalability Strategy

### Infrastructure Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│  Node.js Cluster│────│   Supabase DB   │
│   (nginx/AWS)   │    │  (Multiple Inst)│    │  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │  Redis Cluster  │              │
         │              │ (Session/Cache) │              │
         │              └─────────────────┘              │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Supabase Storage│    │  Socket.io with │    │   Monitoring    │
│   (CDN/Media)   │    │  Redis Adapter  │    │ (Logs/Metrics)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Supabase Integration

### Database Schema (Optimized)
```sql
-- Games table with indexing for performance
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin VARCHAR(6) UNIQUE NOT NULL,
  quiz_id UUID REFERENCES quizzes(id),
  host_id UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'waiting',
  game_mode VARCHAR(20) DEFAULT 'dual_screen', -- 'dual_screen' or 'normal'
  current_question INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  ended_at TIMESTAMP
);

-- Optimized indexes for high-scale queries
CREATE INDEX idx_games_pin ON games(pin);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_created_at ON games(created_at);

-- Players table with bulk operations support
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  nickname VARCHAR(50) NOT NULL,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

-- Composite index for fast player lookups
CREATE INDEX idx_game_players_game_nickname ON game_players(game_id, nickname);

-- Answers table optimized for bulk inserts
CREATE TABLE player_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  player_id UUID REFERENCES game_players(id),
  question_index INTEGER NOT NULL,
  answer_index INTEGER NOT NULL,
  answered_at TIMESTAMP DEFAULT NOW(),
  response_time INTEGER -- milliseconds
);

-- Partitioned by game_id for better performance
CREATE INDEX idx_answers_game_question ON player_answers(game_id, question_index);

-- Quizzes table with background settings
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  host_id UUID REFERENCES auth.users(id),
  background_type VARCHAR(20) DEFAULT 'gradient', -- 'gradient', 'image', 'solid'
  background_value TEXT, -- gradient CSS, image URL, or color hex
  background_overlay BOOLEAN DEFAULT true, -- dark overlay for text readability
  overlay_opacity DECIMAL(3,2) DEFAULT 0.4, -- 0.0 to 1.0
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Quiz items table (questions and slides with flexible ordering)
CREATE TABLE quiz_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- 'question' or 'slide'
  question_type VARCHAR(30) DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'multiple_select', 'ordering', 'matching', 'fill_blank', 'image_hotspot'
  order_index INTEGER NOT NULL,
  title TEXT,
  content TEXT, -- Question text or slide content
  media_url TEXT, -- Image/GIF from Supabase Storage
  media_type VARCHAR(20), -- 'image', 'gif', 'video', 'youtube', 'vimeo'
  font_size VARCHAR(20) DEFAULT 'auto', -- 'small', 'medium', 'large', 'auto'
  is_scored BOOLEAN DEFAULT true, -- false for slides/info screens
  is_double_points BOOLEAN DEFAULT false, -- power-up: double points
  time_limit INTEGER DEFAULT 30, -- seconds
  points INTEGER DEFAULT 1000,
  presenter_notes TEXT, -- private notes for host
  hotspot_data JSONB, -- for image hotspot questions
  correct_order JSONB, -- for ordering questions
  matching_pairs JSONB, -- for matching questions
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Answer options for questions only
CREATE TABLE quiz_item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_item_id UUID REFERENCES quiz_items(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_index INTEGER NOT NULL, -- 0=red, 1=blue, 2=yellow, 3=green
  is_correct BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_quiz_items_quiz_order ON quiz_items(quiz_id, order_index);
CREATE INDEX idx_quiz_items_type ON quiz_items(item_type);
CREATE INDEX idx_quiz_options_item ON quiz_item_options(quiz_item_id);

-- Enhanced quiz items for advanced question types
ALTER TABLE quiz_items ADD COLUMN question_type VARCHAR(30) DEFAULT 'multiple_choice';
-- 'multiple_choice', 'true_false', 'multiple_select', 'ordering', 'matching', 'fill_blank', 'image_hotspot'
ALTER TABLE quiz_items ADD COLUMN has_double_points BOOLEAN DEFAULT false;
ALTER TABLE quiz_items ADD COLUMN hotspot_data JSONB; -- For image hotspot coordinates
ALTER TABLE quiz_items ADD COLUMN matching_pairs JSONB; -- For matching questions
ALTER TABLE quiz_items ADD COLUMN correct_order JSONB; -- For ordering questions
ALTER TABLE quiz_items ADD COLUMN blank_answers JSONB; -- For fill in the blank

-- Player profiles and social features
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  level_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Achievement system
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_color VARCHAR(20),
  requirement_type VARCHAR(30), -- 'games_played', 'streak', 'points', 'accuracy'
  requirement_value INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES player_profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

-- Advanced analytics
CREATE TABLE game_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  question_index INTEGER,
  total_responses INTEGER DEFAULT 0,
  correct_responses INTEGER DEFAULT 0,
  avg_response_time DECIMAL(8,3), -- seconds
  answer_distribution JSONB, -- {0: 5, 1: 12, 2: 3, 3: 4} for each option
  difficulty_score DECIMAL(3,2), -- 0.0 to 1.0 based on success rate
  engagement_score DECIMAL(3,2), -- based on response time and participation
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled quizzes and tournaments
CREATE TABLE scheduled_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  host_id UUID REFERENCES auth.users(id),
  title VARCHAR(255),
  scheduled_start TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_players INTEGER DEFAULT 200,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(20), -- 'daily', 'weekly', 'monthly'
  tournament_type VARCHAR(20), -- 'single', 'bracket', 'league'
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'cancelled'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-language support
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(30), -- 'quiz', 'question', 'ui_text'
  resource_id UUID,
  language_code VARCHAR(5), -- 'en', 'ar', 'es', etc.
  field_name VARCHAR(50), -- 'title', 'content', 'option_text'
  translated_text TEXT,
  is_rtl BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization and white labeling
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(100) UNIQUE, -- custom.quizgo.app
  logo_url TEXT,
  primary_color VARCHAR(7), -- hex color
  secondary_color VARCHAR(7),
  custom_css TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_tier VARCHAR(20) DEFAULT 'basic',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced games table for advanced features
ALTER TABLE games ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE games ADD COLUMN game_type VARCHAR(20) DEFAULT 'live'; -- 'live', 'homework', 'tournament'
ALTER TABLE games ADD COLUMN allow_spectators BOOLEAN DEFAULT false;
ALTER TABLE games ADD COLUMN enable_powerups BOOLEAN DEFAULT true;
ALTER TABLE games ADD COLUMN enable_streaks BOOLEAN DEFAULT true;
ALTER TABLE games ADD COLUMN enable_speed_bonus BOOLEAN DEFAULT true;
ALTER TABLE games ADD COLUMN comeback_boost BOOLEAN DEFAULT true;

-- Enhanced quiz items for advanced question types
ALTER TABLE quiz_items ADD COLUMN question_type VARCHAR(30) DEFAULT 'multiple_choice';
-- 'multiple_choice', 'true_false', 'multiple_select', 'ordering', 'matching', 'fill_blank', 'image_hotspot'
ALTER TABLE quiz_items ADD COLUMN has_double_points BOOLEAN DEFAULT false;
ALTER TABLE quiz_items ADD COLUMN hotspot_data JSONB; -- For image hotspot coordinates
ALTER TABLE quiz_items ADD COLUMN matching_pairs JSONB; -- For matching questions
ALTER TABLE quiz_items ADD COLUMN correct_order JSONB; -- For ordering questions

-- Player profiles and achievements
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  username VARCHAR(50) UNIQUE NOT NULL,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Achievement system
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_color VARCHAR(20),
  requirement_type VARCHAR(30), -- 'games_played', 'streak', 'points', 'speed'
  requirement_value INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES player_profiles(id),
  achievement_id UUID REFERENCES achievements(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

-- Advanced analytics
CREATE TABLE game_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  question_index INTEGER,
  total_players INTEGER,
  correct_answers INTEGER,
  avg_response_time DECIMAL(5,2),
  difficulty_score DECIMAL(3,2), -- 0.0 to 1.0
  engagement_score DECIMAL(3,2), -- 0.0 to 1.0
  created_at TIMESTAMP DEFAULT NOW()
);

-- Social features
CREATE TABLE quiz_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  player_id UUID REFERENCES player_profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Collaborative creation
CREATE TABLE quiz_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  user_id UUID REFERENCES auth.users(id),
  permission_level VARCHAR(20) DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
  added_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled quizzes
CREATE TABLE scheduled_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  host_id UUID REFERENCES auth.users(id),
  scheduled_time TIMESTAMP NOT NULL,
  recurrence_pattern VARCHAR(20), -- 'none', 'daily', 'weekly', 'monthly'
  max_players INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Internationalization
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL,
  language_code VARCHAR(5) NOT NULL, -- 'en', 'ar'
  translation TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(key, language_code)
);

-- Custom themes and branding
CREATE TABLE custom_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES auth.users(id),
  theme_name VARCHAR(100) NOT NULL,
  primary_color VARCHAR(7), -- hex color
  secondary_color VARCHAR(7),
  logo_url TEXT,
  custom_css TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Supabase Storage Structure
```
quizgo-bucket/
├── quizzes/
│   ├── {quiz_id}/
│   │   ├── cover.jpg
│   │   ├── background.jpg              -- Quiz wallpaper/background
│   │   ├── items/
│   │   │   ├── {item_id}_image.jpg
│   │   │   ├── {item_id}_animation.gif
│   │   │   ├── {item_id}_video.mp4
│   │   │   └── {item_id}_slide_bg.png
│   │   └── thumbnails/
│   │       ├── {item_id}_thumb.jpg
│   │       ├── {item_id}_preview.jpg
│   │       └── background_thumb.jpg    -- Background thumbnail
├── backgrounds/
│   ├── gradients/
│   │   ├── purple_blue.css             -- CSS gradient definitions
│   │   ├── sunset_orange.css
│   │   ├── ocean_teal.css
│   │   └── forest_green.css
│   ├── patterns/
│   │   ├── geometric_1.jpg
│   │   ├── abstract_waves.jpg
│   │   ├── education_theme.jpg
│   │   └── corporate_clean.jpg
│   └── solid_colors/
│       ├── deep_purple.jpg
│       ├── midnight_blue.jpg
│       └── charcoal_gray.jpg
├── templates/
│   ├── slide_backgrounds/
│   │   ├── gradient_1.jpg
│   │   ├── pattern_1.png
│   │   └── corporate_1.jpg
├── avatars/
│   └── {user_id}/
│       └── profile.jpg
└── exports/
    └── {game_id}/
        ├── results.json
        └── analytics.json
```

## ⚡ Performance Optimizations

### 1. Connection Management
```javascript
// Socket.io with Redis adapter for clustering
const io = require('socket.io')(server, {
  adapter: require('socket.io-redis')({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }),
  // Optimize for high concurrency
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  // Connection limits per IP
  allowEIO3: true
});

// Rate limiting for connections
const rateLimit = require('express-rate-limit');
const connectionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 connections per windowMs
  message: 'Too many connection attempts'
});
```

### 2. Answer Collection Optimization
```javascript
// Batch answer processing every 100ms
const answerBatch = [];
const BATCH_SIZE = 50;
const BATCH_INTERVAL = 100;

setInterval(async () => {
  if (answerBatch.length > 0) {
    const batch = answerBatch.splice(0, BATCH_SIZE);
    await processBulkAnswers(batch);
  }
}, BATCH_INTERVAL);

// Bulk insert to Supabase
async function processBulkAnswers(answers) {
  const { error } = await supabase
    .from('player_answers')
    .insert(answers);
  
  if (!error) {
    // Update leaderboard cache
    updateLeaderboardCache(answers);
  }
}
```

### 3. Leaderboard Caching Strategy
```javascript
// Redis-based leaderboard caching
class LeaderboardCache {
  constructor(gameId) {
    this.gameId = gameId;
    this.key = `leaderboard:${gameId}`;
  }

  async updateScore(playerId, score) {
    await redis.zadd(this.key, score, playerId);
    await redis.expire(this.key, 3600); // 1 hour TTL
  }

  async getTop(limit = 10) {
    return await redis.zrevrange(this.key, 0, limit - 1, 'WITHSCORES');
  }

  async broadcastUpdate() {
    const top10 = await this.getTop(10);
    io.to(`game:${this.gameId}`).emit('leaderboard-update', top10);
  }
}
```

## 🔄 Real-time Event Optimization

### Event Broadcasting Strategy
```javascript
// Optimized event broadcasting for 200+ players
class GameBroadcaster {
  constructor(gameId) {
    this.gameId = gameId;
    this.room = `game:${gameId}`;
  }

  // Broadcast to all players with compression
  broadcastToPlayers(event, data) {
    io.to(this.room).compress(true).emit(event, data);
  }

  // Broadcast only to host
  broadcastToHost(event, data) {
    io.to(`host:${this.gameId}`).emit(event, data);
  }

  // Staggered broadcasting for large data
  async staggeredBroadcast(event, data, batchSize = 50) {
    const sockets = await io.in(this.room).fetchSockets();
    
    for (let i = 0; i < sockets.length; i += batchSize) {
      const batch = sockets.slice(i, i + batchSize);
      batch.forEach(socket => socket.emit(event, data));
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
```

### Question Timer Synchronization
```javascript
// Distributed timer with Redis
class DistributedTimer {
  constructor(gameId, duration) {
    this.gameId = gameId;
    this.duration = duration;
    this.key = `timer:${gameId}`;
  }

  async start() {
    const endTime = Date.now() + (this.duration * 1000);
    await redis.set(this.key, endTime, 'EX', this.duration + 5);
    
    // Broadcast timer updates every second
    this.interval = setInterval(async () => {
      const remaining = await this.getRemaining();
      if (remaining <= 0) {
        this.stop();
        io.to(`game:${this.gameId}`).emit('timer-ended');
      } else {
        io.to(`game:${this.gameId}`).emit('timer-update', remaining);
      }
    }, 1000);
  }

  async getRemaining() {
    const endTime = await redis.get(this.key);
    return endTime ? Math.max(0, Math.ceil((endTime - Date.now()) / 1000)) : 0;
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
```

## 📊 Monitoring & Analytics

### Performance Metrics
```javascript
// Real-time metrics collection
const metrics = {
  activeGames: 0,
  totalPlayers: 0,
  avgResponseTime: 0,
  errorRate: 0
};

// Update metrics every 30 seconds
setInterval(async () => {
  metrics.activeGames = await redis.scard('active:games');
  metrics.totalPlayers = await redis.scard('active:players');
  
  // Send to monitoring service
  console.log('Metrics:', metrics);
}, 30000);
```

### Error Handling & Recovery
```javascript
// Graceful degradation for high load
io.use((socket, next) => {
  const currentLoad = getCurrentServerLoad();
  
  if (currentLoad > 0.8) {
    // Implement queue system
    return next(new Error('Server at capacity, please wait'));
  }
  
  next();
});

// Auto-scaling trigger
function checkScalingNeeds() {
  const load = getCurrentServerLoad();
  const playerCount = getTotalPlayerCount();
  
  if (load > 0.7 && playerCount > 150) {
    // Trigger horizontal scaling
    console.log('Scaling trigger activated');
  }
}
```

## 🚀 Deployment Strategy

### Environment Configuration
```bash
# Production environment variables
NODE_ENV=production
CLUSTER_WORKERS=4
REDIS_URL=redis://redis-cluster:6379
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
MAX_PLAYERS_PER_GAME=250
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "cluster.js"]
```

This architecture ensures your Kahoot clone can handle 200+ concurrent players with optimal performance using Supabase and proper scaling strategies.