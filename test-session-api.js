const { default: fetch } = require('node-fetch');

async function testSessionCreation() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Session Creation API');
  console.log('==============================\n');
  
  // Test creating multiple sessions for different quizzes  
  const testQuizzes = [
    'quiz-_f1CWIbPOcbbRLvGq7JzF',
    'quiz-TSd0gd491KOxoRrDTzdli',
    'quiz-VsUmxzuKww1IiBiMpvXQD',
    'quiz-IcbjbNFokiN4ZIT0oyPEw',
    'quiz-5Qi8efHYk3cAH36dYsPj5'
  ];
  
  const sessions = [];
  
  for (let i = 0; i < testQuizzes.length; i++) {
    console.log(`📝 Creating session ${i + 1} for quiz: ${testQuizzes[i]}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/session/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId: testQuizzes[i],
          teacherId: 'test-teacher'
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.log(`❌ Failed to create session: ${error}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`✅ Session created - ID: ${data.sessionId}, Join Code: ${data.joinCode}`);
      
      sessions.push({
        sessionId: data.sessionId,
        quizId: testQuizzes[i],
        joinCode: data.joinCode
      });
      
    } catch (error) {
      console.log(`❌ Error creating session: ${error.message}`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 Session Summary');
  console.log('==================');
  sessions.forEach((session, index) => {
    console.log(`${index + 1}. Quiz: ${session.quizId}`);
    console.log(`   Session ID: ${session.sessionId}`);
    console.log(`   Join Code: ${session.joinCode}\n`);
  });
  
  // Check for duplicate join codes
  const joinCodes = sessions.map(s => s.joinCode);
  const uniqueJoinCodes = new Set(joinCodes);
  
  if (joinCodes.length === uniqueJoinCodes.size) {
    console.log('✅ All join codes are unique!');
  } else {
    console.log('❌ DUPLICATE JOIN CODES DETECTED!');
    const duplicates = joinCodes.filter((code, index) => joinCodes.indexOf(code) !== index);
    console.log('Duplicates:', duplicates);
  }
  
  // Test rapid session creation (stress test)
  console.log('\n🚀 Rapid Session Creation Test');
  console.log('==============================');
  
  const rapidSessions = [];
  const promises = [];
  
  for (let i = 0; i < 10; i++) {
    const promise = fetch(`${baseUrl}/api/session/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quizId: `rapid-quiz-${i}`,
        teacherId: 'test-teacher'
      })
    }).then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        return { index: i, joinCode: data.joinCode, sessionId: data.sessionId };
      }
      return null;
    }).catch(() => null);
    
    promises.push(promise);
  }
  
  const results = await Promise.all(promises);
  const successfulSessions = results.filter(r => r !== null);
  
  console.log(`Attempted: 10, Successful: ${successfulSessions.length}`);
  
  const rapidCodes = successfulSessions.map(s => s.joinCode);
  const uniqueRapidCodes = new Set(rapidCodes);
  
  if (rapidCodes.length === uniqueRapidCodes.size) {
    console.log('✅ All rapid session codes are unique!');
  } else {
    console.log('❌ DUPLICATE CODES IN RAPID TEST!');
    console.log('Codes:', rapidCodes);
  }
  
  successfulSessions.forEach((session) => {
    console.log(`Session ${session.index}: ${session.joinCode}`);
  });
}

testSessionCreation().catch(console.error);
