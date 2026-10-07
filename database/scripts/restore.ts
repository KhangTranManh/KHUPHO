/**
 * Khôi phục database từ một bản sao lưu.
 *   npm run db:restore                         # liệt kê các bản sao lưu
 *   npm run db:restore -- <tên thư mục> --yes  # khôi phục (ghi đè các collection có trong bản sao lưu)
 * Cần đúng khoá mã hoá (DATA_ENCRYPTION_KEY, DATA_INDEX_KEY) như lúc sao lưu. Bị chặn khi NODE_ENV=production.
 */
import { join } from 'node:path';
import { env } from '../../backend/src/config/env.js';
import { BACKUP_ROOT, listBackups, restoreDatabase } from './lib/backup.js';
import { hasFlag, runScript, step } from './lib/run.js';
import { syncSchema } from './seeds/schema.js';

runScript(async () => {
  const name = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const backups = await listBackups();

  if (!name) {
    console.log(backups.length ? 'Các bản sao lưu (mới nhất trước):' : `Chưa có bản sao lưu nào trong ${BACKUP_ROOT}`);
    for (const b of backups) console.log(`  ${b}`);
    if (backups.length) console.log(`\nKhôi phục: npm run db:restore -- ${backups[0]} --yes`);
    return;
  }
  if (env.isProduction) throw new Error('Không cho phép db:restore khi NODE_ENV=production');
  if (!backups.includes(name)) throw new Error(`Không thấy bản sao lưu "${name}" trong ${BACKUP_ROOT}`);
  if (!hasFlag('yes')) throw new Error('Khôi phục sẽ GHI ĐÈ dữ liệu hiện tại. Chạy lại kèm --yes để xác nhận.');

  const restored = await restoreDatabase(join(BACKUP_ROOT, name));
  for (const [collection, n] of Object.entries(restored)) step(collection, `${n} document`);
  console.log('\nĐồng bộ index:');
  await syncSchema();
  console.log(`\nĐã khôi phục từ ${name}.`);
});
