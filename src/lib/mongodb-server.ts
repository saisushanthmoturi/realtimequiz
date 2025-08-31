import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/realtimequiz';

let cachedConnection: typeof mongoose | null = null;

export async function connectToDatabase() {
  if (cachedConnection) {
    return { db: cachedConnection };
  }

  try {
    mongoose.set('strictQuery', false);
    const connection = await mongoose.connect(MONGODB_URI);
    
    cachedConnection = connection;
    console.log('Connected to MongoDB successfully');
    return { db: connection };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw new Error('Could not connect to database');
  }
}

// Handle graceful shutdown
if (process.env.NODE_ENV !== 'development') {
  process.on('SIGINT', async () => {
    if (cachedConnection) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    }
  });
}
