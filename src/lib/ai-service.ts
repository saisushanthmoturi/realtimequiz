import { Question } from './database';

interface AIQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
}

// AI Service for generating unique questions using OpenAI
export class AIQuestionService {
  private static openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  private static apiUrl = 'https://api.openai.com/v1/chat/completions';

  // Generate questions using OpenAI API
  static async generateQuestionsForStudent(
    topic: string,
    questionCount: number,
    studentId: string,
    quizId: string
  ): Promise<Question[]> {
    // For demo mode or when no API key, use fallback
    if (!this.openaiApiKey) {
      console.log('No OpenAI API key found, using fallback questions');
      return this.generateFallbackQuestions(topic, questionCount, studentId, quizId);
    }

    try {
      const questions: Question[] = [];
      
      for (let i = 0; i < questionCount; i++) {
        const question = await this.generateSingleQuestion(topic, studentId, i);
        questions.push({
          id: `${quizId}-${studentId}-${i}`,
          quizId,
          studentId,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          difficulty: question.difficulty as 'easy' | 'medium' | 'hard'
        });
      }

      return questions;
    } catch (error) {
      console.error('Failed to generate AI questions, using fallback:', error);
      return this.generateFallbackQuestions(topic, questionCount, studentId, quizId);
    }
  }

  private static async generateSingleQuestion(topic: string, studentId: string, index: number): Promise<AIQuestion> {
    const prompt = this.createQuestionPrompt(topic, studentId, index);
    
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert quiz generator. Generate educational quiz questions with exactly 4 multiple choice options. Return your response in valid JSON format only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    try {
      const questionData = JSON.parse(content);
      return {
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        difficulty: questionData.difficulty as 'easy' | 'medium' | 'hard' || 'medium'
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid AI response format');
    }
  }

  private static createQuestionPrompt(topic: string, studentId: string, index: number): string {
    const seed = this.generateSeed(studentId, index);
    
    return `Generate a unique quiz question about "${topic}" for student ID "${studentId}".
    
Requirements:
- Create an educational question appropriate for college level
- Include exactly 4 multiple choice options (A, B, C, D)
- Make the question unique by using this seed: ${seed}
- Vary difficulty: ${index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard'}
- Provide a clear explanation for the correct answer

Return ONLY valid JSON in this exact format:
{
  "question": "Your question here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Clear explanation of why the answer is correct",
  "difficulty": "easy|medium|hard"
}`;
  }

  private static generateSeed(studentId: string, index: number): string {
    // Create a unique seed for each student and question
    const hash = studentId + index.toString();
    let seedValue = 0;
    for (let i = 0; i < hash.length; i++) {
      seedValue += hash.charCodeAt(i);
    }
    return (seedValue % 1000).toString();
  }

  // Fallback method for when OpenAI API is not available
  private static generateFallbackQuestions(
    topic: string,
    questionCount: number,
    studentId: string,
    quizId: string
  ): Question[] {
    const questions: Question[] = [];
    const topicKey = this.getTopicKey(topic);
    
    for (let i = 0; i < questionCount; i++) {
      const questionData = this.generateFallbackQuestion(topicKey, studentId, i);
      questions.push({
        id: `${quizId}-${studentId}-${i}`,
        quizId,
        studentId,
        question: questionData.question,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: questionData.explanation,
        difficulty: questionData.difficulty as 'easy' | 'medium' | 'hard'
      });
    }
    
    return questions;
  }

  private static generateFallbackQuestion(topicKey: string, studentId: string, index: number): AIQuestion {
    const seed = this.generateSeed(studentId, index);
    const seedNum = parseInt(seed) % 10;

    const fallbackQuestions: Record<string, AIQuestion[]> = {
      mathematics: [
        {
          question: `What is ${10 + seedNum} × ${5 + (seedNum % 3)}?`,
          options: [`${(10 + seedNum) * (5 + (seedNum % 3))}`, `${(10 + seedNum) * (5 + (seedNum % 3)) + 5}`, `${(10 + seedNum) * (5 + (seedNum % 3)) - 3}`, `${(10 + seedNum) * (5 + (seedNum % 3)) + 10}`],
          correctAnswer: 0,
          explanation: `To multiply ${10 + seedNum} × ${5 + (seedNum % 3)}, we get ${(10 + seedNum) * (5 + (seedNum % 3))}.`,
          difficulty: 'easy'
        },
        {
          question: `If x = ${3 + (seedNum % 4)}, what is the value of x² + ${2 * seedNum}?`,
          options: [`${Math.pow(3 + (seedNum % 4), 2) + (2 * seedNum)}`, `${Math.pow(3 + (seedNum % 4), 2) + (2 * seedNum) + 3}`, `${Math.pow(3 + (seedNum % 4), 2) + (2 * seedNum) - 2}`, `${Math.pow(3 + (seedNum % 4), 2) + (2 * seedNum) + 5}`],
          correctAnswer: 0,
          explanation: `Substitute x = ${3 + (seedNum % 4)} into x² + ${2 * seedNum} = ${Math.pow(3 + (seedNum % 4), 2)} + ${2 * seedNum} = ${Math.pow(3 + (seedNum % 4), 2) + (2 * seedNum)}.`,
          difficulty: 'medium'
        }
      ],
      programming: [
        {
          question: `What is the time complexity of binary search in an array of n elements?`,
          options: ['O(log n)', 'O(n)', 'O(n²)', 'O(1)'],
          correctAnswer: 0,
          explanation: 'Binary search has O(log n) time complexity because it divides the search space in half at each step.',
          difficulty: 'easy'
        },
        {
          question: `Which data structure is best for implementing a ${seedNum % 2 === 0 ? 'LIFO' : 'FIFO'} system?`,
          options: seedNum % 2 === 0 ? ['Stack', 'Queue', 'Array', 'Linked List'] : ['Queue', 'Stack', 'Array', 'Hash Table'],
          correctAnswer: 0,
          explanation: seedNum % 2 === 0 ? 'Stack follows LIFO (Last In, First Out) principle.' : 'Queue follows FIFO (First In, First Out) principle.',
          difficulty: 'medium'
        }
      ],
      science: [
        {
          question: `What is the chemical formula for ${seedNum % 2 === 0 ? 'water' : 'carbon dioxide'}?`,
          options: seedNum % 2 === 0 ? ['H₂O', 'CO₂', 'NaCl', 'CH₄'] : ['CO₂', 'H₂O', 'O₂', 'N₂'],
          correctAnswer: 0,
          explanation: seedNum % 2 === 0 ? 'Water consists of 2 hydrogen atoms and 1 oxygen atom.' : 'Carbon dioxide consists of 1 carbon atom and 2 oxygen atoms.',
          difficulty: 'easy'
        },
        {
          question: `At what temperature does water ${seedNum % 2 === 0 ? 'boil' : 'freeze'} at standard pressure?`,
          options: seedNum % 2 === 0 ? ['100°C', '0°C', '50°C', '200°C'] : ['0°C', '100°C', '-10°C', '32°C'],
          correctAnswer: 0,
          explanation: seedNum % 2 === 0 ? 'Water boils at 100°C (212°F) at standard atmospheric pressure.' : 'Water freezes at 0°C (32°F) at standard atmospheric pressure.',
          difficulty: 'medium'
        }
      ]
    };

    const questions = fallbackQuestions[topicKey] || fallbackQuestions.science;
    const selectedQuestion = questions[index % questions.length];
    
    return {
      ...selectedQuestion,
      difficulty: (index === 0 ? 'easy' : index === 1 ? 'medium' : 'hard') as 'easy' | 'medium' | 'hard'
    };
  }

  private static getTopicKey(topic: string): string {
    const topicLower = topic.toLowerCase();
    if (topicLower.includes('math') || topicLower.includes('algebra') || topicLower.includes('calculus')) {
      return 'mathematics';
    }
    if (topicLower.includes('program') || topicLower.includes('code') || topicLower.includes('software')) {
      return 'programming';
    }
    if (topicLower.includes('science') || topicLower.includes('chemistry') || topicLower.includes('physics') || topicLower.includes('biology')) {
      return 'science';
    }
    return 'science'; // default
  }

  // Generate personalized feedback
  static generateFeedback(
    studentId: string,
    score: number,
    totalQuestions: number,
    detailedResults: any[]
  ): string {
    const percentage = Math.round((score / totalQuestions) * 100);
    const incorrectQuestions = detailedResults.filter(r => !r.isCorrect);
    
    let feedback = `Great work, Student ${studentId}! `;
    
    if (percentage >= 90) {
      feedback += "Excellent performance! You have a strong understanding of the topic. ";
    } else if (percentage >= 80) {
      feedback += "Good job! You're doing well with most concepts. ";
    } else if (percentage >= 70) {
      feedback += "Fair performance. There's room for improvement in some areas. ";
    } else {
      feedback += "Keep practicing! Focus on understanding the fundamental concepts. ";
    }
    
    if (incorrectQuestions.length > 0) {
      feedback += `Review the explanations for ${incorrectQuestions.length} question(s) you missed. `;
      
      // Identify common mistake patterns
      const topics = incorrectQuestions.map(q => this.extractTopicFromQuestion(q.question));
      const uniqueTopics = [...new Set(topics)];
      
      if (uniqueTopics.length > 0) {
        feedback += `Focus on: ${uniqueTopics.join(', ')}. `;
      }
    }
    
    feedback += "Keep up the great work and continue learning!";
    
    return feedback;
  }

  private static extractTopicFromQuestion(question: string): string {
    if (question.toLowerCase().includes('math') || question.includes('×') || question.includes('=')) {
      return 'mathematics';
    }
    if (question.toLowerCase().includes('program') || question.toLowerCase().includes('algorithm')) {
      return 'programming concepts';
    }
    if (question.toLowerCase().includes('chemical') || question.toLowerCase().includes('temperature')) {
      return 'science fundamentals';
    }
    return 'general concepts';
  }
}
