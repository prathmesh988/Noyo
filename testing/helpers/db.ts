import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load backend .env for MONGODB_URI
const backendEnvPath = path.resolve(process.cwd(), '../Backend/.env');
dotenv.config({ path: backendEnvPath });

const mongoose = require(path.resolve(process.cwd(), '../Backend/node_modules/mongoose'));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

export async function connectTestDb() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
  }
  return mongoose;
}

export { mongoose };
