import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../src/config/database.js';

let mongo: MongoMemoryServer | undefined;

/** Khởi động MongoDB in-memory và tạo index (unique, TTL) giống DB thật. */
export async function startTestDb() {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

export async function clearTestDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export async function stopTestDb() {
  await disconnectDatabase();
  await mongo?.stop();
}
