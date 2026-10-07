/**
 * Kiểm tra tính đúng đắn của dữ liệu — chạy sau khi nhập / sửa dữ liệu chính.
 *   npm run db:check
 * Chỉ đọc. Có lỗi (✗) → exit code 1 (dùng được trong CI); cảnh báo (!) không làm lệnh thất bại.
 * Danh sách kiểm tra: lib/checks.ts.
 */
import { runChecks } from './lib/checks.js';
import { runScript } from './lib/run.js';

const MAX_SHOWN = 8;

runScript(async () => {
  const results = await runChecks();
  let errors = 0;
  let warnings = 0;

  for (const r of results) {
    const mark = r.issues.length === 0 ? '✓' : r.level === 'error' ? '✗' : '!';
    console.log(`${mark} ${r.title}${r.issues.length ? ` — ${r.issues.length}` : ''}`);
    for (const issue of r.issues.slice(0, MAX_SHOWN)) console.log(`    ${issue}`);
    if (r.issues.length > MAX_SHOWN) console.log(`    … và ${r.issues.length - MAX_SHOWN} mục khác`);
    if (r.issues.length) r.level === 'error' ? errors++ : warnings++;
  }

  console.log(`\n${errors} lỗi, ${warnings} cảnh báo.`);
  if (errors) process.exitCode = 1;
});
