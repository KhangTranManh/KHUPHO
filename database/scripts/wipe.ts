/**
 * XOÁ SẠCH database — dùng trước khi nạp lại dữ liệu chính.
 *   npm run db:wipe                      # xem sẽ xoá những gì (không xoá)
 *   npm run db:wipe -- --yes             # tự sao lưu vào database/backups/ rồi xoá
 *   npm run db:wipe -- --yes --no-backup # xoá luôn, không sao lưu
 * Xoá xong DB trống hoàn toàn (kể cả tài khoản). Tạo lại cấu trúc + tài khoản: npm run db:setup [-- --demo].
 * Muốn xoá rồi tạo lại ngay trong một lệnh: npm run db:reset -- --yes [--demo].
 * Bị chặn khi NODE_ENV=production.
 */
import { env } from '../../backend/src/config/env.js';
import { mongoose } from '../../backend/src/config/database.js';
import { backupDatabase, countCollections } from './lib/backup.js';
import { hasFlag, runScript } from './lib/run.js';

runScript(async () => {
  if (env.isProduction) throw new Error('Không cho phép db:wipe khi NODE_ENV=production');

  const name = mongoose.connection.name;
  const counts = await countCollections();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.table(Object.entries(counts).map(([collection, documents]) => ({ collection, documents })));

  if (!hasFlag('yes')) {
    console.log(`Lệnh này sẽ XOÁ toàn bộ ${total} document trong database "${name}".`);
    console.log('Chạy lại kèm --yes để xác nhận (mặc định sao lưu trước vào database/backups/).');
    return;
  }

  if (!hasFlag('no-backup') && total > 0) {
    console.log(`Đã sao lưu vào: ${await backupDatabase()}`);
  }
  await mongoose.connection.dropDatabase();
  console.log(`\nĐã xoá database "${name}".`);
  console.log('Tiếp theo: npm run db:setup  (hoặc db:setup -- --demo để có dữ liệu mẫu)');
});
