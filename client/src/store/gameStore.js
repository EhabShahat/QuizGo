import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useGameStore = create(
  subscribeWithSelector((set, get) => ({
    // Game state
    gamePin: null,
    gameId: null,
    gameStatus: 'waiting', // 'waiting', 'joining', 'lobby', 'active', 'ended'
    gameMode: 'dual_screen', // 'dual_screen', 'normal'
    currentQuestion: 0,
    totalQuestions: 0,
    quizTitle: '',
    quizBackground: null,
    
    // Player state
    playerId: null,
    playerName: '',
    playerScore: 0,
    playerRank: null,
    hasAnswered: false,
    selectedAnswer: null,
    
    // Question state
    currentQuestionData: null,
    questionStartTime: null,
    timeRemaining: 0,
    isDoublePoints: false,
    
    // Players and leaderboard
    players: [],
    leaderboard: [],
    totalPlayers: 0,
    
    // Power-ups and bonuses
    currentStreak: 0,
    longestStreak: 0,
    speedBonus: 0,
    streakBonus: 0,
    comebackBoost: false,
    
    // Host state (if hosting)
    isHost: false,
    hostControls: {
      canAdvance: false,
      showResults: false,
      gameStarted: false,
    },
    
    // Actions
    setGamePin: (pin) => set({ gamePin: pin }),
    setGameId: (id) => set({ gameId: id }),
    setGameStatus: (status) => set({ gameStatus: status }),
    setGameMode: (mode) => set({ gameMode: mode }),
    setQuizTitle: (title) => set({ quizTitle: title }),
    setQuizBackground: (background) => set({ quizBackground: background }),
    
    // Player actions
    setPlayerId: (id) => set({ playerId: id }),
    setPlayerName: (name) => set({ playerName: name }),
    setPlayerScore: (score) => set({ playerScore: score }),
    setPlayerRank: (rank) => set({ playerRank: rank }),
    setHasAnswered: (answered) => set({ hasAnswered: answered }),
    setSelectedAnswer: (answer) => set({ selectedAnswer: answer }),
    
    // Question actions
    setCurrentQuestion: (questionIndex) => set({ currentQuestion: questionIndex }),
    setTotalQuestions: (total) => set({ totalQuestions: total }),
    setCurrentQuestionData: (data) => set({ 
      currentQuestionData: data,
      isDoublePoints: data?.is_double_points || false,
      hasAnswered: false,
      selectedAnswer: null,
    }),
    setQuestionStartTime: (time) => set({ questionStartTime: time }),
    setTimeRemaining: (time) => set({ timeRemaining: time }),
    
    // Players and leaderboard actions
    setPlayers: (players) => set({ 
      players,
      totalPlayers: players.length 
    }),
    setLeaderboard: (leaderboard) => set({ leaderboard }),
    updatePlayerCount: (count) => set({ totalPlayers: count }),
    
    // Power-ups and bonuses
    setCurrentStreak: (streak) => set({ currentStreak: streak }),
    setLongestStreak: (streak) => set({ longestStreak: streak }),
    setSpeedBonus: (bonus) => set({ speedBonus: bonus }),
    setStreakBonus: (bonus) => set({ streakBonus: bonus }),
    setComebackBoost: (boost) => set({ comebackBoost: boost }),
    
    // Increment streak
    incrementStreak: () => set((state) => {
      const newStreak = state.currentStreak + 1;
      return {
        currentStreak: newStreak,
        longestStreak: Math.max(state.longestStreak, newStreak),
      };
    }),
    
    // Reset streak
    resetStreak: () => set({ currentStreak: 0 }),
    
    // Host actions
    setIsHost: (isHost) => set({ isHost }),
    setHostControls: (controls) => set({ hostControls: controls }),
    updateHostControls: (updates) => set((state) => ({
      hostControls: { ...state.hostControls, ...updates }
    })),
    
    // Calculate total score with bonuses
    getTotalScore: () => {
      const state = get();
      return state.playerScore + state.speedBonus + state.streakBonus;
    },
    
    // Submit answer
    submitAnswer: (answerIndex, responseTime) => {
      const state = get();
      if (state.hasAnswered) return;
      
      set({
        hasAnswered: true,
        selectedAnswer: answerIndex,
      });
      
      // Calculate speed bonus
      const maxTime = state.currentQuestionData?.time_limit || 30;
      const speedBonusPercent = Math.max(0, (maxTime - responseTime) / maxTime);
      const basePoints = state.currentQuestionData?.points || 1000;
      const speedBonus = Math.floor(basePoints * speedBonusPercent * 0.5);
      
      set({ speedBonus });
      
      return {
        answerIndex,
        responseTime,
        speedBonus,
        streak: state.currentStreak,
      };
    },
    
    // Reset game state
    resetGame: () => set({
      gamePin: null,
      gameId: null,
      gameStatus: 'waiting',
      gameMode: 'dual_screen',
      currentQuestion: 0,
      totalQuestions: 0,
      quizTitle: '',
      quizBackground: null,
      playerId: null,
      playerName: '',
      playerScore: 0,
      playerRank: null,
      hasAnswered: false,
      selectedAnswer: null,
      currentQuestionData: null,
      questionStartTime: null,
      timeRemaining: 0,
      isDoublePoints: false,
      players: [],
      leaderboard: [],
      totalPlayers: 0,
      currentStreak: 0,
      longestStreak: 0,
      speedBonus: 0,
      streakBonus: 0,
      comebackBoost: false,
      isHost: false,
      hostControls: {
        canAdvance: false,
        showResults: false,
        gameStarted: false,
      },
    }),
    
    // Get current question progress
    getQuestionProgress: () => {
      const state = get();
      return {
        current: state.currentQuestion + 1,
        total: state.totalQuestions,
        percentage: state.totalQuestions > 0 
          ? ((state.currentQuestion + 1) / state.totalQuestions) * 100 
          : 0,
      };
    },
    
    // Get player position
    getPlayerPosition: () => {
      const state = get();
      if (!state.playerId || !state.leaderboard.length) return null;
      
      const position = state.leaderboard.findIndex(
        player => player.id === state.playerId
      );
      
      return position >= 0 ? position + 1 : null;
    },
  }))
);

export { useGameStore };