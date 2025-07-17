import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useGameStore } from '../store/gameStore';
import { socketService } from '../services/socketService';
import AnswerButton from '../components/player/AnswerButton';
import Timer from '../components/common/Timer';
import ProgressBar from '../components/common/ProgressBar';

const PlayGame = () => {
  const [responseTime, setResponseTime] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const navigate = useNavigate();
  
  const {
    gamePin,
    playerName,
    gameMode,
    gameStatus,
    currentQuestionData,
    hasAnswered,
    selectedAnswer,
    timeRemaining,
    currentStreak,
    speedBonus,
    streakBonus,
    isDoublePoints,
    quizBackground,
    submitAnswer,
    setCurrentQuestionData,
    setTimeRemaining,
    setGameStatus,
    incrementStreak,
    resetStreak,
    getQuestionProgress,
  } = useGameStore();

  // Redirect if not in game
  useEffect(() => {
    if (!gamePin || !playerName) {
      navigate('/');
      return;
    }
    
    if (gameStatus !== 'active') {
      navigate('/lobby');
      return;
    }
  }, [gamePin, playerName, gameStatus, navigate]);

  // Socket event listeners
  useEffect(() => {
    // Question data for normal mode (includes question text)
    socketService.onQuestionData((data) => {
      console.log('Question data received:', data);
      setCurrentQuestionData(data);
      setQuestionStartTime(Date.now());
      setResponseTime(0);
    });

    // Answer options only for dual-screen mode
    socketService.onAnswerOptionsOnly((data) => {
      console.log('Answer options received:', data);
      setCurrentQuestionData({
        ...data,
        content: null, // No question text in dual-screen mode
      });
      setQuestionStartTime(Date.now());
      setResponseTime(0);
    });

    // Timer updates
    socketService.onTimerUpdate((time) => {
      setTimeRemaining(time);
    });

    // Timer ended
    socketService.onTimerEnded(() => {
      setTimeRemaining(0);
      if (!hasAnswered) {
        toast('Time\'s up!', { icon: '⏰' });
      }
    });

    // Answer results
    socketService.onAnswerResults((data) => {
      console.log('Answer results:', data);
      
      if (data.correct && selectedAnswer !== null) {
        incrementStreak();
        toast.success('Correct! 🎉');
      } else if (selectedAnswer !== null) {
        resetStreak();
        toast.error('Incorrect 😔');
      }
    });

    // Game ended
    socketService.onGameEnded(() => {
      setGameStatus('ended');
      navigate('/results');
    });

    return () => {
      socketService.off('question-data');
      socketService.off('answer-options-only');
      socketService.off('timer-update');
      socketService.off('timer-ended');
      socketService.off('answer-results');
      socketService.off('game-ended');
    };
  }, [
    setCurrentQuestionData,
    setTimeRemaining,
    setGameStatus,
    hasAnswered,
    selectedAnswer,
    incrementStreak,
    resetStreak,
    navigate,
  ]);

  // Handle answer selection
  const handleAnswerSelect = useCallback(async (answerIndex) => {
    if (hasAnswered || timeRemaining <= 0) return;

    const currentTime = Date.now();
    const responseTimeMs = questionStartTime ? currentTime - questionStartTime : 0;
    const responseTimeSec = Math.round(responseTimeMs / 1000);
    
    setResponseTime(responseTimeSec);

    // Submit answer through store (calculates bonuses)
    const answerData = submitAnswer(answerIndex, responseTimeSec);
    
    // Send to server
    try {
      const response = await socketService.submitAnswer({
        answerIndex,
        responseTime: responseTimeSec,
        questionStartTime,
        ...answerData,
      });
      
      if (!response.success) {
        toast.error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Connection error');
    }
  }, [hasAnswered, timeRemaining, questionStartTime, submitAnswer]);

  // Get background style
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

  // Show loading if no question data
  if (!currentQuestionData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={getBackgroundStyle()}>
        <div className="quiz-background" style={getBackgroundStyle()}></div>
        <div className="relative z-10 text-center">
          <div className="loading-spinner mb-4"></div>
          <p className="text-white text-lg">Waiting for next question...</p>
        </div>
      </div>
    );
  }

  const progress = getQuestionProgress();
  const options = currentQuestionData.options || [];

  return (
    <div className="min-h-screen flex flex-col" style={getBackgroundStyle()}>
      <div className="quiz-background" style={getBackgroundStyle()}></div>
      
      {/* Header */}
      <div className="relative z-10 bg-black bg-opacity-20 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="text-lg font-bold">QuizGo</div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              Question {progress.current} of {progress.total}
            </div>
            <Timer timeRemaining={timeRemaining} />
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2">
          <ProgressBar progress={progress.percentage} />
        </div>
      </div>

      {/* Question Content */}
      <div className="relative z-10 flex-1 flex flex-col p-4">
        {/* Question Text (Normal Mode Only) */}
        {gameMode === 'normal' && currentQuestionData.content && (
          <div className="text-center mb-6">
            <div className="bg-black bg-opacity-40 rounded-lg p-6 max-w-2xl mx-auto">
              <h2 className="text-white text-xl md:text-2xl font-semibold leading-tight">
                {currentQuestionData.content}
                {isDoublePoints && (
                  <span className="ml-2 text-yellow-300">⚡ 2x Points!</span>
                )}
              </h2>
            </div>
          </div>
        )}

        {/* Dual Screen Mode Indicator */}
        {gameMode === 'dual_screen' && (
          <div className="text-center mb-6">
            <div className="bg-black bg-opacity-40 rounded-lg p-4 max-w-lg mx-auto">
              <h2 className="text-white text-lg font-semibold">
                Question {progress.current}
                {isDoublePoints && (
                  <span className="ml-2 text-yellow-300">⚡ 2x Points!</span>
                )}
              </h2>
              <p className="text-white text-sm opacity-75 mt-1">
                Look at the big screen for the question
              </p>
            </div>
          </div>
        )}

        {/* Answer Buttons */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-2xl">
            {options.length === 2 ? (
              /* True/False Layout */
              <div className="space-y-4">
                {options.map((option, index) => (
                  <AnswerButton
                    key={index}
                    option={option}
                    index={index}
                    isSelected={selectedAnswer === index}
                    hasAnswered={hasAnswered}
                    onSelect={handleAnswerSelect}
                    className="w-full py-8 text-xl"
                  />
                ))}
              </div>
            ) : (
              /* Multiple Choice Layout */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map((option, index) => (
                  <AnswerButton
                    key={index}
                    option={option}
                    index={index}
                    isSelected={selectedAnswer === index}
                    hasAnswered={hasAnswered}
                    onSelect={handleAnswerSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Player Status */}
        <div className="text-center mt-4">
          <div className="bg-black bg-opacity-40 rounded-lg p-3 inline-block">
            <div className="flex items-center space-x-4 text-white text-sm">
              <span className="font-medium">{playerName}</span>
              {hasAnswered && (
                <span className="text-green-300 font-medium">
                  ✓ Answered! {responseTime > 0 && `(${responseTime}s)`}
                </span>
              )}
              {currentStreak > 0 && (
                <span className="text-yellow-300 font-medium">
                  🔥 Streak: {currentStreak}
                </span>
              )}
              {speedBonus > 0 && (
                <span className="text-blue-300 font-medium">
                  ⚡ Speed: +{speedBonus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayGame;