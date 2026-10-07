/**
 * Bước 2 — dữ liệu nền cần có để hệ thống chạy được:
 *  - 8 khoản quỹ dân sinh của năm hiện tại (mức thu theo đặc tả, tính theo hộ);
 *  - các số khẩn cấp toàn quốc trong Sổ tay phường.
 * Chạy lại an toàn: bản ghi đã có được giữ nguyên ($setOnInsert).
 * Số của trưởng KP, UBND phường, hội đoàn… do trưởng KP nhập qua POST /api/directory.
 * Tài khoản nhận (bank) của từng quỹ cập nhật trong collection `funds` khi có — không đặt sẵn để tránh QR giả.
 */
import { DirectoryModel } from '../../../backend/src/modules/directory/directory.model.js';
import { FundModel } from '../../../backend/src/modules/funds/fund.model.js';
import { step } from '../lib/run.js';

export const FUNDS = [
  { code: 'PCTT', name: 'Phòng chống thiên tai', defaultAmount: null, description: 'Đóng theo quy định, mức tuỳ thu nhập lao động' },
  { code: 'VI-NGUOI-NGHEO', name: 'Vì người nghèo', defaultAmount: 45_000 },
  { code: 'BIEN-DAO', name: 'Vì biển đảo quê hương', defaultAmount: 15_000 },
  { code: 'TUYEN-DAU', name: 'Vì tuyến đầu Tổ quốc', defaultAmount: 15_000 },
  { code: 'KHUYEN-HOC', name: 'Khuyến học', defaultAmount: 20_000 },
  { code: 'THIEU-NHI', name: 'Tết Thiếu nhi & Trung thu', defaultAmount: 35_000 },
  { code: 'PHONG-DICH', name: 'Phòng chống dịch', defaultAmount: 15_000 },
  { code: 'THAM-HOI', name: 'Thăm hỏi người khó khăn, đau bệnh', defaultAmount: 50_000 },
];

const EMERGENCY = [
  { group: 'khan_cap', unit: 'Công an (cấp cứu an ninh)', phone: '113', order: 1 },
  { group: 'khan_cap', unit: 'Cứu hoả – Cảnh sát PCCC', phone: '114', order: 2 },
  { group: 'khan_cap', unit: 'Cấp cứu y tế', phone: '115', order: 3 },
] as const;

export async function seedReference(year = new Date().getFullYear()) {
  let funds = 0;
  for (const f of FUNDS) {
    const res = await FundModel.updateOne(
      { code: f.code, 'period.year': year },
      { $setOnInsert: { ...f, unit: 'ho', period: { type: 'nam', year }, dueDate: `${year}-12-31`, status: 'mo' } },
      { upsert: true },
    );
    funds += res.upsertedCount;
  }
  step(`Quỹ năm ${year}`, `thêm ${funds}/${FUNDS.length}`);

  let entries = 0;
  for (const e of EMERGENCY) {
    const res = await DirectoryModel.updateOne({ phone: e.phone }, { $setOnInsert: e }, { upsert: true });
    entries += res.upsertedCount;
  }
  step('Số khẩn cấp', `thêm ${entries}/${EMERGENCY.length}`);
}
