# Real-Time Quiz Platform Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js TypeScript application for a real-time quiz platform with the following features:

### Core Features
- **Dual Login System**: Teachers (Faculty ID) and Students (Roll Number) 
- **Teacher Dashboard**: Create quizzes, manage sessions, view analytics
- **Student Dashboard**: Join quizzes, take tests, view scores
- **Real-time Functionality**: Live quiz sessions with leaderboards
- **AI Quiz Generation**: Generate unique questions per student
- **Role Verification**: Secure authentication based on institution credentials

### Technical Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS (keep it simple and clean)
- **Database**: Simple file-based storage initially
- **Real-time**: WebSocket or Server-Sent Events

### Code Guidelines
- Keep code simple and readable
- Avoid over-engineering - prioritize functionality over fancy features
- Use clean, semantic HTML with basic Tailwind classes
- Focus on core functionality first, then enhance
- Write self-documenting code with clear variable names
- Keep components small and focused

### Key Components Needed
- Login/Authentication system
- Teacher dashboard for quiz creation
- Student dashboard for quiz participation  
- Real-time quiz session management
- Simple question generation system
- Basic analytics and reporting
