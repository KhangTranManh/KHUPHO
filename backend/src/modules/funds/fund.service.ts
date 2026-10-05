import { Types, isValidObjectId } from 'mongoose';
import { Errors } from '../../common/errors/AppError.js';
import { householdSearchCondition } from '../households/household.service.js';
import { toHouseholdView } from '../households/household.mapper.js';
import { HouseholdModel } from '../households/household.model.js';
import { notifyHousehold } from '../notifications/notification.service.js';
import type { Actor } from '../users/currentUser.js';
import { FundModel, type Fund } from './fund.model.js';
import type { FundHouseholdQuery, MarkPaidInput } from './fund.schemas.js';
import { FundPaymentModel } from './fundPayment.model.js';

const vnd = new Intl.NumberFormat('vi-VN');

async function getFund(id: string) {
  const fund = isValidObjectId(id) ? await FundModel.findById(id) : null;
  if (!fund) throw Errors.notFound('Không tìm thấy quỹ');
  return fund;
}

/** Số tiền phải đóng của một hộ: theo hộ = mức mặc định; theo người = mức × số nhân khẩu. */
export const amountDue = (fund: Pick<Fund, 'defaultAmount' | 'unit'>, memberCount: number) =>
  fund.defaultAmount == null ? null : fund.unit === 'nguoi' ? fund.defaultAmount * memberCount : fund.defaultAmount;

const paidIdsOf = (fundId: Types.ObjectId) =>
  FundPaymentModel.find({ fundId, status: 'da_dong' }).distinct('householdId');

/** Các quỹ đang mở, kèm số hộ đã đóng và tổng tiền đã thu. */
export async function listFunds() {
  const [funds, totalHouseholds, stats] = await Promise.all([
    FundModel.find({ status: 'mo' }).sort({ 'period.year': -1, createdAt: 1 }),
    HouseholdModel.countDocuments(),
    FundPaymentModel.aggregate<{ _id: Types.ObjectId; paid: number; amount: number }>([
      { $match: { status: 'da_dong' } },
      { $group: { _id: '$fundId', paid: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
  ]);
  const byFund = new Map(stats.map((s) => [String(s._id), s]));
  return funds.map((f) => ({
    ...(f.toJSON() as object),
    totalHouseholds,
    paidHouseholds: byFund.get(f.id)?.paid ?? 0,
    collectedAmount: byFund.get(f.id)?.amount ?? 0,
  }));
}

/** Danh sách hộ + trạng thái đóng của một quỹ (Paged<FundHouseholdStatus>). */
export async function listFundHouseholds(fundId: string, q: FundHouseholdQuery) {
  const fund = await getFund(fundId);
  const paidIds = await paidIdsOf(fund._id);

  const filter: Record<string, unknown> = householdSearchCondition(q.search);
  if (q.filter === 'da_dong') filter._id = { $in: paidIds };
  if (q.filter === 'chua_dong') filter._id = { $nin: paidIds };

  const [households, total] = await Promise.all([
    HouseholdModel.find(filter).sort({ areaName: 1, code: 1 }).skip((q.page - 1) * q.pageSize).limit(q.pageSize).lean(),
    HouseholdModel.countDocuments(filter),
  ]);
  const payments = await FundPaymentModel.find({ fundId: fund._id, householdId: { $in: households.map((h) => h._id) } });
  const paymentOf = new Map(payments.map((p) => [String(p.householdId), p]));

  return {
    items: households.map((h) => {
      const view = toHouseholdView(h);
      const payment = paymentOf.get(view.id);
      return {
        householdId: view.id,
        householdCode: view.code,
        headName: view.headName,
        address: view.address,
        areaName: view.areaName,
        amountDue: amountDue(fund, view.memberCount),
        payment: payment?.status === 'da_dong' ? payment : undefined,
      };
    }),
    total,
    page: q.page,
    pageSize: q.pageSize,
  };
}

/** Đánh dấu hộ đã đóng → lưu khoản đóng → gửi thông báo xác nhận đến hộ. */
export async function markPaid(fundId: string, input: MarkPaidInput, actor: Actor) {
  const fund = await getFund(fundId);
  if (fund.status !== 'mo') throw Errors.badRequest('Quỹ đã ngừng thu');
  const household = await HouseholdModel.findById(input.householdId);
  if (!household) throw Errors.notFound('Không tìm thấy hộ gia đình');
  if (await FundPaymentModel.exists({ fundId: fund._id, householdId: household._id, status: 'da_dong' })) {
    throw Errors.conflict('Hộ này đã đóng quỹ');
  }
  const amount = input.amount ?? amountDue(fund, household.members.length);
  if (!amount) throw Errors.badRequest('Quỹ tự nguyện — vui lòng nhập số tiền');

  const payment = await FundPaymentModel.findOneAndUpdate(
    { fundId: fund._id, householdId: household._id },
    {
      $set: {
        householdCode: household.code,
        amount,
        status: 'da_dong',
        method: input.method,
        transactionCode: input.transactionCode,
        paidAt: new Date(),
        confirmedBy: { userId: actor.userId, name: actor.fullName },
      },
    },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );

  await notifyHousehold(household._id, {
    kind: 'quy_dan_sinh',
    title: `Xác nhận đóng quỹ ${fund.name}`,
    body: `Hộ ${household.code} đã đóng ${vnd.format(amount)} đ cho quỹ ${fund.name}. Cảm ơn gia đình!`,
    refId: payment!._id,
  });
  return { payment, notified: true };
}

/** Gửi thông báo nhắc tới mọi hộ chưa đóng quỹ. */
export async function remindUnpaid(fundId: string) {
  const fund = await getFund(fundId);
  const paidIds = await paidIdsOf(fund._id);
  const unpaid = await HouseholdModel.find({ _id: { $nin: paidIds } }).select('_id code members._id').lean();
  const due = fund.dueDate ? ` trước ngày ${fund.dueDate.split('-').reverse().join('/')}` : '';
  await Promise.all(
    unpaid.map((h) => {
      const amount = amountDue(fund, h.members.length);
      return notifyHousehold(h._id, {
        kind: 'nhac_dong_quy',
        title: `Nhắc đóng quỹ ${fund.name}`,
        body: `Hộ ${h.code} chưa đóng quỹ ${fund.name}${amount ? ` (${vnd.format(amount)} đ)` : ''}${due}.`,
        refId: fund._id,
      });
    }),
  );
  return { notified: unpaid.length };
}
