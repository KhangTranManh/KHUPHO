/**
 * Tổng quan database: mỗi collection có bao nhiêu document, bao nhiêu index. Chỉ đọc.
 *   npm run db:status
 */
import mongoose from 'mongoose';
import { runScript } from './lib/run.js';

runScript(async () => {
  const existing = new Set((await mongoose.connection.listCollections()).map((c) => c.name));
  const rows = [];
  for (const model of Object.values(mongoose.models)) {
    const name = model.collection.collectionName;
    const exists = existing.has(name);
    rows.push({
      collection: name,
      documents: exists ? await model.estimatedDocumentCount() : '— chưa tạo',
      indexes: exists ? (await model.listIndexes()).length : 0,
    });
  }
  console.table(rows);
});
