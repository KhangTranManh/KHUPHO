/**
 * XOÁ TOÀN BỘ database rồi khởi tạo lại từ đầu (kèm dữ liệu mẫu nếu có --demo).
 *   npm run db:reset -- --yes [--demo]
 * Bị chặn khi NODE_ENV=production. Không hoàn tác được.
 */
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import { hasFlag, runScript } from './lib/run.js';
import { seedDemo } from './seeds/demo/index.js';
import { seedReference } from './seeds/reference.js';
import { syncSchema } from './seeds/schema.js';
import { seedUsers } from './seeds/users.js';

runScript(async () => {
  if (env.isProduction) throw new Error('Không cho phép db:reset khi NODE_ENV=production');
  if (!hasFlag('yes')) {
    throw new Error(`Lệnh này xoá toàn bộ database "${mongoose.connection.name}". Chạy lại với --yes để xác nhận.`);
  }

  await mongoose.connection.dropDatabase();
  console.log(`Đã xoá database "${mongoose.connection.name}".\n`);

  await syncSchema();
  await seedReference();
  await seedUsers();
  if (hasFlag('demo')) await seedDemo();
});
