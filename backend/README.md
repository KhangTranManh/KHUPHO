# Backend — API quản lý dân cư

Node.js 22+ · Express 5 · TypeScript · MongoDB (Mongoose) · Zod · JWT

## Chạy

```bash
cd backend
# cấu hình nằm ở .env thư mục gốc (cp ../.env.example ../.env nếu chưa có)
npm install
npm run seed:users            # tạo 3 tài khoản mẫu, in mật khẩu ra màn hình
npm run seed:reference        # 8 khoản quỹ + số khẩn cấp
npm run dev                   # http://localhost:4000/api
```

MongoDB local: xem `database/README.md`.

| Lệnh | |
|---|---|
| `npm run dev` | Chạy có hot-reload (tsx watch) |
| `npm run build` / `npm start` | Biên dịch ra `dist/` và chạy bản build |
| `npm test` | Test với MongoDB in-memory (lần đầu tự tải MongoDB, hơi lâu) |
| `npm run typecheck` | Kiểm tra kiểu |
| `npm run seed:users` | Tạo 3 tài khoản mẫu (trưởng KP, công an KV, cư dân) nếu chưa có |
| `npm run seed:reference` | Tạo 8 khoản quỹ năm nay + số khẩn cấp 113/114/115 nếu chưa có |
| `npm run db:sync-indexes` | Đồng bộ index (dùng khi deploy production) |

## Cấu trúc

```
src/
├── server.ts            Khởi động: kết nối DB → listen → tắt êm
├── app.ts               Tạo Express app (middleware, routes, xử lý lỗi) — test dùng trực tiếp
├── routes.ts            Mount router của các module dưới /api
├── config/              env.ts (kiểm tra biến môi trường bằng zod), database.ts, constants.ts
├── common/              Dùng chung, không chứa nghiệp vụ
│   ├── errors/          AppError + Errors.* (mã lỗi chuẩn)
│   ├── http/            errorHandler, parseInput (zod)
│   ├── middlewares/     authenticate, authorize, rateLimiters
│   ├── security/        băm mật khẩu, sinh / băm token
│   └── logger.ts        pino (tự che token, cookie, mật khẩu)
├── modules/<miền>/      Mỗi nghiệp vụ một thư mục
│   ├── *.routes.ts      Khai báo endpoint + middleware
│   ├── *.controller.ts  Chỉ xử lý HTTP: đọc request, gọi service, trả response
│   ├── *.service.ts     Logic nghiệp vụ, không biết gì về Express
│   ├── *.model.ts       Mongoose schema + index
│   └── *.schemas.ts     Zod schema cho dữ liệu đầu vào
└── types/               Mở rộng kiểu Express (req.auth)
scripts/                 seed, sync index
tests/                   vitest + supertest + mongodb-memory-server
```

**Quy tắc phụ thuộc:** `routes → controller → service → model`. Service không import Express;
controller không truy vấn DB trực tiếp. `common/` không import từ `modules/` (trừ middleware xác thực).

## Định dạng API

- Thành công: trả thẳng JSON dữ liệu (không bọc).
- Lỗi: `{ "error": { "code": "INVALID_CREDENTIALS", "message": "…", "details": … } }`
  — `code` ổn định để frontend xử lý, `message` tiếng Việt để hiển thị.

| HTTP | code | Khi nào |
|---|---|---|
| 400 | `VALIDATION_ERROR` / `BAD_REQUEST` | Dữ liệu sai; `details` = `[{ field, message }]` |
| 401 | `UNAUTHORIZED` / `INVALID_CREDENTIALS` | Chưa đăng nhập, token hết hạn / bị thu hồi, sai tài khoản |
| 403 | `FORBIDDEN` / `ACCOUNT_DISABLED` | Sai vai trò, tài khoản bị khoá hẳn |
| 423 | `ACCOUNT_LOCKED` | Khoá tạm do sai mật khẩu nhiều lần (`details.lockedUntil`) |
| 429 | `TOO_MANY_REQUESTS` | Vượt giới hạn đăng nhập theo IP |

## API nghiệp vụ

Dữ liệu trả về khớp kiểu ở `frontend/src/features/*/types.ts`.
Danh sách nhận `?search=&filter=&page=&pageSize=` (tìm không dấu) và trả `{ items, total, page, pageSize }`.
Quyền: **Đăng nhập** = mọi vai trò; **Cán bộ** = trưởng KP + công an KV (`requireStaff`); **Trưởng KP** = chỉ trưởng khu phố (`requireLeader`); **Cư dân** = `requireResident`.
Thông tin cá nhân được mã hoá trong DB và giải mã khi trả ra API — xem database/README.md.
Tên / SĐT người gửi luôn lấy từ tài khoản, không nhận từ body.

| Phần | Endpoint | Quyền | Ghi chú |
|---|---|---|---|
| Tổng quan | `GET /api/dashboard/officer` | Trưởng KP | Hộ thấp / cao tầng, nhóm đối tượng, tuổi – giới tính, địa bàn, phản ánh & SOS cần xử lý |
| | `GET /api/dashboard/police` | Cán bộ | Công an KV: SOS, phản ánh chưa xong (giao công an + khẩn trước), tạm trú / tạm vắng theo địa bàn |
| | `GET /api/dashboard/resident` | Cư dân | Hộ của mình, phản ánh đã gửi, quỹ chưa đóng, bài chưa đọc, khảo sát chờ trả lời, thông báo đến hộ |
| | `GET /api/notifications` | Đăng nhập | Thông báo gửi đến hộ của cư dân (qua liên kết nhân khẩu) |
| **1. Lõi** | `GET /api/areas` | Cán bộ | Khu vực / toà nhà |
| | `GET /api/households`, `/:id` | Cán bộ | `filter`: `thap_tang` / `cao_tang`; `/:id` kèm danh sách nhân khẩu |
| | `GET /api/residents`, `/:id` | Cán bộ | Nhân khẩu (nhúng trong hộ); `filter`: tình trạng cư trú; `category`: nhóm đối tượng; kèm lịch sử cư trú |
| | `GET /api/changes` | Cán bộ | `filter`: loại biến động |
| **3. An ninh & khẩn cấp** | `GET /api/reports` | Đăng nhập | Cư dân chỉ thấy của mình; `filter`: trạng thái; `kind`: `phan_anh` / `sos` |
| | `POST /api/reports` | Đăng nhập | Gửi phản ánh; mã `PA-<năm>-<số>`, loại suy ra từ chi tiết, ghi lịch sử |
| | `GET /api/sos`, `POST` | Đăng nhập | SOS (cùng collection); SĐT, hộ, địa chỉ, toạ độ tự lấy từ tài khoản / hộ |
| | `PATCH /api/reports/:id`, `/api/sos/:id` | Cán bộ | Trạng thái, giao xử lý (Trưởng KP / CSKV), ghi chú — mỗi thao tác thêm một dòng lịch sử |
| **4. Thông báo & tuyên truyền** | `GET /api/posts` | Đăng nhập | Cư dân chỉ thấy bài dành cho mình (đối tượng nhận); kèm `isRead` |
| | `POST /api/posts` | Trưởng KP | Thông báo nhanh / tuyên truyền / sự kiện, đính kèm, đối tượng nhận |
| | `POST /api/posts/:id/read` | Đăng nhập | Đánh dấu đã đọc |
| | `GET /api/directory`, `POST` | Đăng nhập / Trưởng KP | Sổ tay phường |
| **5. Thu quỹ** | `GET /api/funds` | Đăng nhập | Quỹ đang mở + số hộ đã đóng, tổng tiền |
| | `GET /api/funds/:id/households` | Trưởng KP | `filter`: `da_dong` / `chua_dong`; kèm số tiền phải đóng |
| | `POST /api/funds/:id/payments` | Trưởng KP | Đánh dấu đã đóng → lưu khoản đóng → gửi thông báo đến hộ |
| | `POST /api/funds/:id/reminders` | Trưởng KP | Nhắc mọi hộ chưa đóng |
| **6. Cộng đồng** | `GET /api/surveys`, `POST` | Đăng nhập / Trưởng KP | Theo phạm vi (toàn khu phố / khu vực); kèm `hasResponded` |
| | `POST /api/surveys/:id/responses` | Đăng nhập | Mỗi tài khoản một lần; kết quả cộng dồn atomic |
| | `GET /api/activities`, `POST` | Đăng nhập / Trưởng KP | Lịch sinh hoạt |
| | `GET /api/cultural-families`, `PUT` | Đăng nhập / Trưởng KP | Danh hiệu văn hoá (nhúng trong hộ); tự tính số năm liên tiếp |
| **An sinh** | `GET /api/welfare-households`, `PUT` | Trưởng KP | Hộ có `householdType` ≠ thường; PUT đặt loại hộ + toạ độ |

Mỗi module trong `src/modules/<tên>/` gồm: `*.model.ts` (schema + index), `*.constants.ts` (giá trị enum),
`*.schemas.ts` (zod cho query / body), `*.service.ts` (nghiệp vụ), `*.controller.ts` (HTTP), `*.routes.ts`.
Model mới phải thêm vào `src/models.ts` (dùng cho đồng bộ index).

Dữ liệu nền: `npm run seed:reference` tạo 8 khoản quỹ năm nay và số khẩn cấp 113 / 114 / 115.

## Xác thực

Ba vai trò dùng chung một luồng đăng nhập:

| Vai trò | Được làm |
|---|---|
| `truong_kp` — trưởng khu phố | Xem và quản lý tất cả |
| `cong_an_kv` — công an khu vực | Xem dân cư (khu vực, hộ, nhân khẩu, biến động), xử lý phản ánh / SOS |
| `cu_dan` — cư dân | Xem thông tin (thông báo, sổ tay, quỹ, sinh hoạt), gửi phản ánh / SOS, trả lời khảo sát |

 Đăng nhập bằng SĐT hoặc email
(tra qua blind index vì giá trị gốc đã mã hoá). Tài khoản cư dân liên kết tới một nhân khẩu (`residentRef`).

| Endpoint | Cần token | |
|---|---|---|
| `POST /api/auth/login` | | `{ identifier, password }` (identifier = SĐT hoặc email) → `{ accessToken, tokenType, expiresIn, user }` + cookie refresh |
| `POST /api/auth/refresh` | | Dùng cookie → access token mới, refresh token được xoay vòng |
| `POST /api/auth/logout` | | Thu hồi phiên hiện tại, xoá cookie (vẫn chạy khi access token đã hết hạn) |
| `POST /api/auth/logout-all` | ✓ | Thu hồi mọi phiên của tài khoản |
| `GET /api/auth/me` | ✓ | `{ user }` |
| `GET /api/health` | | Trạng thái API + DB |

- **Access token:** JWT HS256, mặc định 15 phút, gửi qua `Authorization: Bearer …`. Frontend giữ trong bộ nhớ (không lưu localStorage).
- **Refresh token:** chuỗi ngẫu nhiên trong cookie `wkp_rt` (httpOnly, SameSite=Strict, chỉ gửi tới `/api/auth`). DB chỉ lưu SHA-256.
- **Mỗi request đều kiểm tra phiên trong DB** → đăng xuất, khoá tài khoản, đổi vai trò có hiệu lực ngay.
- **Xoay vòng refresh token:** dùng lại token cũ bị coi là bị đánh cắp → thu hồi cả phiên.
  Frontend cần đảm bảo chỉ có **một** request refresh tại một thời điểm.
- **Chống dò mật khẩu:** sai `LOGIN_MAX_FAILED_ATTEMPTS` lần → khoá `LOGIN_LOCK_MINUTES` phút; thêm giới hạn 20 lần / 15 phút / IP.

### Phân quyền cho route mới

```ts
router.get('/users', ...requireLeader, controller.list);          // chỉ trưởng khu phố
router.get('/residents', ...requireStaff, controller.list);       // trưởng KP + công an KV
router.post('/reports', ...requireLogin, controller.create);     // mọi tài khoản
```

Trong controller lấy người gọi bằng `requireAuth(req)` → `{ userId, role, sessionId }`.
