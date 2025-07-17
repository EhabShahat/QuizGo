import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Pages
import GamePinEntry from './pages/GamePinEntry';
import PlayerLobby from './pages/PlayerLobby';
import PlayGame from './pages/PlayGame';
import PlayerResults from './pages/PlayerResults';

// Host Pages
import HostDashboard from './pages/host/HostDashboard';
import CreateQuiz from './pages/host/CreateQuiz';
import QuizLibrary from './pages/host/QuizLibrary';
import HostGame from './pages/host/HostGame';
import HostResults from './pages/host/HostResults';

// Components
import NotFound from './pages/NotFound';

// Styles
import './styles/globals.css';
import './styles/quizgo-theme.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Player Routes */}
          <Route path="/" element={<GamePinEntry />} />
          <Route path="/lobby" element={<PlayerLobby />} />
          <Route path="/play" element={<PlayGame />} />
          <Route path="/results" element={<PlayerResults />} />
          
          {/* Host Routes */}
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/host/create" element={<CreateQuiz />} />
          <Route path="/host/library" element={<QuizLibrary />} />
          <Route path="/host/game/:gameId" element={<HostGame />} />
          <Route path="/host/results/:gameId" element={<HostResults />} />
          
          {/* 404 Page */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Toast Notifications */}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '8px',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;