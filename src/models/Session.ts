import mongoose, { Schema, Document, Model } from 'mongoose';

// Define interfaces for strong typing
export interface IStudentAnswer extends Document {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  answeredAt: Date;
  latencyMs?: number;
}

export interface IAttempt extends Document {
  attemptId: string;
  quizId: string;
  sessionId: string;
  studentId: string;
  answers: IStudentAnswer[];
  score: number;
  percent: number;
  startedAt: Date;
  submittedAt?: Date;
}

export interface IParticipant {
  studentId: string;
  name?: string;
  joinedAt: Date;
}

export interface ISession extends Document {
  sessionId: string;
  quizId: string;
  joinCode: string;
  teacherId: string;
  startedAt?: Date;
  endsAt?: Date;
  status: 'ready' | 'running' | 'paused' | 'ended';
  participants: IParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

// Define schemas
const StudentAnswerSchema = new Schema<IStudentAnswer>({
  questionId: { type: String, required: true },
  answer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  answeredAt: { type: Date, default: Date.now },
  latencyMs: { type: Number }
});

const AttemptSchema = new Schema<IAttempt>(
  {
    attemptId: { type: String, required: true, unique: true },
    quizId: { type: String, required: true },
    sessionId: { type: String, required: true },
    studentId: { type: String, required: true },
    answers: [StudentAnswerSchema],
    score: { type: Number, required: true },
    percent: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

const ParticipantSchema = new Schema<IParticipant>({
  studentId: { type: String, required: true },
  name: { type: String },
  joinedAt: { type: Date, default: Date.now }
});

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    quizId: { type: String, required: true },
    joinCode: { type: String, required: true, unique: true },
    teacherId: { type: String, required: true },
    startedAt: { type: Date },
    endsAt: { type: Date },
    status: { 
      type: String, 
      enum: ['ready', 'running', 'paused', 'ended'], 
      default: 'ready' 
    },
    participants: [ParticipantSchema],
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Create compound indexes for performance
AttemptSchema.index({ sessionId: 1, studentId: 1 });
AttemptSchema.index({ quizId: 1 });
SessionSchema.index({ quizId: 1 });
SessionSchema.index({ joinCode: 1 }, { unique: true });

// Create or retrieve models
const Attempt = mongoose.models.Attempt as Model<IAttempt> || mongoose.model<IAttempt>('Attempt', AttemptSchema);
const Session = mongoose.models.Session as Model<ISession> || mongoose.model<ISession>('Session', SessionSchema);

export { Attempt, Session };
