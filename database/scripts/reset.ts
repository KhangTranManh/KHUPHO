/**
 * XOÁ TOÀN BỘ database rồi khởi tạo lại từ đầu (= db:wipe + db:setup).
 *   npm run db:reset -- --yes [--demo] [--no-backup]
 * Mặc định sao lưu vào database/backups/ trước khi xoá. Bị chặn khi NODE_ENV=production.
 */
import { mongoose } from '../../backend/src/config/database.js';
import { env } from '../../backend/src/config/env.js';
import { backupDatabase, countCollections } from './lib/backup.js';
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

  const total = Object.values(await countCollections()).reduce((a, b) => a + b, 0);
  if (!hasFlag('no-backup') && total > 0) console.log(`Đã sao lưu vào: ${await backupDatabase()}`);
  await mongoose.connection.dropDatabase();
  console.log(`Đã xoá database "${mongoose.connection.name}".\n`);

  await syncSchema();
  await seedReference();
  await seedUsers();
  if (hasFlag('demo')) await seedDemo();
});
