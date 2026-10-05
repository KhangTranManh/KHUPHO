/**
 * Bước 1 — cấu trúc: tạo đủ collection và đồng bộ index theo khai báo trong các model
 * (tạo index thiếu, xoá index thừa). Danh sách model: src/models.ts.
 */
import mongoose from 'mongoose';
import { step } from '../lib/run.js';

export async function syncSchema() {
  const existing = new Set((await mongoose.connection.listCollections()).map((c) => c.name));

  for (const model of Object.values(mongoose.models)) {
    const name = model.collection.collectionName;
    if (!existing.has(name)) await model.createCollection();
    const dropped = await model.syncIndexes();
    const indexes = (await model.listIndexes()).length;
    const notes = [existing.has(name) ? '' : 'mới tạo', dropped.length ? `xoá index: ${dropped.join(', ')}` : '']
      .filter(Boolean)
      .join('; ');
    step(name, `${indexes} index${notes ? ` (${notes})` : ''}`);
  }
}
