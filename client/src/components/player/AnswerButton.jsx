import React from 'react';

const AnswerButton = ({ 
  option, 
  index, 
  isSelected, 
  hasAnswered, 
  onSelect, 
  className = '' 
}) => {
  const colors = ['answer-red', 'answer-blue', 'answer-yellow', 'answer-green'];
  const shapes = ['🔺', '🔷', '⭕', '⬜'];
  const shapeNames = ['Triangle', 'Diamond', 'Circle', 'Square'];
  
  const colorClass = colors[index % colors.length];
  const shape = shapes[index % shapes.length];
  const shapeName = shapeNames[index % shapeNames.length];

  const handleClick = () => {
    if (!hasAnswered) {
      onSelect(index);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={hasAnswered}
      className={`
        quizgo-button ${colorClass} 
        ${isSelected ? 'ring-4 ring-white ring-opacity-50' : ''}
        ${hasAnswered ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105'}
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        py-6 px-4 text-lg font-semibold
        ${className}
      `}
      aria-label={`Answer ${index + 1}: ${option.option_text} (${shapeName})`}
    >
      <div className="flex items-center justify-center w-full">
        {/* Shape Icon */}
        <span className="text-2xl mr-3 flex-shrink-0" aria-hidden="true">
          {shape}
        </span>
        
        {/* Answer Text */}
        <span className="flex-1 text-center">
          {option.option_text}
        </span>
        
        {/* Selected Indicator */}
        {isSelected && (
          <span className="text-2xl ml-3 flex-shrink-0" aria-hidden="true">
            ✓
          </span>
        )}
      </div>
    </button>
  );
};

export default AnswerButton;