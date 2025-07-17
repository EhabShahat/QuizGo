import React, { useState } from 'react';

const BackgroundSelector = ({ background, onChange }) => {
  const [showCustomGradient, setShowCustomGradient] = useState(false);

  const presetGradients = [
    {
      name: 'Purple Blue',
      value: 'linear-gradient(135deg, #46178F 0%, #1368CE 100%)',
      preview: 'bg-gradient-to-br from-purple-700 to-blue-600'
    },
    {
      name: 'Sunset',
      value: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
      preview: 'bg-gradient-to-br from-red-400 to-yellow-300'
    },
    {
      name: 'Ocean',
      value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      preview: 'bg-gradient-to-br from-blue-400 to-purple-500'
    },
    {
      name: 'Forest',
      value: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)',
      preview: 'bg-gradient-to-br from-teal-800 to-green-400'
    },
    {
      name: 'Fire',
      value: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)',
      preview: 'bg-gradient-to-br from-pink-500 to-red-500'
    },
    {
      name: 'Sky',
      value: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
      preview: 'bg-gradient-to-br from-blue-300 to-blue-600'
    }
  ];

  const solidColors = [
    { name: 'Deep Purple', value: '#46178F', preview: 'bg-purple-700' },
    { name: 'Royal Blue', value: '#1368CE', preview: 'bg-blue-600' },
    { name: 'Emerald', value: '#26890C', preview: 'bg-green-600' },
    { name: 'Crimson', value: '#E21B3C', preview: 'bg-red-600' },
    { name: 'Amber', value: '#FFD602', preview: 'bg-yellow-500' },
    { name: 'Slate', value: '#475569', preview: 'bg-slate-600' }
  ];

  const handleBackgroundTypeChange = (type) => {
    let newValue = background.value;
    
    if (type === 'gradient' && !background.value.includes('gradient')) {
      newValue = presetGradients[0].value;
    } else if (type === 'solid' && background.value.includes('gradient')) {
      newValue = solidColors[0].value;
    } else if (type === 'image') {
      newValue = '';
    }

    onChange({
      ...background,
      type,
      value: newValue
    });
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onChange({
          ...background,
          type: 'image',
          value: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Quiz Background</h3>
      
      {/* Background Type Selector */}
      <div className="mb-4">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { type: 'gradient', label: 'Gradient' },
            { type: 'solid', label: 'Solid' },
            { type: 'image', label: 'Image' }
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => handleBackgroundTypeChange(type)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                background.type === type
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Gradient Options */}
      {background.type === 'gradient' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preset Gradients
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presetGradients.map((gradient) => (
                <button
                  key={gradient.name}
                  onClick={() => onChange({ ...background, value: gradient.value })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    background.value === gradient.value
                      ? 'border-purple-500 ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-8 rounded ${gradient.preview} mb-2`}></div>
                  <div className="text-xs font-medium text-gray-700">{gradient.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowCustomGradient(!showCustomGradient)}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              {showCustomGradient ? '− Hide' : '+ Custom Gradient'}
            </button>
            
            {showCustomGradient && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CSS Gradient
                </label>
                <input
                  type="text"
                  value={background.value}
                  onChange={(e) => onChange({ ...background, value: e.target.value })}
                  placeholder="linear-gradient(135deg, #46178F 0%, #1368CE 100%)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a valid CSS gradient (linear-gradient, radial-gradient, etc.)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Solid Color Options */}
      {background.type === 'solid' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preset Colors
            </label>
            <div className="grid grid-cols-3 gap-2">
              {solidColors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => onChange({ ...background, value: color.value })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    background.value === color.value
                      ? 'border-purple-500 ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-full h-8 rounded ${color.preview} mb-2`}></div>
                  <div className="text-xs font-medium text-gray-700">{color.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Color
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={background.value.startsWith('#') ? background.value : '#46178F'}
                onChange={(e) => onChange({ ...background, value: e.target.value })}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={background.value}
                onChange={(e) => onChange({ ...background, value: e.target.value })}
                placeholder="#46178F"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Upload */}
      {background.type === 'image' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Background Image
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="background-upload"
              />
              <label
                htmlFor="background-upload"
                className="cursor-pointer"
              >
                {background.value ? (
                  <div>
                    <img
                      src={background.value}
                      alt="Background preview"
                      className="max-w-full max-h-32 mx-auto rounded-lg mb-2"
                    />
                    <p className="text-sm text-gray-600">Click to change image</p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-gray-600 mb-1">Click to upload image</p>
                    <p className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Overlay Settings */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">
            Dark Overlay (for text readability)
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={background.overlay}
              onChange={(e) => onChange({ ...background, overlay: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {background.overlay && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overlay Opacity: {Math.round(background.overlayOpacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={background.overlayOpacity}
              onChange={(e) => onChange({ ...background, overlayOpacity: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preview
        </label>
        <div
          className="w-full h-24 rounded-lg border border-gray-200 relative overflow-hidden"
          style={{
            background: background.type === 'image' && background.value
              ? `url(${background.value})`
              : background.value,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {background.overlay && (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: background.overlayOpacity }}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-semibold text-sm drop-shadow-lg">
              Sample Quiz Text
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundSelector;