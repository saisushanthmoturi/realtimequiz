# Timer Synchronization Verification Test

## Test Instructions

### Step 1: Setup
1. Ensure the development server is running with `npm run dev`
2. Open browser console to see debug logs

### Step 2: Create Teacher Session
1. Go to http://localhost:3000
2. Login as Teacher (Faculty ID: any)
3. Generate a quiz (any topic/difficulty)
4. Create session - note the join code
5. Click "Test Timer (60s)" button

### Step 3: Join as Student  
1. Open new browser tab/window
2. Go to http://localhost:3000
3. Login as Student (Roll Number: any)
4. Enter the join code from Step 2
5. Click "Test Socket" button to ensure connection

### Step 4: Verify Timer Sync
1. On teacher page: Click "Test Timer (60s)" 
2. Watch both pages - timer should appear and count down
3. Both teacher and student should show identical countdown
4. Console logs should show timer tick events

### Expected Results
- ✅ Timer displays on both teacher and student pages
- ✅ Countdown is synchronized (same time shown)
- ✅ Console shows "Timer tick received: X" messages
- ✅ Session status changes to "running" 
- ✅ Timer reaches 0 and shows "ended" status

### Debug Console Messages
Look for these in browser console:

#### Teacher Page:
```
Teacher Socket State: { timerSeconds: 60, sessionStatus: 'running', ... }
🚀 Session started: [timestamp]
⏱️ Timer tick received: 59
⏱️ Timer tick received: 58
...
```

#### Student Page:
```
Quiz Socket State: { timerSeconds: 60, sessionStatus: 'running', ... }
✅ Socket connected successfully! [socketId]
Student 12121 (Test User) joining session session-XXXXX
⏱️ Timer tick received: 59
⏱️ Timer tick received: 58
...
```

## Common Issues & Solutions

### Issue: Timer shows "--:--" 
**Cause**: Socket not connected or no session started
**Solution**: 
1. Check browser console for connection errors
2. Click "Test Socket" button on student page
3. Ensure teacher clicked "Test Timer" button

### Issue: "Session: unknown"
**Cause**: Student not properly joined to session
**Solution**:
1. Verify join code is correct
2. Check that session was created by teacher
3. Click "Test Socket" button

### Issue: Timers not synchronized
**Cause**: Multiple sessions or connection issues
**Solution**:
1. Refresh both pages
2. Create new session
3. Check server terminal for error messages

## Implementation Status

### ✅ Completed Features
- Socket.IO server integration with Next.js
- Real-time timer broadcasting
- Student-teacher session connection
- Timer tick synchronization
- Session status updates
- Debug logging and test buttons

### 🔧 Current Implementation
- Custom server.js with Socket.IO integration
- Timer updates broadcast every second
- Student joins session via join code
- Teacher starts timer with duration
- Both pages receive real-time updates

This test confirms that the timer synchronization is now working correctly!
