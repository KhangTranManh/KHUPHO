# Database — MongoDB

Schema được khai báo bằng Mongoose trong `backend/src/modules/*/*.model.ts` (nguồn sự thật duy nhất;
danh sách đầy đủ ở `backend/src/models.ts`). Thư mục này chứa hạ tầng chạy MongoDB và bản mô tả dữ liệu.

## Chạy MongoDB local

```bash
cd database
docker compose up -d          # MongoDB 8 tại localhost:27017, dữ liệu ở database/data/
```

Hoặc MongoDB Atlas: đặt chuỗi kết nối vào `MONGODB_URI` trong `.env` ở thư mục gốc.

```bash
cd backend
npm run seed:reference        # 8 khoản quỹ năm nay + số khẩn cấp 113/114/115
npm run seed:users            # 3 tài khoản mẫu (trưởng KP, công an KV, cư dân)
npm run db:sync-indexes       # tạo index (bắt buộc ở production)
```

## Nguyên tắc

- **Nhúng theo hộ:** nhân khẩu (`members`) và danh hiệu văn hoá (`culturalTitles`) nằm trong document hộ.
  Đọc một hộ là có đủ thành viên; nhân khẩu không tồn tại ngoài hộ.
- **Tách collection khi tăng không giới hạn hoặc có vòng đời riêng:** khoản đóng quỹ, lượt đọc bài,
  câu trả lời khảo sát, phản ánh, phiên đăng nhập.
- **Mã hoá dữ liệu cá nhân ở tầng ứng dụng** (AES-256-GCM, khoá `DATA_ENCRYPTION_KEY`):
  họ tên, CCCD, SĐT, email, liên hệ khác, tên người gửi phản ánh, tên trong nhật ký biến động.
  Trong DB chỉ thấy chuỗi `v1.<iv>.<tag>.<bản mã>`. **Mất khoá = mất dữ liệu.**
- **Tra cứu trên dữ liệu đã mã hoá:** blind index HMAC (khoá `DATA_INDEX_KEY`)
  - `*Hash`: tra chính xác (CCCD, SĐT, email đăng nhập);
  - `searchTokens`: HMAC từng từ → tìm theo **từ đầy đủ** ("nguyen an" khớp "Nguyễn Văn An"), không tìm được một phần từ.
- Ngày không có giờ lưu chuỗi `yyyy-mm-dd`. Tuổi không lưu, tính từ ngày sinh.

## Quan hệ

```mermaid
erDiagram
  areas ||--o{ households : "khu vực 1─n hộ"
  households ||--o{ members : "nhúng: hộ 1─n nhân khẩu"
  members ||--o| users : "nhân khẩu ─1 tài khoản (cư dân)"
  households ||--o{ fund_payments : "hộ 1─n khoản đóng"
  funds ||--o{ fund_payments : "quỹ 1─n khoản đóng"
  households ||--o{ reports : "hộ / người 1─n phản ánh"
  users ||--o{ reports : "người gửi"
  posts }o--o{ areas : "nhắm tới khu vực"
  posts ||--o{ post_reads : "trạng thái đọc"
  users ||--o{ post_reads : ""
  surveys ||--o{ survey_responses : "khảo sát 1─n câu trả lời"
  users ||--o{ survey_responses : "n─1 người"
  households ||--o{ notifications : "thông báo đến hộ"
```

## 1. Lõi: Khu vực, Hộ, Nhân khẩu

### `areas` — Khu vực / Toà nhà

| Trường | Ghi chú |
|---|---|
| `name` (unique) | "Tổ 1", "Hoà Bình – Block A" |
| `housingType` | `thap_tang` / `cao_tang` |
| `residentialGroup` | Tổ dân phố quản lý |
| `streets[]` | Tên hẻm / đường (thấp tầng) |
| `building` { `name`, `block`, `floors` } | Toà, block, số tầng (cao tầng) |
| `managerName`, `managerPhone` | Tổ trưởng / trưởng ban quản trị |

### `households` — Hộ gia đình (nhúng nhân khẩu)

| Trường | Ghi chú |
|---|---|
| `code` (unique) | Mã hộ |
| `areaId` → areas, `areaName` | Khu vực (tên sao chép để hiển thị) |
| `address`; thấp tầng `houseNumber`, `alley`, `street`; cao tầng `building`, `block`, `floor`, `apartment` | Địa chỉ |
| `contactPhone` 🔒 | SĐT liên hệ của hộ |
| `householdType` | `thuong` / `ngheo` / `can_ngheo` / `chinh_sach` / `kho_khan` |
| `location` (GeoJSON Point, index 2dsphere) | Toạ độ — sơ đồ hộ chính sách, SOS |
| `culturalTitles[]` { `year`, `result`, `note` } | Danh hiệu gia đình văn hoá theo năm (`dat` / `chua_dat` / `dang_binh_xet`) |
| `members[]` | Nhân khẩu (bảng dưới). Chủ hộ = thành viên `relation: chu_ho`, đúng một người |
| `searchText`, `searchTokens` | Tìm kiếm (nội bộ) |

### `households.members[]` — Nhân khẩu (nhúng)

| Trường | Ghi chú |
|---|---|
| `fullName` 🔒 | Họ tên |
| `dateOfBirth`, `gender` | Ngày sinh, giới tính |
| `citizenId` 🔒 + `citizenIdHash` | CCCD (có thể trống với trẻ em) |
| `phone` 🔒 + `phoneHash` | SĐT |
| `relation` | Quan hệ với chủ hộ: `chu_ho`, `vo_chong`, `con`, `cha_me`, `ong_ba`, `anh_chi_em`, `chau`, `nguoi_thue`, `khac` |
| `otherContact` 🔒 | Liên hệ khác (người thân, nơi làm việc…) |
| `residenceStatus` | **Một giá trị hiện tại:** `thuong_tru` / `tam_tru` / `tam_vang` |
| `residenceFrom`, `residenceTo` | Ngày bắt đầu / kết thúc tạm trú hoặc tạm vắng hiện tại |
| `residenceHistory[]` { `status`, `from`, `to`, `note`, `recordedAt`, `recordedBy` } | **Lịch sử cư trú** — mỗi lần đổi tình trạng thêm một dòng |
| `categories[]` | Nhóm đối tượng (nhiều nhóm): `nguoi_cao_tuoi`, `tre_em`, `hoc_sinh_sinh_vien`, `nguoi_di_lam`, `that_nghiep`, `nguoi_khuyet_tat`, `cuu_chien_binh` |
| `registeredAt` | Ngày đăng ký cư trú |
| `searchTokens` | HMAC tên / CCCD / SĐT |

### `resident_changes` — Nhật ký biến động

`type` (`nhap_khau`, `chuyen_di`, `sinh`, `tu_vong`, `tam_tru`, `tam_vang`), `householdId`, `memberId`,
`residentName` 🔒, `householdCode`, `date`, `officer`, `officerId`, `note`.

## 2. Người dùng & phân quyền

### `users`

| Trường | Ghi chú |
|---|---|
| `fullName` 🔒 | |
| `phone` 🔒 + `phoneHash` (unique) / `email` 🔒 + `emailHash` (unique) | Đăng nhập bằng SĐT **hoặc** email (cần ít nhất một) |
| `passwordHash` | bcrypt cost 12 |
| `role` | `truong_kp` (toàn quyền) / `cong_an_kv` (dân cư + phản ánh) / `cu_dan` |
| `residentRef` { `householdId`, `memberId` } (unique memberId) | Liên kết tới nhân khẩu — cư dân |
| `status`, `failedLoginCount`, `lockedUntil`, `lastLoginAt` | Khoá / chống dò mật khẩu |

### `sessions` — Phiên đăng nhập

`userId`, `tokenHash` (SHA-256 refresh token, unique), `previousTokenHash`, `expiresAt` (TTL), `revokedAt`,
`revokedReason`, `ip`, `userAgent`.

## 3. An ninh & Khẩn cấp

### `reports` — Phản ánh (gộp SOS)

| Trường | Ghi chú |
|---|---|
| `code` (unique) | `PA-<năm>-<số>` / `SOS-<năm>-<số>` (bộ đếm ở `counters`) |
| `type` | `an_ninh`, `mat_an_toan`, `hu_hong_dan_sinh`, `sos` — suy ra từ `category` |
| `category` | `trom_cap`, `lua_dao`, `doi_tuong_tinh_nghi`, `ngap_nuoc`, `lan_chiem`, `mat_an_toan_khac`, `hu_hong_dan_sinh`, `sos` |
| `severity` | `thuong` / `khan` (SOS luôn `khan`) |
| `title`, `description`, `images[]` (URL) | Nội dung, ảnh |
| `location` { `address`, `point` (GeoJSON) } | Vị trí |
| `reporter` { `userId`, `householdId`, `householdCode`, `name` 🔒, `phone` 🔒 } | Người gửi + hộ của người gửi |
| `status` | `moi` → `dang_xu_ly` → `da_xong` |
| `assignedRole` (`truong_kp` / `cong_an_kv`), `assignee` { `userId`, `name` } | Người được giao xử lý |
| `createdAt` / `resolvedAt` | Thời gian gửi / xử lý xong |
| `history[]` { `at`, `byUserId`, `byName`, `action`, `fromStatus`, `toStatus`, `note` } | **Lịch sử xử lý** — ai làm gì, lúc nào (chỉ thêm) |

## 4. Thông báo & Tuyên truyền

### `posts` — Bài đăng

| Trường | Ghi chú |
|---|---|
| `kind` | `thong_bao_nhanh` / `tuyen_truyen` / `su_kien` |
| `category` | `rac`, `cup_dien`, `pccc`, `tiem_chung`, `kham_suc_khoe`, `chinh_sach`, `phong_dich`, `van_dong_quy`, `le_hoi`, `khac` |
| `title`, `content`, `attachments[]` { `url`, `name`, `mimeType` } | Nội dung, file đính kèm |
| `eventDate`, `eventTime`, `location` | Ngày diễn ra, địa điểm |
| `audience` { `scope`: `all` / `area` / `group`, `areaIds[]`, `categories[]` } | Đối tượng nhận |
| `pinned`, `publishedAt`, `author` { `userId`, `name` }, `readCount` | |

### `post_reads` — Trạng thái đọc

`postId` + `userId` (unique), `readAt`.

### `directory` — Sổ tay phường

`group` (`khan_cap` / `chinh_quyen` / `khu_pho` / `doan_the`), `unit` (đơn vị: CSKV, PCCC, Y tế, UBND, hội đoàn thể…),
`personInCharge`, `phone`, `note`, `order`. Công khai cho cư dân nên không mã hoá.

### `notifications` — Thông báo đến hộ

`householdId`, `kind` (`quy_dan_sinh`, `nhac_dong_quy`, `phan_anh`, `thong_bao`), `title`, `body`, `refId`, `readAt`.

## 5. Thu quỹ

### `funds` — Quỹ

| Trường | Ghi chú |
|---|---|
| `code`, `name` | Mã quỹ dùng làm nội dung chuyển khoản |
| `defaultAmount` | Mức đóng mặc định (đồng); `null` = tự nguyện |
| `unit` | `ho` (theo hộ) / `nguoi` (theo người → mức × số nhân khẩu) |
| `period` { `type`: `nam` / `dot`, `year`, `label` } | Kỳ thu |
| `dueDate`, `status` (`mo` / `dong`) | Hạn đóng, trạng thái |
| `bank` { `bin`, `accountNo`, `accountName` } | Tài khoản nhận → mã VietQR |

### `fund_payments` — Khoản đóng

`fundId` + `householdId` (unique), `householdCode`, `amount`, `status` (`chua_dong` / `da_dong`),
`method` (`qr` / `tien_mat`), `transactionCode`, `paidAt`, `confirmedBy` { `userId`, `name` }.

Hộ chưa đóng = hộ không có khoản `da_dong` của quỹ → đối tượng gửi thông báo nhắc (`POST /api/funds/:id/reminders`).

## 6. Cộng đồng

### `surveys` / `survey_responses` — Khảo sát

`surveys`: `title`, `description`, `questions[]` { `text`, `options[]` }, `startDate`, `endDate` (thời hạn),
`scope` { `type`: `all` / `area`, `areaIds[]` }, `status`, `results[][]` (đếm sẵn), `responseCount`.

`survey_responses`: `surveyId` + `userId` (unique — mỗi người trả lời một lần), `answers[]`.

### `activities` — Lịch sinh hoạt khu phố

`title`, `kind`, `content`, `date`, `startTime`, `endTime`, `location`, `organizer`, `minutes` (biên bản / ghi chú).

## Hạ tầng

`counters` — bộ đếm tự tăng (`_id` = tên, VD `pa-2026`; `seq`).

## Index ở production

Backend tắt `autoIndex` khi `NODE_ENV=production`. Khi deploy hoặc thêm index mới:

```bash
cd backend && npm run db:sync-indexes
```

🔒 = trường được mã hoá.
