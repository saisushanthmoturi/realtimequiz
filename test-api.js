const fs = require('fs');
const path = require('path');

// Test API endpoints
async function testQuizCreation() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testing Quiz Creation and Session Codes');
  console.log('===========================================\n');
  
  // Function to create a quiz
  async function createQuiz(title, topic) {
    try {
      const response = await fetch(`${baseUrl}/api/quiz`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          topic,
          description: `Test quiz for ${topic}`,
          difficulty: 'medium',
          questionCount: 5,
          timeLimit: 10,
          type: 'multiple-choice',
          createdBy: 'test-teacher',
          mode: 'same'
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Error creating quiz "${title}":`, error.message);
      return null;
    }
  }
  
  // Function to start a quiz
  async function startQuiz(quizId) {
    try {
      const response = await fetch(`${baseUrl}/api/quiz/${quizId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Error starting quiz ${quizId}:`, error.message);
      return null;
    }
  }
  
  // Test creating multiple quizzes and starting them
  const testQuizzes = [
    { title: 'Test Math Quiz 1', topic: 'Mathematics' },
    { title: 'Test Science Quiz 1', topic: 'Science' },
    { title: 'Test History Quiz 1', topic: 'History' },
  ];
  
  const sessionCodes = [];
  
  for (let i = 0; i < testQuizzes.length; i++) {
    const quiz = testQuizzes[i];
    console.log(`📝 Creating Quiz ${i + 1}: "${quiz.title}"`);
    
    // Create quiz
    const createResult = await createQuiz(quiz.title, quiz.topic);
    if (!createResult || !createResult.success) {
      console.log(`❌ Failed to create quiz: ${quiz.title}`);
      continue;
    }
    
    console.log(`✅ Quiz created with ID: ${createResult.quiz.id}`);
    
    // Start quiz
    const startResult = await startQuiz(createResult.quiz.id);
    if (!startResult || !startResult.success) {
      console.log(`❌ Failed to start quiz: ${createResult.quiz.id}`);
      continue;
    }
    
    console.log(`🚀 Quiz started with Session Code: ${startResult.sessionCode}`);
    sessionCodes.push({
      quizId: createResult.quiz.id,
      title: quiz.title,
      sessionCode: startResult.sessionCode
    });
    
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 Session Code Summary');
  console.log('======================');
  sessionCodes.forEach((item, index) => {
    console.log(`${index + 1}. ${item.title}`);
    console.log(`   Quiz ID: ${item.quizId}`);
    console.log(`   Session Code: ${item.sessionCode}\n`);
  });
  
  // Check for duplicates
  const codes = sessionCodes.map(item => item.sessionCode);
  const uniqueCodes = new Set(codes);
  
  if (codes.length === uniqueCodes.size) {
    console.log('✅ All session codes are unique!');
  } else {
    console.log('❌ DUPLICATE SESSION CODES DETECTED!');
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
    console.log('Duplicates:', duplicates);
  }
  
  // Read the current sessions file to verify
  try {
    const dataPath = path.join(__dirname, 'data', 'quiz_sessions.json');
    const sessions = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const latestSessions = sessions.slice(-testQuizzes.length);
    
    console.log('\n📋 Latest Sessions from File:');
    latestSessions.forEach((session, index) => {
      const code = session.joinCode || session.sessionCode;
      console.log(`${index + 1}. Code: ${code}, Quiz: ${session.quizId}`);
    });
  } catch (error) {
    console.log('❌ Error reading sessions file:', error.message);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('❌ This test requires Node.js 18+ or a fetch polyfill');
  console.log('Installing node-fetch...');
  
  try {
    const { default: fetch, Headers, Request, Response } = require('node-fetch');
    global.fetch = fetch;
    global.Headers = Headers;
    global.Request = Request;
    global.Response = Response;
  } catch (error) {
    console.log('❌ Please install node-fetch: npm install node-fetch');
    process.exit(1);
  }
}

testQuizCreation().catch(console.error);
