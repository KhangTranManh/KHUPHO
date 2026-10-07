/**
 * Sao lưu / khôi phục nguyên trạng database ra file (Extended JSON — giữ đúng ObjectId, Date…).
 * Dữ liệu cá nhân vẫn ở dạng MÃ HOÁ như trong DB → khôi phục cần đúng DATA_ENCRYPTION_KEY / DATA_INDEX_KEY.
 * File sao lưu có hash mật khẩu, hash SĐT… → database/backups/ đã nằm trong .gitignore, không gửi đi đâu.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mongoose } from '../../../backend/src/config/database.js';

export const BACKUP_ROOT = fileURLToPath(new URL('../../backups', import.meta.url));

const { EJSON } = mongoose.mongo.BSON;
const db = () => mongoose.connection.db!;

interface Manifest {
  database: string;
  createdAt: string;
  collections: Record<string, number>;
}

/** Số document của từng collection đang có trong DB (kể cả collection không có model). */
export async function countCollections(): Promise<Record<string, number>> {
  const names = (await db().listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
  const out: Record<string, number> = {};
  for (const name of names) {
    if (name.startsWith('system.')) continue;
    out[name] = await db().collection(name).estimatedDocumentCount();
  }
  return out;
}

/** Ghi mỗi collection ra một file JSON trong database/backups/<db>-<thời gian>/. Trả về thư mục đã tạo. */
export async function backupDatabase(root = BACKUP_ROOT): Promise<string> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = join(root, `${mongoose.connection.name}-${stamp}`);
  await mkdir(dir, { recursive: true });

  const collections = await countCollections();
  for (const name of Object.keys(collections)) {
    const docs = await db().collection(name).find().toArray();
    await writeFile(join(dir, `${name}.json`), EJSON.stringify(docs, undefined, 0, { relaxed: false }));
  }
  const manifest: Manifest = { database: mongoose.connection.name, createdAt: new Date().toISOString(), collections };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return dir;
}

/** Danh sách bản sao lưu, mới nhất trước. */
export async function listBackups(): Promise<string[]> {
  try {
    return (await readdir(BACKUP_ROOT, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/** Ghi đè từng collection có trong bản sao lưu (xoá dữ liệu hiện có của collection đó rồi chèn lại). */
export async function restoreDatabase(dir: string): Promise<Record<string, number>> {
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8')) as Manifest;
  const restored: Record<string, number> = {};
  for (const name of Object.keys(manifest.collections)) {
    const docs = EJSON.parse(await readFile(join(dir, `${name}.json`), 'utf8')) as Record<string, unknown>[];
    // Tạo lại cả collection rỗng (giữ nguyên cấu trúc như lúc sao lưu).
    await db().createCollection(name).catch(() => {});
    const collection = db().collection(name);
    await collection.deleteMany({});
    if (docs.length) await collection.insertMany(docs);
    restored[name] = docs.length;
  }
  return restored;
}
