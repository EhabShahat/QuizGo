import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-purple-blue flex items-center justify-center">
      <div className="quiz-background bg-purple-blue"></div>
      
      <div className="relative z-10 text-center max-w-md mx-auto p-6">
        <div className="text-8xl mb-6">🤔</div>
        
        <h1 className="text-6xl font-black text-white mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        
        <p className="text-white text-lg opacity-90 mb-8">
          Oops! The page you're looking for doesn't exist.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => navigate('/')}
            className="quizgo-button quizgo-button-primary w-full py-3 text-lg font-semibold"
          >
            Join a Game
          </button>
          
          <button
            onClick={() => navigate('/host')}
            className="quizgo-button quizgo-button-secondary w-full py-3 text-lg font-semibold"
          >
            Host Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;