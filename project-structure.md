# QuizGo - Complete Project Structure

## Project Directory Structure

```
quizgo/
├── 📁 client/                          # React Frontend
│   ├── 📁 public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── 📁 src/
│   │   ├── 📁 components/              # Reusable UI Components
│   │   │   ├── 📁 common/
│   │   │   │   ├── Button.jsx          # QuizGo-style buttons
│   │   │   │   ├── Card.jsx            # QuizGo cards
│   │   │   │   ├── Timer.jsx           # Circular timer
│   │   │   │   ├── ProgressBar.jsx     # Question progress
│   │   │   │   └── GamePin.jsx         # PIN display component
│   │   │   ├── 📁 host/
│   │   │   │   ├── QuizCreator.jsx     # Quiz creation interface
│   │   │   │   ├── GameHost.jsx        # Host game screen
│   │   │   │   ├── PlayerList.jsx      # Live player list
│   │   │   │   ├── QuestionDisplay.jsx # Question presenter
│   │   │   │   └── ResultsHost.jsx     # Host results view
│   │   │   └── 📁 player/
│   │   │       ├── JoinGame.jsx        # PIN entry screen
│   │   │       ├── PlayerLobby.jsx     # Waiting room
│   │   │       ├── AnswerButtons.jsx   # Answer selection
│   │   │       ├── PlayerResults.jsx   # Player results
│   │   │       └── Leaderboard.jsx     # Rankings display
│   │   ├── 📁 pages/                   # Main App Pages
│   │   │   ├── GamePinEntry.jsx        # Landing page (PIN input)
│   │   │   ├── PlayerLobby.jsx         # Player waiting room
│   │   │   ├── PlayGame.jsx            # Player game interface
│   │   │   ├── PlayerResults.jsx       # Player results screen
│   │   │   ├── 📁 host/                # Host/Admin Pages (/host routes)
│   │   │   │   ├── HostDashboard.jsx   # Host main dashboard
│   │   │   │   ├── CreateQuiz.jsx      # Quiz builder
│   │   │   │   ├── QuizLibrary.jsx     # Quiz management
│   │   │   │   ├── HostGame.jsx        # Host game interface
│   │   │   │   └── HostResults.jsx     # Host results view
│   │   │   └── NotFound.jsx            # 404 page
│   │   ├── 📁 hooks/                   # Custom React Hooks
│   │   │   ├── useSocket.js            # Socket.io connection
│   │   │   ├── useGame.js              # Game state management
│   │   │   ├── useTimer.js             # Timer functionality
│   │   │   └── useSupabase.js          # Supabase integration
│   │   ├── 📁 store/                   # State Management
│   │   │   ├── gameStore.js            # Zustand game store
│   │   │   ├── userStore.js            # User session store
│   │   │   └── quizStore.js            # Quiz data store
│   │   ├── 📁 services/                # API Services
│   │   │   ├── supabaseClient.js       # Supabase configuration
│   │   │   ├── socketService.js        # Socket.io service
│   │   │   ├── gameService.js          # Game API calls
│   │   │   └── quizService.js          # Quiz CRUD operations
│   │   ├── 📁 styles/                  # Styling
│   │   │   ├── globals.css             # Global styles
│   │   │   ├── quizgo-theme.css        # QuizGo design system
│   │   │   ├── components.css          # Component styles
│   │   │   └── responsive.css          # Mobile responsiveness
│   │   ├── 📁 utils/                   # Utility Functions
│   │   │   ├── constants.js            # App constants
│   │   │   ├── helpers.js              # Helper functions
│   │   │   └── validation.js           # Form validation
│   │   ├── App.jsx                     # Main App component
│   │   ├── index.js                    # React entry point
│   │   └── setupTests.js               # Test configuration
│   ├── package.json
│   └── tailwind.config.js              # Tailwind CSS config
├── 📁 server/                          # Node.js Backend
│   ├── 📁 src/
│   │   ├── 📁 controllers/             # Route Controllers
│   │   │   ├── gameController.js       # Game management
│   │   │   ├── quizController.js       # Quiz CRUD
│   │   │   ├── playerController.js     # Player management
│   │   │   └── authController.js       # Authentication
│   │   ├── 📁 middleware/              # Express Middleware
│   │   │   ├── auth.js                 # JWT authentication
│   │   │   ├── rateLimit.js            # Rate limiting
│   │   │   ├── validation.js           # Request validation
│   │   │   └── errorHandler.js         # Error handling
│   │   ├── 📁 models/                  # Data Models
│   │   │   ├── Game.js                 # Game model
│   │   │   ├── Quiz.js                 # Quiz model
│   │   │   ├── Player.js               # Player model
│   │   │   └── Answer.js               # Answer model
│   │   ├── 📁 routes/                  # API Routes
│   │   │   ├── games.js                # Game routes
│   │   │   ├── quizzes.js              # Quiz routes
│   │   │   ├── players.js              # Player routes
│   │   │   └── auth.js                 # Auth routes
│   │   ├── 📁 services/                # Business Logic
│   │   │   ├── gameService.js          # Game logic
│   │   │   ├── quizService.js          # Quiz operations
│   │   │   ├── playerService.js        # Player management
│   │   │   ├── supabaseService.js      # Supabase operations
│   │   │   └── cacheService.js         # Redis caching
│   │   ├── 📁 socket/                  # Socket.io Handlers
│   │   │   ├── gameHandlers.js         # Game events
│   │   │   ├── playerHandlers.js       # Player events
│   │   │   ├── hostHandlers.js         # Host events
│   │   │   └── connectionHandlers.js   # Connection management
│   │   ├── 📁 utils/                   # Server Utilities
│   │   │   ├── constants.js            # Server constants
│   │   │   ├── helpers.js              # Helper functions
│   │   │   ├── pinGenerator.js         # Game PIN generation
│   │   │   └── scoreCalculator.js      # Scoring logic
│   │   ├── 📁 config/                  # Configuration
│   │   │   ├── database.js             # Supabase config
│   │   │   ├── redis.js                # Redis config
│   │   │   ├── socket.js               # Socket.io config
│   │   │   └── environment.js          # Environment variables
│   │   ├── app.js                      # Express app setup
│   │   ├── server.js                   # Server entry point
│   │   └── cluster.js                  # Clustering for scale
│   ├── package.json
│   └── Dockerfile                      # Docker configuration
├── 📁 database/                        # Database Scripts
│   ├── migrations/                     # Supabase migrations
│   ├── seeds/                          # Sample data
│   └── schema.sql                      # Database schema
├── 📁 docs/                           # Documentation
│   ├── API.md                         # API documentation
│   ├── DEPLOYMENT.md                  # Deployment guide
│   └── CONTRIBUTING.md                # Contribution guide
├── 📁 tests/                          # Test Files
│   ├── 📁 client/                     # Frontend tests
│   ├── 📁 server/                     # Backend tests
│   └── 📁 e2e/                        # End-to-end tests
├── .env.example                       # Environment template
├── .gitignore                         # Git ignore rules
├── docker-compose.yml                 # Docker compose
├── package.json                       # Root package.json
└── README.md                          # Project documentation
```

## 🎨 Key Implementation Files

### 1. QuizGo Theme CSS (`client/src/styles/quizgo-theme.css`)
```css
/* QuizGo Brand Colors */
:root {
  --quizgo-purple: #46178F;
  --quizgo-pink: #FF3355;
  --quizgo-red: #E21B3C;
  --quizgo-blue: #1368CE;
  --quizgo-yellow: #FFD602;
  --quizgo-green: #26890C;
  --quizgo-background: #F2F2F2;
  --quizgo-white: #FFFFFF;
  --quizgo-dark-text: #333333;
  --quizgo-light-text: #666666;
}

/* Montserrat Font Import */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

/* Global QuizGo Styling */
* {
  font-family: 'Montserrat', sans-serif;
}

/* Answer Button Colors */
.answer-red { background-color: var(--quizgo-red); }
.answer-blue { background-color: var(--quizgo-blue); }
.answer-yellow { background-color: var(--quizgo-yellow); }
.answer-green { background-color: var(--quizgo-green); }
```

### 2. Socket.io Configuration (`server/src/config/socket.js`)
```javascript
const socketIo = require('socket.io');
const redis = require('socket.io-redis');

function initializeSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"]
    },
    adapter: redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    }),
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Connection handling for 200+ players
  io.use(require('../middleware/socketAuth'));
  io.use(require('../middleware/rateLimitSocket'));

  return io;
}

module.exports = initializeSocket;
```

### 3. Game State Management (`client/src/store/gameStore.js`)
```javascript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    // Game state
    gamePin: null,
    gameStatus: 'waiting', // waiting, active, ended
    currentQuestion: 0,
    totalQuestions: 0,
    players: [],
    leaderboard: [],
    
    // Player state
    playerName: '',
    playerId: null,
    playerScore: 0,
    hasAnswered: false,
    
    // Timer state
    timeRemaining: 0,
    questionStartTime: null,
    
    // Actions
    setGamePin: (pin) => set({ gamePin: pin }),
    setGameStatus: (status) => set({ gameStatus: status }),
    updatePlayers: (players) => set({ players }),
    updateLeaderboard: (leaderboard) => set({ leaderboard }),
    setPlayerAnswer: (answered) => set({ hasAnswered: answered }),
    updateTimer: (time) => set({ timeRemaining: time }),
    
    // Reset game state
    resetGame: () => set({
      gamePin: null,
      gameStatus: 'waiting',
      currentQuestion: 0,
      players: [],
      leaderboard: [],
      hasAnswered: false,
      timeRemaining: 0
    })
  }))
);

export default useGameStore;
```

## 🚀 Development Workflow

### 1. Setup Commands
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start development
npm run dev
```

### 2. Build Commands
```bash
# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

### 3. Docker Commands
```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# Scale for high load
docker-compose up --scale server=4
```

This structure provides a complete, scalable QuizGo platform with Kahoot-inspired visual design and optimized performance for 200+ concurrent players.