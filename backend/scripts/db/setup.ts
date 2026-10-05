/**
 * Khởi tạo database hệ thống khu phố — một lệnh, chạy lại bao nhiêu lần cũng an toàn.
 *   npm run db:setup              # cấu trúc + dữ liệu nền + tài khoản
 *   npm run db:setup -- --demo    # thêm dữ liệu mẫu cho toàn hệ thống (chỉ khi DB chưa có hộ)
 *
 * Thứ tự:
 *   1. schema    — tạo collection, đồng bộ index (src/models.ts)
 *   2. reference — quỹ năm nay, số khẩn cấp
 *   3. users     — 3 tài khoản (trưởng KP, công an KV, cư dân)
 *   4. demo      — khu vực, hộ, nhân khẩu, biến động, phản ánh, bài đăng, quỹ, khảo sát, sinh hoạt
 */
import { hasFlag, runScript } from './lib/run.js';
import { seedDemo } from './seeds/demo/index.js';
import { seedReference } from './seeds/reference.js';
import { syncSchema } from './seeds/schema.js';
import { seedUsers } from './seeds/users.js';

runScript(async () => {
  console.log('1. Cấu trúc (collection + index)');
  await syncSchema();

  console.log('\n2. Dữ liệu nền');
  await seedReference();

  console.log('\n3. Tài khoản');
  await seedUsers();

  if (hasFlag('demo')) {
    console.log('\n4. Dữ liệu mẫu');
    await seedDemo();
  }

  console.log('\nXong. Xem tổng quan: npm run db:status');
});
