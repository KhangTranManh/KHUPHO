/**
 * Khung chung cho mọi script database: kết nối → chạy → luôn ngắt kết nối; lỗi → exit code 1.
 *   runScript(async () => { ... });
 */
import mongoose, { type HydratedDocument, type Model } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../../../src/config/database.js';
import { env } from '../../../src/config/env.js';
import '../../../src/models.js';

/** Cờ dòng lệnh: `npm run db:setup -- --demo` → hasFlag('demo') = true. */
export const hasFlag = (name: string) => process.argv.includes(`--${name}`);

export function runScript(main: () => Promise<void>) {
  (async () => {
    await connectDatabase();
    console.log(`MongoDB → database "${mongoose.connection.name}" (${env.NODE_ENV})\n`);
    await main();
  })()
    .then(() => disconnectDatabase())
    .catch(async (err) => {
      console.error(err instanceof Error ? err.message : err);
      await disconnectDatabase().catch(() => {});
      process.exit(1);
    });
}

/** In một bước: "✓ Quỹ năm 2026 ........ thêm 8". */
export function step(label: string, detail: string | number) {
  console.log(`✓ ${label.padEnd(28, ' ')} ${detail}`);
}

/**
 * Lưu lần lượt từng document qua `new Model(doc).save()` → chạy đủ setter mã hoá + hook validate,
 * giữ đúng thứ tự (VD: hộ đầu tiên luôn là hộ của cư dân mẫu).
 */
export async function createEach<T>(model: Model<T>, docs: readonly object[]): Promise<HydratedDocument<T>[]> {
  const saved: HydratedDocument<T>[] = [];
  for (const doc of docs) saved.push((await new model(doc).save()) as HydratedDocument<T>);
  return saved;
}
