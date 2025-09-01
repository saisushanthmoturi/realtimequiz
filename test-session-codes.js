const fs = require('fs');
const path = require('path');

// Test the session code uniqueness
async function testSessionCodes() {
  try {
    const dataPath = path.join(__dirname, 'data', 'quiz_sessions.json');
    const sessions = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log('📊 Session Code Analysis');
    console.log('=======================');
    
    // Extract all codes (both joinCode and sessionCode)
    const codes = [];
    const codeMap = new Map();
    
    sessions.forEach((session, index) => {
      const code = session.joinCode || session.sessionCode;
      if (code) {
        codes.push(code);
        if (codeMap.has(code)) {
          codeMap.get(code).push(index);
        } else {
          codeMap.set(code, [index]);
        }
      }
    });
    
    console.log(`Total sessions: ${sessions.length}`);
    console.log(`Sessions with codes: ${codes.length}`);
    console.log(`Unique codes: ${codeMap.size}`);
    
    // Check for duplicates
    const duplicates = [];
    codeMap.forEach((indices, code) => {
      if (indices.length > 1) {
        duplicates.push({ code, indices });
      }
    });
    
    if (duplicates.length > 0) {
      console.log('\n❌ DUPLICATE CODES FOUND:');
      duplicates.forEach(({ code, indices }) => {
        console.log(`Code "${code}" appears ${indices.length} times at indices: ${indices.join(', ')}`);
      });
    } else {
      console.log('\n✅ All session codes are unique!');
    }
    
    // Check active sessions
    const activeSessions = sessions.filter(s => {
      return s.status ? (s.status !== 'ended') : (s.isActive === true);
    });
    
    console.log(`\nActive sessions: ${activeSessions.length}`);
    
    const activeCodes = activeSessions.map(s => s.joinCode || s.sessionCode).filter(Boolean);
    const uniqueActiveCodes = new Set(activeCodes);
    
    console.log(`Active codes: ${activeCodes.length}`);
    console.log(`Unique active codes: ${uniqueActiveCodes.size}`);
    
    if (activeCodes.length !== uniqueActiveCodes.size) {
      console.log('❌ DUPLICATE ACTIVE CODES FOUND!');
    } else {
      console.log('✅ All active session codes are unique!');
    }
    
    // Show recent sessions
    console.log('\n📋 Recent 5 Sessions:');
    sessions.slice(-5).forEach((session, i) => {
      const code = session.joinCode || session.sessionCode;
      const status = session.status || (session.isActive ? 'active' : 'inactive');
      console.log(`${sessions.length - 5 + i + 1}. Code: ${code}, Status: ${status}, Quiz: ${session.quizId}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSessionCodes();