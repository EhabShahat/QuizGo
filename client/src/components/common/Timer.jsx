import React from 'react';

const Timer = ({ timeRemaining, maxTime = 30, size = 'md' }) => {
  const percentage = maxTime > 0 ? (timeRemaining / maxTime) * 100 : 0;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-20 h-20 text-xl',
  };

  const getTimerColor = () => {
    if (timeRemaining <= 5) return '#E21B3C'; // Red
    if (timeRemaining <= 10) return '#FFD602'; // Yellow
    return '#26890C'; // Green
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Background Circle */}
      <svg
        className="absolute inset-0 w-full h-full transform -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#E8E8E8"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke={getTimerColor()}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      
      {/* Timer Text */}
      <span 
        className="font-bold text-white relative z-10"
        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
      >
        {timeRemaining}
      </span>
    </div>
  );
};

export default Timer;