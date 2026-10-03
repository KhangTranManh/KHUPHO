/**
 * Đồng bộ index MongoDB theo khai báo trong các model (tạo index thiếu, xoá index thừa).
 *   npm run db:sync-indexes
 * Chạy khi deploy production (ở đó autoIndex bị tắt).
 */
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
// Import để đăng ký model với mongoose.
import '../src/modules/auth/session.model.js';
import '../src/modules/users/user.model.js';

async function main() {
  await connectDatabase();
  for (const model of Object.values(mongoose.models)) {
    const dropped = await model.syncIndexes();
    console.log(`✓ ${model.collection.collectionName}${dropped.length ? ` (đã xoá: ${dropped.join(', ')})` : ''}`);
  }
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDatabase();
  process.exit(1);
});
