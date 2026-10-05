import { Schema, model } from 'mongoose';

/**
 * Collection `counters` — bộ đếm tự tăng an toàn khi chạy đồng thời (dùng $inc atomic).
 * VD sinh mã phản ánh "PA-2026-0012": `await nextSequence('report-2026')` → 12.
 */
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false, collection: 'counters' },
);

const CounterModel = model('Counter', counterSchema);

export async function nextSequence(name: string): Promise<number> {
  const counter = await CounterModel.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return counter!.seq;
}
