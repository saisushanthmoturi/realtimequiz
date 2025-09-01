const { createServer } = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  console.log('Socket.IO server initializing...');

  // Session timers storage
  const sessionTimers = new Map();

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });

    // Test ping-pong
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Student joins session
    socket.on('student:join', ({ sessionId, studentId, name }) => {
      console.log(`Student ${studentId} (${name}) joining session ${sessionId}`);
      socket.join(`session:${sessionId}`);
      socket.emit('joined', { sessionId, studentId });
    });

    // Teacher starts session
    socket.on('teacher:session:start', ({ sessionId, durationSec }) => {
      console.log(`Starting session ${sessionId} for ${durationSec} seconds`);
      
      const endsAt = new Date(Date.now() + durationSec * 1000).toISOString();
      
      // Clear existing timer
      if (sessionTimers.has(sessionId)) {
        clearInterval(sessionTimers.get(sessionId).timer);
      }

      // Start new timer
      const timer = setInterval(() => {
        const now = Date.now();
        const end = new Date(endsAt).getTime();
        const remaining = Math.ceil((end - now) / 1000);
        
        if (remaining <= 0) {
          clearInterval(timer);
          sessionTimers.delete(sessionId);
          io.to(`session:${sessionId}`).emit('session:ended');
          io.to(`session:${sessionId}`).emit('timer:finished');
          console.log(`Session ${sessionId} timer finished`);
        } else {
          io.to(`session:${sessionId}`).emit('timer:tick', { remaining });
        }
      }, 1000);

      // Store timer with endsAt for recovery
      sessionTimers.set(sessionId, { timer, endsAt });
      
      io.to(`session:${sessionId}`).emit('session:started', { endsAt });
      console.log(`Session ${sessionId} started, timer running`);
    });

    // Teacher connects to session
    socket.on('teacher:session:reconnect', ({ sessionId }) => {
      console.log(`Teacher reconnecting to session ${sessionId}`);
      socket.join(`session:${sessionId}`);
      
      // Check if session has an active timer
      const timerInfo = sessionTimers.get(sessionId);
      if (timerInfo) {
        // Calculate current remaining time
        const now = Date.now();
        const end = new Date(timerInfo.endsAt).getTime();
        const remaining = Math.ceil((end - now) / 1000);
        
        if (remaining > 0) {
          console.log(`Recovering active timer for session ${sessionId}: ${remaining} seconds remaining`);
          socket.emit('session:recovered', { 
            sessionId, 
            remaining,
            endsAt: timerInfo.endsAt
          });
        } else {
          console.log(`Session ${sessionId} timer has expired`);
          socket.emit('session:expired', { sessionId });
        }
      } else {
        // No active timer, just acknowledge connection
        console.log(`No active timer for session ${sessionId}`);
        socket.emit('session:recovered', { 
          sessionId, 
          remaining: null,
          endsAt: null
        });
      }
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> Socket.IO server running on port ${port}`);
  });
});
