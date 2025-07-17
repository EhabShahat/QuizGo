// Simple test server for Railway debugging
const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Simple health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Simple server is working!'
  });
});

// Simple ping
app.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'alive',
    message: 'pong'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'QuizGo Server is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple test server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Available at: http://0.0.0.0:${PORT}`);
});

module.exports = app;