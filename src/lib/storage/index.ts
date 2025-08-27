import path from 'path';
import { JsonStorageAdapter } from './json';

// Create a singleton instance of the storage adapter
const storage = new JsonStorageAdapter(path.join(process.cwd(), 'data'));

export { storage };
