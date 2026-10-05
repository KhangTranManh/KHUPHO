/**
 * Chỉ đồng bộ collection + index (không thêm dữ liệu).
 *   npm run db:sync-indexes
 * Chạy khi deploy production (ở đó autoIndex bị tắt). `db:setup` đã bao gồm bước này.
 */
import { runScript } from './lib/run.js';
import { syncSchema } from './seeds/schema.js';

runScript(syncSchema);
