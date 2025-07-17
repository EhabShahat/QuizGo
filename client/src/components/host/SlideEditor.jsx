import React, { useState } from 'react';
import MediaUpload from './MediaUpload';

const SlideEditor = ({ slide, onChange }) => {
  const [activeTab, setActiveTab] = useState('content');

  const slideTypes = [
    { value: 'info', label: 'Info Slide', description: 'General information or instructions' },
    { value: 'break', label: 'Break Slide', description: 'Rest period during quiz' },
    { value: 'intro', label: 'Introduction', description: 'Welcome or opening slide' },
    { value: 'conclusion', label: 'Conclusion', description: 'Closing or summary slide' },
    { value: 'custom', label: 'Custom', description: 'Custom content slide' },
  ];

  const fontSizes = [
    { value: 'auto', label: 'Auto (Responsive)' },
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  const displayDurations = [
    { value: 5, label: '5 seconds' },
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' },
    { value: 30, label: '30 seconds' },
    { value: 60, label: '1 minute' },
    { value: 0, label: 'Manual advance' },
  ];

  const getSlideTypeInfo = (type) => {
    switch (type) {
      case 'intro':
        return {
          defaultTitle: 'Welcome!',
          defaultContent: 'Get ready for an exciting quiz!\n\nThis quiz will test your knowledge and challenge your thinking.\n\nGood luck!',
          icon: '👋',
        };
      case 'break':
        return {
          defaultTitle: 'Take a Break',
          defaultContent: 'Time for a quick break!\n\nStretch, grab some water, and get ready for the next set of questions.\n\nWe\'ll continue in a moment.',
          icon: '☕',
        };
      case 'conclusion':
        return {
          defaultTitle: 'Great Job!',
          defaultContent: 'Thank you for participating in this quiz!\n\nWe hope you learned something new and had fun.\n\nCheck out your results!',
          icon: '🎉',
        };
      case 'info':
        return {
          defaultTitle: 'Information',
          defaultContent: 'Here\'s some important information to keep in mind for the upcoming questions.',
          icon: 'ℹ️',
        };
      default:
        return {
          defaultTitle: 'Custom Slide',
          defaultContent: 'Add your custom content here.',
          icon: '📄',
        };
    }
  };

  const handleSlideTypeChange = (newType) => {
    const typeInfo = getSlideTypeInfo(newType);
    
    // Only update title and content if they're empty or match the previous default
    const updates = { slide_type: newType };
    
    if (!slide.title || slide.title === getSlideTypeInfo(slide.slide_type || 'custom').defaultTitle) {
      updates.title = typeInfo.defaultTitle;
    }
    
    if (!slide.content || slide.content === getSlideTypeInfo(slide.slide_type || 'custom').defaultContent) {
      updates.content = typeInfo.defaultContent;
    }
    
    onChange(updates);
  };

  const currentTypeInfo = getSlideTypeInfo(slide.slide_type || 'custom');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Slide Editor</h3>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{currentTypeInfo.icon}</span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            Slide
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'content', label: 'Content' },
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
            {/* Slide Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Slide Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {slideTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleSlideTypeChange(type.value)}
                    className={`p-3 border rounded-lg text-left transition-colors ${
                      (slide.slide_type || 'custom') === type.value
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

            {/* Slide Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slide Title
              </label>
              <input
                type="text"
                value={slide.title || ''}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder={currentTypeInfo.defaultTitle}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Slide Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slide Content
              </label>
              <textarea
                value={slide.content || ''}
                onChange={(e) => onChange({ content: e.target.value })}
                placeholder={currentTypeInfo.defaultContent}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use line breaks to separate paragraphs. Keep content concise for better readability.
              </p>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <select
                value={slide.font_size || 'auto'}
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

        {activeTab === 'settings' && (
          <>
            {/* Display Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Duration
              </label>
              <select
                value={slide.time_limit || 10}
                onChange={(e) => onChange({ time_limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {displayDurations.map((duration) => (
                  <option key={duration.value} value={duration.value}>
                    {duration.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {slide.time_limit === 0 
                  ? 'Host will manually advance to the next item'
                  : `Slide will automatically advance after ${slide.time_limit} seconds`
                }
              </p>
            </div>

            {/* Slide Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Slide Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={slide.is_scored === false}
                    onChange={(e) => onChange({ is_scored: !e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Non-scored slide (doesn't affect player scores)</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={slide.show_progress !== false}
                    onChange={(e) => onChange({ show_progress: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Show progress bar</span>
                </label>
              </div>
            </div>

            {/* Presenter Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Presenter Notes (Private)
              </label>
              <textarea
                value={slide.presenter_notes || ''}
                onChange={(e) => onChange({ presenter_notes: e.target.value })}
                placeholder="Private notes visible only to you during the presentation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>
          </>
        )}

        {activeTab === 'media' && (
          <MediaUpload
            currentMedia={{
              url: slide.media_url,
              type: slide.media_type,
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

      {/* Preview */}
      <div className="mt-8 border-t pt-6">
        <h4 className="font-medium mb-3">Preview</h4>
        <div className="bg-gray-900 rounded-lg p-8 text-white text-center min-h-[200px] flex flex-col justify-center">
          {slide.media_url && (
            <div className="mb-4">
              {slide.media_type === 'image' ? (
                <img
                  src={slide.media_url}
                  alt="Slide media"
                  className="max-w-full max-h-32 mx-auto rounded"
                />
              ) : slide.media_type === 'video' ? (
                <video
                  src={slide.media_url}
                  className="max-w-full max-h-32 mx-auto rounded"
                  controls
                />
              ) : null}
            </div>
          )}
          
          <div className="text-2xl mb-2">{currentTypeInfo.icon}</div>
          
          <h2 className={`font-bold mb-4 ${
            slide.font_size === 'large' ? 'text-3xl' :
            slide.font_size === 'medium' ? 'text-2xl' :
            slide.font_size === 'small' ? 'text-lg' :
            'text-2xl' // auto
          }`}>
            {slide.title || currentTypeInfo.defaultTitle}
          </h2>
          
          <div className={`whitespace-pre-line ${
            slide.font_size === 'large' ? 'text-xl' :
            slide.font_size === 'medium' ? 'text-lg' :
            slide.font_size === 'small' ? 'text-base' :
            'text-lg' // auto
          }`}>
            {slide.content || currentTypeInfo.defaultContent}
          </div>
          
          {slide.time_limit > 0 && (
            <div className="mt-4 text-sm opacity-75">
              Auto-advance in {slide.time_limit} seconds
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SlideEditor;