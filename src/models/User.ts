import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define interfaces for strong typing
export interface IUser extends Document {
  userId: string;
  email: string;
  name: string;
  role: 'teacher' | 'student';
  password: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Define schema
const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['teacher', 'student'], required: true },
    password: { type: String, required: true } // Password is technically required but we'll handle the student case in pre-save
  },
  { 
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc: any, ret: Record<string, any>) {
        // Remove the password field when converting to JSON
        delete ret.password;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // If password isn't modified or doesn't exist, skip hashing
  if (!this.isModified('password')) return next();
  
  try {
    // For students without a password, generate a secure random one
    if (this.get('role') === 'student' && (!this.get('password') || this.get('password').length === 0)) {
      // Generate a random secure password for student accounts
      // They don't need to know this password since they authenticate by ID only
      const randomPassword = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
      this.set('password', randomPassword);
    }
    
    // Hash the password (either provided by teacher or auto-generated for student)
    const salt = await bcrypt.genSalt(10);
    this.set('password', await bcrypt.hash(this.get('password'), salt));
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.get('password'));
};

// Create or retrieve model
const User = mongoose.models.User as Model<IUser> || mongoose.model<IUser>('User', UserSchema);

export { User };
