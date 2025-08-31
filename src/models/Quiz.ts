import mongoose, { Schema, Document, Model } from 'mongoose';

// Define interfaces for strong typing
export interface IQuestion extends Document {
  id: string;
  topic: string;
  mode: 'same' | 'different';
  type: 'mcq' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQuiz extends Document {
  id: string;
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mode: 'same' | 'different';
  numQuestions: number;
  numSets?: number;
  questionsPerSet?: number;
  poolSize?: number;
  questions: Schema.Types.ObjectId[] | IQuestion[];
  createdAt: Date;
  status: 'draft' | 'launched' | 'closed';
}

// Define schemas
const QuestionSchema = new Schema<IQuestion>(
  {
    id: { type: String, required: true, unique: true },
    topic: { type: String, required: true },
    mode: { type: String, enum: ['same', 'different'], required: true },
    type: { type: String, enum: ['mcq', 'true_false', 'short_answer'], required: true },
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    metadata: { type: Schema.Types.Mixed }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const QuizSchema = new Schema<IQuiz>(
  {
    id: { type: String, required: true, unique: true },
    topics: [{ type: String, required: true }],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    mode: { type: String, enum: ['same', 'different'], required: true },
    numQuestions: { type: Number, required: true },
    numSets: { type: Number },
    questionsPerSet: { type: Number },
    poolSize: { type: Number },
    questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'launched', 'closed'], default: 'draft' }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create or retrieve models
const Question = mongoose.models.Question as Model<IQuestion> || mongoose.model<IQuestion>('Question', QuestionSchema);
const Quiz = mongoose.models.Quiz as Model<IQuiz> || mongoose.model<IQuiz>('Quiz', QuizSchema);

export { Question, Quiz };
