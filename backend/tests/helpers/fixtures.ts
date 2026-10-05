import { AreaModel } from '../../src/modules/areas/area.model.js';
import { HouseholdModel } from '../../src/modules/households/household.model.js';

export const CITIZEN_CCCD = '001050000001';

/**
 * Dữ liệu mẫu nhỏ:
 *  - Tổ 1 (thấp tầng) với hộ HK-1001: chủ hộ Nguyễn Văn An (CCCD CITIZEN_CCCD, người cao tuổi, CCB),
 *    cháu Nguyễn Thị Cúc (trẻ em), người thuê Lê Minh Đức (tạm trú, có lịch sử cư trú).
 *  - Block A (cao tầng) với hộ HK-1002: chủ hộ Trần Thị Bình (tạm vắng), hộ nghèo, có toạ độ.
 */
export async function seedHouseholds() {
  const [to1, blockA] = await AreaModel.create([
    { name: 'Tổ 1', housingType: 'thap_tang', residentialGroup: 'Tổ 1', streets: ['Lê Lợi'], managerName: 'Lê Văn Tổ' },
    {
      name: 'Hoà Bình – Block A',
      housingType: 'cao_tang',
      residentialGroup: 'Tổ 2',
      building: { name: 'Chung cư Hoà Bình', block: 'A', floors: 20 },
      managerName: 'Phạm Thị Ban',
    },
  ]);

  const h1 = await HouseholdModel.create({
    code: 'HK-1001',
    housingType: 'thap_tang',
    areaId: to1._id,
    areaName: to1.name,
    houseNumber: '12/3',
    alley: 'Hẻm 120',
    street: 'Lê Lợi',
    address: '12/3, Hẻm 120 Lê Lợi',
    contactPhone: '0901234567',
    registeredAt: '2010-05-01',
    culturalTitles: [{ year: new Date().getFullYear() - 1, result: 'dat' }],
    members: [
      {
        fullName: 'Nguyễn Văn An', gender: 'nam', dateOfBirth: '1950-03-10', citizenId: CITIZEN_CCCD, phone: '0901234567',
        relation: 'chu_ho', categories: ['nguoi_cao_tuoi', 'cuu_chien_binh'], registeredAt: '2010-05-01',
        otherContact: 'Con: Nguyễn Văn Bảo – 0912345678',
      },
      {
        fullName: 'Nguyễn Thị Cúc', gender: 'nu', dateOfBirth: '2015-07-20', relation: 'chau',
        categories: ['tre_em', 'hoc_sinh_sinh_vien'], registeredAt: '2015-07-20',
      },
      {
        fullName: 'Lê Minh Đức', gender: 'nam', dateOfBirth: '1998-01-01', citizenId: '079098000003', phone: '0988000111',
        relation: 'nguoi_thue', categories: ['nguoi_di_lam'], registeredAt: '2025-01-10',
        residenceStatus: 'tam_tru', residenceFrom: '2025-01-10', residenceTo: '2026-12-31',
        residenceHistory: [{ status: 'tam_tru', from: '2025-01-10', to: '2026-12-31', note: 'Thuê trọ đi làm' }],
      },
    ],
  });

  const h2 = await HouseholdModel.create({
    code: 'HK-1002',
    housingType: 'cao_tang',
    areaId: blockA._id,
    areaName: blockA.name,
    building: 'Chung cư Hoà Bình',
    block: 'A',
    floor: 12,
    apartment: 'A-1205',
    address: 'Căn A-1205, Chung cư Hoà Bình',
    householdType: 'ngheo',
    location: { type: 'Point', coordinates: [106.7, 10.78] },
    registeredAt: '2020-01-15',
    members: [
      {
        fullName: 'Trần Thị Bình', gender: 'nu', dateOfBirth: '1985-11-11', citizenId: '001185000004',
        relation: 'chu_ho', residenceStatus: 'tam_vang', residenceFrom: '2026-01-01',
        categories: ['nguoi_di_lam'], registeredAt: '2020-01-15',
      },
    ],
  });

  return { to1, blockA, h1, h2 };
}
