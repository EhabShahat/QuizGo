import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        resolve();
        return;
      }

      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        this.isConnected = false;
        
        if (reason === 'io server disconnect') {
          // Server disconnected, try to reconnect
          this.handleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('reconnect', () => {
        console.log('Reconnected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('Max reconnection attempts reached');
          reject(new Error('Failed to reconnect to server'));
        }
      });
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, 1000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Game Events
  joinGame(gamePin) {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, message: 'Not connected to server' });
        return;
      }

      this.socket.emit('join-game', { gamePin }, (response) => {
        resolve(response);
      });
    });
  }

  setPlayerName(name) {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, message: 'Not connected to server' });
        return;
      }

      this.socket.emit('set-player-name', { name }, (response) => {
        resolve(response);
      });
    });
  }

  submitAnswer(answerData) {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, message: 'Not connected to server' });
        return;
      }

      this.socket.emit('submit-answer', answerData, (response) => {
        resolve(response);
      });
    });
  }

  // Host Events
  createGame(quizData) {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, message: 'Not connected to server' });
        return;
      }

      this.socket.emit('create-game', quizData, (response) => {
        resolve(response);
      });
    });
  }

  startGame() {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, message: 'Not connected to server' });
        return;
      }

      this.socket.emit('start-game', {}, (response) => {
        resolve(response);
      });
    });
  }

  nextQuestion() {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, message: 'Not connected to server' });
        return;
      }

      this.socket.emit('next-question', {}, (response) => {
        resolve(response);
      });
    });
  }

  endGame() {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ success: false, message: 'Not connected to server' });
        return;
      }

      this.socket.emit('end-game', {}, (response) => {
        resolve(response);
      });
    });
  }

  // Event Listeners
  onGameJoined(callback) {
    if (this.socket) {
      this.socket.on('game-joined', callback);
    }
  }

  onPlayerJoined(callback) {
    if (this.socket) {
      this.socket.on('player-joined', callback);
    }
  }

  onPlayerLeft(callback) {
    if (this.socket) {
      this.socket.on('player-left', callback);
    }
  }

  onGameStarted(callback) {
    if (this.socket) {
      this.socket.on('game-started', callback);
    }
  }

  onQuestionData(callback) {
    if (this.socket) {
      this.socket.on('question-data', callback);
    }
  }

  onQuestionDataHost(callback) {
    if (this.socket) {
      this.socket.on('question-data-host', callback);
    }
  }

  onAnswerOptionsOnly(callback) {
    if (this.socket) {
      this.socket.on('answer-options-only', callback);
    }
  }

  onTimerUpdate(callback) {
    if (this.socket) {
      this.socket.on('timer-update', callback);
    }
  }

  onTimerEnded(callback) {
    if (this.socket) {
      this.socket.on('timer-ended', callback);
    }
  }

  onAnswerResults(callback) {
    if (this.socket) {
      this.socket.on('answer-results', callback);
    }
  }

  onLeaderboardUpdate(callback) {
    if (this.socket) {
      this.socket.on('leaderboard-update', callback);
    }
  }

  onGameEnded(callback) {
    if (this.socket) {
      this.socket.on('game-ended', callback);
    }
  }

  onPlayerUpdate(callback) {
    if (this.socket) {
      this.socket.on('player-update', callback);
    }
  }

  onGameModeSet(callback) {
    if (this.socket) {
      this.socket.on('game-mode-set', callback);
    }
  }

  onError(callback) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
  }

  // Remove event listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Utility methods
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  getSocketId() {
    return this.socket ? this.socket.id : null;
  }
}

// Create singleton instance
const socketService = new SocketService();

export { socketService };