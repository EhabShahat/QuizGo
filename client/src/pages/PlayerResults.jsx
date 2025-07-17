import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socketService';

const PlayerResults = () => {
  const [finalResults, setFinalResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const {
    gamePin,
    playerName,
    playerScore,
    currentStreak,
    longestStreak,
    speedBonus,
    streakBonus,
    leaderboard,
    quizBackground,
    quizTitle,
    getTotalScore,
    getPlayerPosition,
    resetGame,
  } = useGameStore();

  useEffect(() => {
    // Redirect if not in game
    if (!gamePin || !playerName) {
      navigate('/');
      return;
    }

    // Listen for final results
    socketService.onGameEnded((data) => {
      console.log('Final results:', data);
      setFinalResults(data);
      setIsLoading(false);
    });

    // If we already have leaderboard data, show results
    if (leaderboard.length > 0) {
      setIsLoading(false);
    }

    return () => {
      socketService.off('game-ended');
    };
  }, [gamePin, playerName, navigate, leaderboard]);

  const handlePlayAgain = () => {
    resetGame();
    navigate('/');
  };

  const handleShareResults = async () => {
    const totalScore = getTotalScore();
    const position = getPlayerPosition();
    const shareText = `I just scored ${totalScore} points in "${quizTitle}" on QuizGo! 🎉 ${position ? `Ranked #${position}` : ''} #QuizGo`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'QuizGo Results',
          text: shareText,
          url: window.location.origin,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success('Results copied to clipboard!');
      } catch (error) {
        console.error('Failed to copy to clipboard');
      }
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

  const totalScore = getTotalScore();
  const playerPosition = getPlayerPosition();
  const totalPlayers = leaderboard.length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={getBackgroundStyle()}>
        <div className="quiz-background" style={getBackgroundStyle()}></div>
        <div className="relative z-10 text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-white text-lg">Calculating results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={getBackgroundStyle()}>
      <div className="quiz-background" style={getBackgroundStyle()}></div>
      
      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">
            RESULTS
          </h1>
          <h2 className="text-xl text-white opacity-90">
            {quizTitle}
          </h2>
        </div>

        {/* Player Score Card */}
        <div className="quizgo-card mb-6">
          <div className="text-center">
            {/* Position Badge */}
            {playerPosition && (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl font-bold mb-4">
                #{playerPosition}
              </div>
            )}
            
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {playerName}
            </h3>
            
            {/* Total Score */}
            <div className="text-4xl font-black text-purple-600 mb-4">
              {totalScore.toLocaleString()}
            </div>
            <div className="text-gray-600 mb-6">
              Total Points
            </div>

            {/* Score Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold text-gray-800">
                    {playerScore.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Base Score</div>
                </div>
                
                {speedBonus > 0 && (
                  <div>
                    <div className="text-lg font-semibold text-blue-600">
                      +{speedBonus.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Speed Bonus</div>
                  </div>
                )}
                
                {streakBonus > 0 && (
                  <div>
                    <div className="text-lg font-semibold text-orange-600">
                      +{streakBonus.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Streak Bonus</div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xl font-bold text-blue-600">
                  {longestStreak}
                </div>
                <div className="text-sm text-blue-800">Best Streak</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xl font-bold text-green-600">
                  #{playerPosition || '?'} / {totalPlayers}
                </div>
                <div className="text-sm text-green-800">Final Rank</div>
              </div>
            </div>

            {/* Encouragement Message */}
            <div className="text-center mb-6">
              {playerPosition === 1 && (
                <div className="text-2xl">🏆 Congratulations! You won! 🏆</div>
              )}
              {playerPosition === 2 && (
                <div className="text-xl">🥈 Great job! Second place! 🥈</div>
              )}
              {playerPosition === 3 && (
                <div className="text-xl">🥉 Awesome! Third place! 🥉</div>
              )}
              {playerPosition > 3 && playerPosition <= totalPlayers / 2 && (
                <div className="text-lg">🎉 Great performance! 🎉</div>
              )}
              {playerPosition > totalPlayers / 2 && (
                <div className="text-lg">👏 Good effort! Keep practicing! 👏</div>
              )}
            </div>
          </div>
        </div>

        {/* Top 5 Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="quizgo-card mb-6">
            <h4 className="text-lg font-semibold mb-4 text-center">
              Top Players
            </h4>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.nickname === playerName 
                      ? 'bg-purple-100 border-2 border-purple-300' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-bold flex items-center justify-center mr-3">
                      {index + 1}
                    </div>
                    <span className="font-medium">
                      {player.nickname}
                      {player.nickname === playerName && ' (You)'}
                    </span>
                  </div>
                  <span className="font-semibold text-purple-600">
                    {player.score?.toLocaleString() || '0'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handlePlayAgain}
            className="quizgo-button quizgo-button-primary flex-1 py-3 text-lg font-semibold"
          >
            Play Again
          </button>
          
          <button
            onClick={handleShareResults}
            className="quizgo-button quizgo-button-secondary flex-1 py-3 text-lg font-semibold"
          >
            Share Results
          </button>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-white text-sm underline hover:opacity-80 transition-opacity"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerResults;