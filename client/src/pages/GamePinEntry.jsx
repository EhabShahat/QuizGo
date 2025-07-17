import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socketService';

const GamePinEntry = () => {
  const [gamePin, setGamePin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setGamePin: setStoreGamePin, setGameStatus } = useGameStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!gamePin.trim()) {
      toast.error('Please enter a game PIN');
      return;
    }

    if (gamePin.length !== 6) {
      toast.error('Game PIN must be 6 digits');
      return;
    }

    setIsLoading(true);

    try {
      // Connect to socket and join game
      await socketService.connect();
      
      const response = await socketService.joinGame(gamePin);
      
      if (response.success) {
        setStoreGamePin(gamePin);
        setGameStatus('joining');
        navigate('/lobby');
        toast.success('Joining game...');
      } else {
        toast.error(response.message || 'Game not found');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error('Failed to join game. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setGamePin(value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-blue">
      <div className="quiz-background bg-purple-blue"></div>
      
      <div className="relative z-10 w-full max-w-md p-6">
        {/* QuizGo Logo */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-white mb-4">
            QuizGo!
          </h1>
          <p className="text-white text-lg opacity-90">
            Make learning awesome!
          </p>
        </div>

        {/* Game PIN Entry Card */}
        <div className="quizgo-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="gamePin" className="sr-only">
                Game PIN
              </label>
              <input
                id="gamePin"
                type="text"
                value={gamePin}
                onChange={handleInputChange}
                placeholder="Game PIN"
                className="w-full px-6 py-4 text-2xl text-center font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={6}
                disabled={isLoading}
                autoComplete="off"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || gamePin.length !== 6}
              className="quizgo-button quizgo-button-primary w-full py-4 text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner mr-2"></div>
                  Joining...
                </div>
              ) : (
                'Enter'
              )}
            </button>
          </form>
        </div>

        {/* Host Link */}
        <div className="text-center mt-12">
          <p className="text-white text-sm opacity-75 mb-2">
            Create your own quiz for FREE at
          </p>
          <button
            onClick={() => navigate('/host')}
            className="text-white text-sm underline hover:opacity-80 transition-opacity"
          >
            quizgo.com/host
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePinEntry;