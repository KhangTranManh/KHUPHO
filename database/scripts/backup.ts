/**
 * Sao lưu toàn bộ database ra database/backups/<db>-<thời gian>/ (mỗi collection một file JSON).
 *   npm run db:backup
 * Nên chạy trước khi sửa / nhập dữ liệu chính. Khôi phục: npm run db:restore.
 */
import { backupDatabase, countCollections } from './lib/backup.js';
import { runScript, step } from './lib/run.js';

runScript(async () => {
  const counts = await countCollections();
  const dir = await backupDatabase();
  for (const [name, n] of Object.entries(counts)) step(name, `${n} document`);
  console.log(`\nĐã sao lưu vào: ${dir}`);
  console.log('Lưu ý: file có dữ liệu đã mã hoá + hash mật khẩu — không chia sẻ, không commit.');
});
