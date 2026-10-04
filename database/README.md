# Database — MongoDB

Schema được khai báo bằng Mongoose trong `backend/src/modules/*/*.model.ts` (nguồn sự thật duy nhất).
Thư mục này chỉ chứa hạ tầng chạy MongoDB và tài liệu.

## Chạy MongoDB local

```bash
cd database
docker compose up -d          # MongoDB 8 tại localhost:27017, dữ liệu ở database/data/
```

Hoặc dùng MongoDB Atlas: đặt chuỗi kết nối vào `MONGODB_URI` trong `.env` ở thư mục gốc.

Sau đó tạo tài khoản mẫu:

```bash
cd backend
npm run seed:users            # admin / canbo01 / 001099012345 (người dân)
```

## Collections

### `users` — tài khoản đăng nhập (cả 3 vai trò)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `username` | string, unique, lowercase | Người dân dùng số CCCD |
| `passwordHash` | string | bcrypt cost 12, không bao giờ trả ra API |
| `role` | `admin` \| `can_bo` \| `nguoi_dan` | |
| `fullName`, `email`, `phone` | string | |
| `citizenId` | string 12 số, unique (khi có) | Liên kết tới nhân khẩu |
| `status` | `active` \| `disabled` | |
| `failedLoginCount`, `lockedUntil` | number, date | Khoá tạm khi sai mật khẩu nhiều lần |
| `lastLoginAt`, `createdAt`, `updatedAt` | date | |

Index: `username` (unique), `citizenId` (unique, partial), `{ role, status }`.

### `sessions` — phiên đăng nhập (mỗi thiết bị một phiên)

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `userId` | ObjectId → users | |
| `tokenHash` | string, unique | SHA-256 của refresh token hiện tại |
| `previousTokenHash` | string | Token trước khi xoay vòng — dùng phát hiện token bị đánh cắp |
| `expiresAt` | date | TTL index: Mongo tự xoá khi hết hạn |
| `revokedAt`, `revokedReason` | date, string | `logout` \| `logout_all` \| `token_reuse` \| `user_disabled` |
| `lastUsedAt`, `ip`, `userAgent` | | |

### Dự kiến

`households` (hộ gia đình), `residents` (nhân khẩu), `residential_groups` (tổ dân phố),
`temporary_records` (tạm trú / tạm vắng), `resident_changes` (biến động).
Kiểu dữ liệu tham khảo ở `frontend/src/features/*/types.ts`.

## Index ở production

Backend tắt `autoIndex` khi `NODE_ENV=production`. Khi deploy hoặc thêm index mới:

```bash
cd backend && npm run db:sync-indexes
```
