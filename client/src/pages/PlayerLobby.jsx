import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socketService';

const PlayerLobby = () => {
  const [playerName, setPlayerName] = useState('');
  const [isNameSet, setIsNameSet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const {
    gamePin,
    quizTitle,
    quizBackground,
    players,
    totalPlayers,
    gameStatus,
    setPlayerName: setStorePlayerName,
    setPlayers,
    updatePlayerCount,
    setGameStatus,
    setQuizTitle,
    setQuizBackground,
  } = useGameStore();

  useEffect(() => {
    // Redirect if no game PIN
    if (!gamePin) {
      navigate('/');
      return;
    }

    // Set up socket listeners
    socketService.onGameJoined((data) => {
      console.log('Game joined:', data);
      setQuizTitle(data.quizTitle || 'Quiz');
      setQuizBackground(data.quizBackground);
      setPlayers(data.players || []);
    });

    socketService.onPlayerJoined((data) => {
      console.log('Player joined:', data);
      updatePlayerCount(data.totalPlayers);
      setPlayers(data.players || []);
      toast.success(`${data.playerName} joined the game!`);
    });

    socketService.onPlayerLeft((data) => {
      console.log('Player left:', data);
      updatePlayerCount(data.totalPlayers);
      setPlayers(data.players || []);
      toast(`${data.playerName} left the game`, { icon: '👋' });
    });

    socketService.onGameStarted((data) => {
      console.log('Game started:', data);
      setGameStatus('active');
      navigate('/play');
      toast.success('Game is starting!');
    });

    socketService.onError((error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Connection error');
    });

    return () => {
      // Clean up listeners
      socketService.off('game-joined');
      socketService.off('player-joined');
      socketService.off('player-left');
      socketService.off('game-started');
      socketService.off('error');
    };
  }, [gamePin, navigate, setPlayers, updatePlayerCount, setGameStatus, setQuizTitle, setQuizBackground]);

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (playerName.length > 20) {
      toast.error('Name must be 20 characters or less');
      return;
    }

    setIsLoading(true);

    try {
      const response = await socketService.setPlayerName(playerName.trim());
      
      if (response.success) {
        setStorePlayerName(playerName.trim());
        setIsNameSet(true);
        toast.success('Welcome to the game!');
      } else {
        toast.error(response.message || 'Name already taken');
      }
    } catch (error) {
      console.error('Error setting name:', error);
      toast.error('Failed to set name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getBackgroundStyle = () => {
    if (quizBackground) {
      if (quizBackground.startsWith('http')) {
        return { backgroundImage: `url(${quizBackground})` };
      } else {
        return { background: quizBackground };
      }
    }
    return {};
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={getBackgroundStyle()}>
      <div className="quiz-background" style={getBackgroundStyle()}></div>
      
      <div className="relative z-10 w-full max-w-lg p-6">
        {/* Game PIN Display */}
        <div className="text-center mb-8">
          <div className="game-pin">
            PIN: {gamePin}
          </div>
          <h2 className="text-2xl font-bold text-white mt-4">
            {quizTitle}
          </h2>
        </div>

        {!isNameSet ? (
          /* Name Entry Form */
          <div className="quizgo-card">
            <h3 className="text-xl font-semibold text-center mb-6">
              Enter your name
            </h3>
            
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label htmlFor="playerName" className="sr-only">
                  Your Name
                </label>
                <input
                  id="playerName"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 text-lg text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={20}
                  disabled={isLoading}
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !playerName.trim()}
                className="quizgo-button quizgo-button-primary w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="loading-spinner mr-2"></div>
                    Joining...
                  </div>
                ) : (
                  'Join Game'
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Waiting Room */
          <div className="quizgo-card">
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">
                You're in!
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Welcome, <span className="font-semibold">{playerName}</span>
              </p>
              
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {totalPlayers}
                </div>
                <div className="text-gray-600">
                  {totalPlayers === 1 ? 'player' : 'players'} joined
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="loading-spinner mr-2"></div>
                  <span className="text-blue-700 font-medium">
                    Waiting for game to start
                  </span>
                </div>
                <p className="text-blue-600 text-sm">
                  Host will start the game soon
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Player List */}
        {isNameSet && players.length > 0 && (
          <div className="quizgo-card mt-6">
            <h4 className="text-lg font-semibold mb-4 text-center">
              Players in Game
            </h4>
            <div className="max-h-40 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {players.map((player, index) => (
                  <div
                    key={player.id || index}
                    className="bg-gray-100 rounded-lg px-3 py-2 text-center text-sm font-medium"
                  >
                    {player.nickname}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-white text-sm underline hover:opacity-80 transition-opacity"
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerLobby;