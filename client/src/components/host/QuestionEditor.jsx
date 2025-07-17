import React, { useState } from 'react';
import MediaUpload from './MediaUpload';

const QuestionEditor = ({ question, onChange }) => {
  const [activeTab, setActiveTab] = useState('content');

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice', description: '4 answer options' },
    { value: 'true_false', label: 'True/False', description: '2 answer options' },
    { value: 'multiple_select', label: 'Multiple Select', description: 'Choose 2-3 correct' },
    { value: 'ordering', label: 'Ordering', description: 'Arrange in sequence' },
    { value: 'matching', label: 'Matching', description: 'Connect related items' },
    { value: 'fill_blank', label: 'Fill in Blank', description: 'Type short answer' },
    { value: 'image_hotspot', label: 'Image Hotspot', description: 'Click on image areas' },
  ];

  const fontSizes = [
    { value: 'auto', label: 'Auto (Responsive)' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  const handleQuestionTypeChange = (newType) => {
    let newOptions = question.quiz_item_options || [];

    switch (newType) {
      case 'true_false':
        newOptions = [
          { option_text: 'True', is_correct: true, option_index: 0 },
          { option_text: 'False', is_correct: false, option_index: 1 },
        ];
        break;
      case 'multiple_choice':
        if (newOptions.length !== 4) {
          newOptions = [
            { option_text: 'Option A', is_correct: true, option_index: 0 },
            { option_text: 'Option B', is_correct: false, option_index: 1 },
            { option_text: 'Option C', is_correct: false, option_index: 2 },
            { option_text: 'Option D', is_correct: false, option_index: 3 },
          ];
        }
        break;
      case 'multiple_select':
        if (newOptions.length < 4) {
          newOptions = [
            { option_text: 'Option A', is_correct: true, option_index: 0 },
            { option_text: 'Option B', is_correct: true, option_index: 1 },
            { option_text: 'Option C', is_correct: false, option_index: 2 },
            { option_text: 'Option D', is_correct: false, option_index: 3 },
            { option_text: 'Option E', is_correct: false, option_index: 4 },
            { option_text: 'Option F', is_correct: false, option_index: 5 },
          ];
        }
        break;
      default:
        // For other types, keep existing options or create basic ones
        if (newOptions.length === 0) {
          newOptions = [
            { option_text: 'Option 1', is_correct: true, option_index: 0 },
            { option_text: 'Option 2', is_correct: false, option_index: 1 },
          ];
        }
    }

    onChange({
      question_type: newType,
      quiz_item_options: newOptions,
    });
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...(question.quiz_item_options || [])];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onChange({ quiz_item_options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(question.quiz_item_options || [])];
    newOptions.push({
      option_text: `Option ${newOptions.length + 1}`,
      is_correct: false,
      option_index: newOptions.length,
    });
    onChange({ quiz_item_options: newOptions });
  };

  const removeOption = (index) => {
    if (question.quiz_item_options.length <= 2) return;
    
    const newOptions = question.quiz_item_options.filter((_, i) => i !== index);
    // Update indices
    newOptions.forEach((option, i) => {
      option.option_index = i;
    });
    onChange({ quiz_item_options: newOptions });
  };

  const handleCorrectAnswerChange = (index, isCorrect) => {
    const newOptions = [...(question.quiz_item_options || [])];
    
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      // Single correct answer - uncheck others
      newOptions.forEach((option, i) => {
        option.is_correct = i === index ? isCorrect : false;
      });
    } else {
      // Multiple correct answers allowed
      newOptions[index].is_correct = isCorrect;
    }
    
    onChange({ quiz_item_options: newOptions });
  };

  const renderAnswerOptions = () => {
    const options = question.quiz_item_options || [];
    const colors = ['answer-red', 'answer-blue', 'answer-yellow', 'answer-green', 'bg-orange-500', 'bg-purple-500'];
    const shapes = ['🔺', '🔷', '⭕', '⬜', '⭐', '💎'];

    return (
      <div className="space-y-3">
        {options.map((option, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className={`w-8 h-8 ${colors[index % colors.length]} rounded flex items-center justify-center text-white font-bold`}>
              {shapes[index % shapes.length]}
            </div>
            
            <input
              type="text"
              value={option.option_text}
              onChange={(e) => updateOption(index, 'option_text', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={`Option ${index + 1}`}
            />
            
            <label className="flex items-center">
              <input
                type={question.question_type === 'multiple_select' ? 'checkbox' : 'radio'}
                name="correct-answer"
                checked={option.is_correct}
                onChange={(e) => handleCorrectAnswerChange(index, e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Correct</span>
            </label>
            
            {options.length > 2 && (
              <button
                onClick={() => removeOption(index)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Remove option"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        
        {options.length < 6 && (
          <button
            onClick={addOption}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
          >
            + Add Option
          </button>
        )}
      </div>
    );
  };

  const renderSpecialQuestionTypes = () => {
    switch (question.question_type) {
      case 'ordering':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Players will drag and drop these items to arrange them in the correct order.
            </p>
            {renderAnswerOptions()}
          </div>
        );
        
      case 'matching':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Players will connect related items. Create pairs by marking correct matches.
            </p>
            {renderAnswerOptions()}
          </div>
        );
        
      case 'fill_blank':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Players will type their answer. Add acceptable answers below.
            </p>
            <div className="space-y-2">
              {(question.quiz_item_options || []).map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={option.option_text}
                    onChange={(e) => updateOption(index, 'option_text', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Acceptable answer"
                  />
                  <button
                    onClick={() => removeOption(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addOption}
                className="text-purple-600 hover:text-purple-800 text-sm"
              >
                + Add acceptable answer
              </button>
            </div>
          </div>
        );
        
      case 'image_hotspot':
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Upload an image and define clickable areas. Players will click on the correct area.
            </p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <p className="text-gray-500">Image hotspot editor coming soon!</p>
              <p className="text-sm text-gray-400 mt-2">
                Upload an image and define clickable regions
              </p>
            </div>
          </div>
        );
        
      default:
        return renderAnswerOptions();
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Question Editor</h3>
        <div className="flex items-center space-x-2">
          {question.is_double_points && (
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
              ⚡ Double Points
            </span>
          )}
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
            Question
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'content', label: 'Content' },
          { id: 'answers', label: 'Answers' },
          { id: 'settings', label: 'Settings' },
          { id: 'media', label: 'Media' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'content' && (
          <>
            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Question Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {questionTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleQuestionTypeChange(type.value)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      question.question_type === type.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Question Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Text
              </label>
              <textarea
                value={question.content || ''}
                onChange={(e) => onChange({ content: e.target.value })}
                placeholder="Enter your question here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <select
                value={question.font_size || 'auto'}
                onChange={(e) => onChange({ font_size: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {fontSizes.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {activeTab === 'answers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Answer Options</h4>
              <span className="text-sm text-gray-500">
                {question.question_type === 'multiple_select' 
                  ? 'Select multiple correct answers'
                  : 'Select one correct answer'
                }
              </span>
            </div>
            {renderSpecialQuestionTypes()}
          </div>
        )}

        {activeTab === 'settings' && (
          <>
            {/* Time Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Limit (seconds)
              </label>
              <input
                type="number"
                value={question.time_limit || 30}
                onChange={(e) => onChange({ time_limit: parseInt(e.target.value) || 30 })}
                min="5"
                max="300"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points
              </label>
              <input
                type="number"
                value={question.points || 1000}
                onChange={(e) => onChange({ points: parseInt(e.target.value) || 1000 })}
                min="100"
                max="10000"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Power-ups */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Power-ups
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={question.is_double_points || false}
                    onChange={(e) => onChange({ is_double_points: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">⚡ Double Points - Worth 2x points</span>
                </label>
              </div>
            </div>

            {/* Presenter Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presenter Notes (Private)
              </label>
              <textarea
                value={question.presenter_notes || ''}
                onChange={(e) => onChange({ presenter_notes: e.target.value })}
                placeholder="Private notes visible only to you during the game..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>
          </>
        )}

        {activeTab === 'media' && (
          <MediaUpload
            currentMedia={{
              url: question.media_url,
              type: question.media_type,
            }}
            onMediaSelect={(media) => {
              onChange({
                media_url: media.url,
                media_type: media.type,
              });
            }}
            onMediaRemove={() => {
              onChange({
                media_url: null,
                media_type: null,
              });
            }}
          />
        )}
      </div>
    </div>
  );
};

export default QuestionEditor;