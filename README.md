# QuizGo - Interactive Quiz Platform

A full-stack web application that delivers engaging dual-screen gameplay and quiz-based learning experiences.

## Core Features

### Dual Screen Experience
- **Host Screen**: Large display for questions, timer, and leaderboard
- **Player Devices**: Mobile-optimized interface for answering
- **Real-time Sync**: Instant communication between all devices

### Quiz Management
- Create custom quizzes with multiple-choice questions
- Import/export quiz data
- Question timer configuration
- Media support (images, videos)

### Game Flow
1. Host creates/selects quiz
2. Players join using game PIN
3. Real-time question display and answering
4. Live scoring and leaderboard updates
5. Final results and analytics

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Tailwind CSS for styling
- Socket.io-client for real-time communication
- React Router for navigation
- Zustand for state management

**Backend (Optimized for 200+ Players)**
- Node.js + Express with clustering (4+ workers)
- Socket.io with Redis adapter for horizontal scaling
- Supabase (PostgreSQL) with optimized indexes
- Supabase Storage for quiz media and exports
- Redis cluster for caching and session management
- Supabase Auth for JWT authentication
- Rate limiting, connection pooling, and load balancing
- Bulk answer processing and leaderboard caching

## Getting Started

```bash
# Clone repository
git clone <repo-url>
cd quizgo

# Install dependencies
npm install

# Start development servers
npm run dev
```

## Responsive Design

- Desktop: Full quiz creation and host interface
- Tablet: Optimized for both hosting and playing
- Mobile: Player-focused interface with large buttons