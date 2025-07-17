import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';

const MediaUpload = ({ currentMedia, onMediaSelect, onMediaRemove }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const supportedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/ogg'],
  };

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    const fileType = Object.keys(supportedTypes).find(type =>
      supportedTypes[type].includes(file.type)
    );

    if (!fileType) {
      toast.error('Unsupported file type. Please upload an image or video.');
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    try {
      setIsUploading(true);

      // Create a temporary URL for preview
      const tempUrl = URL.createObjectURL(file);
      
      // In a real implementation, you would upload to Supabase Storage here
      // For now, we'll simulate the upload and use the temporary URL
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      onMediaSelect({
        url: tempUrl,
        type: fileType,
        fileName: file.name,
        fileSize: file.size,
      });

      toast.success('Media uploaded successfully!');

    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleUrlInput = (url) => {
    if (!url.trim()) return;

    try {
      new URL(url); // Validate URL format
      
      // Determine media type from URL
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
      const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
      
      if (!isImage && !isVideo) {
        toast.error('URL must point to an image or video file');
        return;
      }

      onMediaSelect({
        url,
        type: isImage ? 'image' : 'video',
        fileName: url.split('/').pop(),
      });

      toast.success('Media URL added successfully!');

    } catch (error) {
      toast.error('Invalid URL format');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Media */}
      {currentMedia?.url && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Current Media</h4>
            <button
              onClick={onMediaRemove}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Remove
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentMedia.type === 'image' ? (
              <img
                src={currentMedia.url}
                alt="Current media"
                className="w-20 h-20 object-cover rounded border"
              />
            ) : currentMedia.type === 'video' ? (
              <video
                src={currentMedia.url}
                className="w-20 h-20 object-cover rounded border"
                controls
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center">
                📄
              </div>
            )}
            
            <div className="flex-1">
              <p className="text-sm font-medium">
                {currentMedia.fileName || 'Media file'}
              </p>
              <p className="text-xs text-gray-500">
                {currentMedia.type} • {currentMedia.fileSize ? 
                  `${(currentMedia.fileSize / 1024 / 1024).toFixed(1)}MB` : 
                  'External URL'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="space-y-4">
        <h4 className="font-medium">Add Media</h4>
        
        {/* File Upload */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileInput}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="space-y-2">
              <div className="loading-spinner mx-auto"></div>
              <p className="text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-4xl">📁</div>
              <div>
                <p className="text-gray-600 mb-2">
                  Drop files here or click to browse
                </p>
                <button
                  onClick={openFileDialog}
                  className="quizgo-button quizgo-button-primary"
                >
                  Choose File
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Supported: JPG, PNG, GIF, WebP, MP4, WebM (max 10MB)
              </p>
            </div>
          )}
        </div>

        {/* URL Input */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium mb-3">Or add from URL</h5>
          <div className="flex space-x-2">
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleUrlInput(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={(e) => {
                const input = e.target.previousElementSibling;
                handleUrlInput(input.value);
                input.value = '';
              }}
              className="quizgo-button quizgo-button-secondary px-4 py-2"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter a direct link to an image or video file
          </p>
        </div>
      </div>

      {/* Media Templates */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium mb-3">Quick Templates</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { name: 'Geography', emoji: '🌍', type: 'template' },
            { name: 'Science', emoji: '🔬', type: 'template' },
            { name: 'History', emoji: '📚', type: 'template' },
            { name: 'Math', emoji: '🔢', type: 'template' },
          ].map((template) => (
            <button
              key={template.name}
              onClick={() => {
                // TODO: Implement template selection
                toast('Template selection coming soon!');
              }}
              className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 text-center"
            >
              <div className="text-2xl mb-1">{template.emoji}</div>
              <div className="text-xs text-gray-600">{template.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Media Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-800 mb-2">Media Guidelines</h5>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Use high-quality images for better visibility on large screens</li>
          <li>• Keep videos short (under 30 seconds) to maintain engagement</li>
          <li>• Ensure media is relevant to your question content</li>
          <li>• Test media playback before starting your quiz</li>
          <li>• Consider accessibility - add alt text in presenter notes</li>
        </ul>
      </div>
    </div>
  );
};

export default MediaUpload;