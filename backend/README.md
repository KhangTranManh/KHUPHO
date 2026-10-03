# Backend — API quản lý dân cư

Node.js 22+ · Express 5 · TypeScript · MongoDB (Mongoose) · Zod · JWT

## Chạy

```bash
cd backend
cp .env.example .env          # điền JWT_ACCESS_SECRET, MONGODB_URI
npm install
npm run seed:users            # tạo 3 tài khoản mẫu, in mật khẩu ra màn hình
npm run dev                   # http://localhost:4000/api
```

MongoDB local: xem `database/README.md`.

| Lệnh | |
|---|---|
| `npm run dev` | Chạy có hot-reload (tsx watch) |
| `npm run build` / `npm start` | Biên dịch ra `dist/` và chạy bản build |
| `npm test` | Test với MongoDB in-memory (lần đầu tự tải MongoDB, hơi lâu) |
| `npm run typecheck` | Kiểm tra kiểu |
| `npm run seed:users` | Tạo tài khoản admin / cán bộ / người dân nếu chưa có |
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

## Xác thực

Ba vai trò dùng chung một luồng: `admin`, `can_bo`, `nguoi_dan` (người dân đăng nhập bằng số CCCD).

| Endpoint | Cần token | |
|---|---|---|
| `POST /api/auth/login` | | `{ username, password }` → `{ accessToken, tokenType, expiresIn, user }` + cookie refresh |
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
router.get('/users', authenticate, authorize('admin'), controller.list);
router.get('/residents', authenticate, authorize('admin', 'can_bo'), controller.list);
```

Trong controller lấy người gọi bằng `requireAuth(req)` → `{ userId, role, sessionId }`.
