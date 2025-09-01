# Timer Persistence Test Instructions

## Issue Fixed
The session monitor page timer was restarting from the beginning whenever you navigated away and returned, instead of continuing from the correct remaining time.

## Changes Made

### 1. Enhanced Session Recovery Logic
- **Teacher Session Page**: Added dual recovery attempts - one when socket connects and another when sessionId becomes available
- **Added small delay**: 100ms delay ensures socket is fully ready before recovery
- **Immediate recovery**: Also attempts recovery immediately if both sessionId and connection are available

### 2. Improved Socket Hook
- **Better session recovery**: Enhanced `session:recovered` event handling with proper validation
- **Added new event handlers**: 
  - `session:not_found` - handles missing sessions
  - `session:status` - handles general status updates  
  - `session:error` - handles recovery errors

### 3. Enhanced Server-Side Recovery
- **Moved sessionTimers global**: Timer state now persists across socket connections
- **Comprehensive recovery logic**: Handles running, paused, ended, and expired sessions
- **Better logging**: Added detailed console logs for debugging
- **Proper error handling**: Catches and handles recovery errors gracefully

### 4. Timer State Management
- **Global timer storage**: Session timers are now stored globally instead of per-connection
- **Better state calculation**: Always calculates remaining time from stored `endsAt` timestamp
- **Handles edge cases**: Properly handles expired sessions, missing sessions, etc.

## Test Steps

### Step 1: Create and Start a Session
1. Open http://localhost:3000
2. Login as teacher (any Faculty ID like "T001")
3. Create a new quiz session
4. Set timer to 10 minutes
5. Start the session
6. Verify timer starts counting down (e.g., 09:59, 09:58...)

### Step 2: Test Timer Persistence
1. **While timer is running**, navigate away from the session page:
   - Click "Back to Dashboard" 
   - Or directly navigate to http://localhost:3000/teacher
2. Wait 10-15 seconds (let some time pass)
3. **Return to session monitor**:
   - Click on the active session or
   - Navigate to http://localhost:3000/teacher/session
4. **VERIFY**: Timer should show the correct remaining time, NOT restart from 10:00
   - If you were away for 15 seconds, timer should show ~15 seconds less than when you left

### Step 3: Test Socket Reconnection
1. With session running, open browser dev tools (F12)
2. Go to Network tab, find socket.io connections  
3. Force disconnect (can close/reopen browser tab)
4. Return to session page
5. **VERIFY**: Timer should recover and show correct remaining time

### Step 4: Test Page Refresh
1. With session running, refresh the page (Ctrl+R / Cmd+R)
2. **VERIFY**: After page reloads, timer should show correct remaining time

### Step 5: Test Multiple Tabs
1. Open session monitor in two browser tabs
2. Both should show synchronized timer
3. Navigate away in one tab, keep other open
4. Return to first tab
5. **VERIFY**: Both tabs show same remaining time

## Expected Behavior

### ✅ CORRECT (After Fix)
- Timer continues from where it left off when returning to session page
- Timer shows "--:--" only briefly while recovering, then shows correct time
- Multiple tabs/windows stay synchronized
- Page refresh maintains correct timer state
- Socket reconnection recovers proper timer state

### ❌ INCORRECT (Before Fix)  
- Timer restarted from full duration (e.g., 10:00) when returning to session page
- Loss of actual session progress
- Inconsistent timer states between tabs

## Debug Information

Check browser console for these log messages:
- `🔄 Session monitor: Attempting to recover session`  
- `🔄 Session recovered:` (should show correct remaining time)
- `⏱️ Timer tick received:` (should show decreasing values)
- `✅ Session recovered successfully with X seconds remaining`

## Files Modified
- `/src/app/teacher/session/page.tsx` - Enhanced recovery logic
- `/src/hooks/useQuizSocket.ts` - Better event handling  
- `/src/server/socket.ts` - Improved server-side recovery
- `/src/components/Timer.tsx` - No changes (was working correctly)

## Technical Details

The fix addresses these core issues:
1. **Race conditions** between component mounting and socket connection
2. **Timer state loss** due to local-only countdown fallback  
3. **Session recovery timing** by adding proper delays and multiple recovery attempts
4. **Global state management** by moving session timers outside socket connection scope
