import { decryptMaybe } from '../../common/security/fieldEncryption.js';

/**
 * Chuyển hộ / nhân khẩu (document hoặc kết quả .lean() / aggregate — trường mã hoá còn ở dạng
 * bản mã) sang dạng trả cho API. Giải mã tại đây. Khớp frontend/src/features/{households,residents}/types.ts.
 */

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Đọc bản thô: document Mongoose → object không chạy getter (giữ bản mã để giải mã thống nhất). */
const raw = (doc: Raw): Raw => (typeof doc.toObject === 'function' ? doc.toObject({ getters: false }) : doc);

const headOf = (h: Raw) => (h.members as Raw[] | undefined)?.find((m) => m.relation === 'chu_ho');

export function toResidentView(household: Raw, member: Raw) {
  const h = raw(household);
  const m = typeof member.toObject === 'function' ? member.toObject({ getters: false }) : member;
  return {
    id: String(m._id),
    fullName: decryptMaybe(m.fullName) ?? '',
    gender: m.gender,
    dateOfBirth: m.dateOfBirth,
    citizenId: decryptMaybe(m.citizenId),
    phone: decryptMaybe(m.phone),
    householdId: String(h._id),
    householdCode: h.code,
    housingType: h.housingType,
    areaName: h.areaName,
    householdRole: m.relation === 'chu_ho' ? 'chu_ho' : 'thanh_vien',
    relationToHead: m.relation === 'chu_ho' ? undefined : m.relation,
    otherContact: decryptMaybe(m.otherContact),
    residenceStatus: m.residenceStatus,
    residenceFrom: m.residenceFrom,
    residenceTo: m.residenceTo,
    residenceHistory: m.residenceHistory ?? [],
    categories: m.categories ?? [],
    registeredAt: m.registeredAt,
  };
}

export function toHouseholdView(household: Raw) {
  const h = raw(household);
  const head = headOf(h);
  const [lng, lat] = h.location?.coordinates ?? [];
  return {
    id: String(h._id),
    code: h.code,
    housingType: h.housingType,
    areaId: String(h.areaId),
    areaName: h.areaName,
    address: h.address,
    houseNumber: h.houseNumber,
    alley: h.alley,
    street: h.street,
    building: h.building,
    block: h.block,
    floor: h.floor,
    apartment: h.apartment,
    householdType: h.householdType,
    location: lat !== undefined ? { lat, lng } : undefined,
    culturalTitles: h.culturalTitles ?? [],
    headName: head ? (decryptMaybe(head.fullName) ?? '') : '',
    headPhone: decryptMaybe(h.contactPhone) ?? (head ? decryptMaybe(head.phone) : undefined),
    memberCount: (h.members as Raw[] | undefined)?.length ?? 0,
    registeredAt: h.registeredAt,
  };
}

/** Hộ kèm danh sách nhân khẩu (GET /households/:id). */
export const toHouseholdDetail = (household: Raw) => ({
  ...toHouseholdView(household),
  members: ((raw(household).members as Raw[]) ?? []).map((m) => toResidentView(household, m)),
});
