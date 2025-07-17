import React from 'react';

const ProgressBar = ({ progress, showText = false, className = '' }) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showText && (
        <div className="text-center text-sm text-gray-600 mt-1">
          {Math.round(clampedProgress)}%
        </div>
      )}
    </div>
  );
};

export default ProgressBar;