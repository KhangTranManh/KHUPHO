# WEBKHUPHO — Quản lý dân cư khu phố

Hệ thống quản lý dân cư cấp khu phố: nhân khẩu – hộ khẩu, cư trú, an ninh trật tự & SOS, thông báo, thu quỹ dân sinh,
sinh hoạt cộng đồng, an sinh xã hội. Giao diện dashboard "soft UI" trên bảng màu Cổng Dịch vụ công Bộ Công an
(xanh #0782e0, navy #1a2b46, đỏ #c4060f, vàng #f4b10f). Code giao diện tự viết, không dùng thư viện UI.

| Phần | Công nghệ | Tài liệu |
|---|---|---|
| `frontend/` | React 19 + Vite + TypeScript | README này (mục Frontend) |
| `backend/` | Express 5 + Mongoose 9 + Zod 4 | [backend/README.md](backend/README.md): API, xác thực, phân quyền |
| `database/` | MongoDB (Atlas hoặc Docker) + công cụ quản trị | [database/README.md](database/README.md): collection, lệnh setup / kiểm tra / sao lưu / xoá |

## Vai trò

Mỗi vai trò có dashboard riêng ở trang chủ. Quyền được kiểm tra ở cả backend lẫn menu và route của frontend.

| Vai trò | Xem / làm được |
|---|---|
| `truong_kp` — Trưởng khu phố | Tất cả: dân cư, phản ánh, thông báo, sổ tay, quỹ (danh sách thu, đối soát), cộng đồng, hộ chính sách |
| `cong_an_kv` — Công an khu vực | Nhân khẩu, hộ, biến động, tạm trú / tạm vắng; xử lý phản ánh & SOS |
| `cu_dan` — Cư dân | Thông tin hộ mình, thông báo, sổ tay, quỹ (QR riêng của hộ), khảo sát; gửi phản ánh & SOS |

## Chức năng chính

- **Đăng nhập bằng SĐT hoặc email**, phiên JWT 15 phút + refresh token xoay vòng trong cookie httpOnly, khoá tạm khi sai nhiều lần.
- **Đăng nhập lần đầu / quên mật khẩu:** tài khoản được tạo sẵn chỉ với SĐT, chưa có mật khẩu.
  Người dùng xác minh SĐT, rồi **bắt buộc đặt mật khẩu mới** trước khi dùng các chức năng khác. Có hai cách xác minh (`VITE_PHONE_AUTH`):
  - `firebase`: mã OTP SMS qua Firebase Authentication; backend chỉ kiểm tra ID token, dữ liệu vẫn ở MongoDB.
  - `temp_password`: backend gửi mật khẩu tạm qua SMS (hiện là bản mock; có chỗ sẵn để thêm nhà cung cấp SMS thật).
- **Thu quỹ tự xác nhận:** mỗi hộ có mã VietQR riêng (nội dung `QKP <MÃ QUỸ> <SỐ HỘ>`). Khi tiền về, webhook SePay
  ghi "đã đóng" và gửi thông báo đến hộ; màn hình QR của cư dân và danh sách thu của trưởng KP tự cập nhật.
  Giao dịch sai nội dung, chuyển thiếu hoặc chuyển trùng được giữ lại để trưởng KP đối soát.
- **Phản ánh gộp SOS:** có lịch sử xử lý và giao việc cho trưởng KP hoặc công an KV.

## Bảo mật & dữ liệu cá nhân

- **Mã hoá tại tầng ứng dụng (AES-256-GCM):** họ tên, CCCD, SĐT, email, liên hệ khác của nhân khẩu và tài khoản;
  tên / SĐT người gửi phản ánh; tên trong nhật ký biến động; nội dung chuyển khoản. Trong DB chỉ thấy `v1.<iv>.<tag>.<bản mã>`.
- **Tra cứu không cần giải mã:** blind index HMAC (`*Hash`) cho CCCD / SĐT / email và `searchTokens` cho tên.
- **Không lưu bản rõ mật khẩu:** mật khẩu và mật khẩu tạm lưu bằng bcrypt; refresh token lưu dạng SHA-256.
  Webhook xác thực bằng API key, so sánh trong thời gian không đổi.
- **Mọi cấu hình bảo mật nằm trong `.env`, không ghi trong code:** khoá JWT, khoá mã hoá, Firebase, tài khoản nhận tiền,
  khoá webhook, rate limit, bcrypt cost… `.env` và `database/backups/` đã nằm trong `.gitignore`.
- **Giữ an toàn `DATA_ENCRYPTION_KEY` và `DATA_INDEX_KEY`.** Mất hai khoá này là mất toàn bộ dữ liệu đã mã hoá,
  và khôi phục bản sao lưu cũng cần đúng hai khoá đó.

## Chạy nhanh

```bash
cp .env.example .env               # rồi điền MONGODB_URI, các khoá (hướng dẫn trong file)

cd backend && npm install
npm run db:setup -- --demo          # tạo database "khupho": collection, index, quỹ, tài khoản, dữ liệu mẫu
npm run dev                         # API: http://localhost:4000/api

cd ../frontend && npm install
npm run dev                         # http://localhost:5173 (proxy /api → backend)
```

Tài khoản mẫu: Trưởng KP `0900000002`, Công an KV `0900000003`, Cư dân `0900000004`.
Mật khẩu lấy từ `SEED_*_PASSWORD` trong `.env`, để trống thì được tự sinh và in ra lúc `db:setup`.
Tài khoản đăng nhập lần đầu (chưa có mật khẩu): khai báo `SEED_FIRST_LOGIN` hoặc chạy `cd database && npm run add-user -- <SĐT> <vai trò> "<Họ tên>"`.

Quản trị database (chạy trong `database/`): `npm run stats` (đếm người), `check` (kiểm tra dữ liệu),
`find -- <SĐT|CCCD|mã hộ|tên>`, `backup`, `restore`, `wipe -- --yes` (sao lưu rồi xoá sạch). Xem [database/README.md](database/README.md).

## Cấu hình `.env` (tóm tắt — chi tiết trong `.env.example`)

| Nhóm | Biến |
|---|---|
| Database | `MONGODB_URI`, `MONGODB_DB_NAME` (mặc định `khupho`), `MONGODB_TIMEOUT_MS` |
| Khoá bí mật | `JWT_ACCESS_SECRET`, `DATA_ENCRYPTION_KEY`, `DATA_INDEX_KEY` |
| Đăng nhập | `LOGIN_MAX_FAILED_ATTEMPTS`, `LOGIN_LOCK_MINUTES`, `LOGIN_RATE_LIMIT`, `BCRYPT_COST`, `REFRESH_TOKEN_TTL_DAYS`, `MAX_SESSIONS_PER_USER` |
| Chống spam | `API_RATE_LIMIT`, `WRITE_RATE_LIMIT`, `TRUST_PROXY` (sau Cloudflare / Vercel) |
| Mật khẩu tạm / SMS | `SMS_PROVIDER`, `TEMP_PASSWORD_TTL_MINUTES`, `TEMP_PASSWORD_RESEND_SECONDS`, `TEMP_PASSWORD_RATE_LIMIT` |
| Firebase (OTP) | backend `FIREBASE_PROJECT_ID`; frontend `VITE_PHONE_AUTH`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` |
| Thu quỹ | `PAYMENT_BANK_BIN`, `PAYMENT_BANK_ACCOUNT_NO`, `PAYMENT_BANK_ACCOUNT_NAME`, `BANK_WEBHOOK_PROVIDER`, `BANK_WEBHOOK_API_KEY` |
| Frontend | `VITE_AUTH_MODE` (`api` / `demo`), `VITE_USE_MOCK`, `VITE_API_BASE_URL` |
| Dữ liệu mẫu | `SEED_*_PASSWORD`, `SEED_FIRST_LOGIN` |

Biến `VITE_*` chỉ có hiệu lực sau khi **chạy lại** `npm run dev` của frontend. Biến của backend cũng vậy: `npm run dev` không tự đọc lại `.env`.

## Deploy

- **Frontend (Vercel):** Root Directory `frontend`, cấu hình trong `frontend/vercel.json`.
  Chưa có backend online thì đặt trên Vercel `VITE_AUTH_MODE=demo` + `VITE_USE_MOCK=true`: bản xem thử chạy
  bằng tài khoản và dữ liệu mẫu ngay trên trình duyệt. **Không dùng chế độ demo với dữ liệu thật**, vì mật khẩu demo nằm trong JS.
- **Backend:** chạy bằng Docker trên VPS, ra Internet qua Cloudflare Tunnel (không cần mở cổng).
  Frontend gọi `/api` thông qua rewrite của Vercel. Hướng dẫn từng bước: [deploy/README.md](deploy/README.md).

## Frontend

```
frontend/src/
├─ app/                router (trang ngoài tổng quan được lazy-load)
├─ config/             app.ts (đọc VITE_*), navigation.ts (ROUTES + menu theo vai trò)
├─ styles/             tokens.css (màu, spacing, bóng), global.css
├─ components/layout/  DashboardLayout, Sidebar, Navbar, Footer
├─ components/ui/      UI kit không nghiệp vụ: Card, StatCard, Button, TextField, Modal, DataTable, ListView, Tabs…
├─ features/<miền>/    auth, residents, households, changes, reports, posts, directory, notifications,
│                      funds, community, welfare, dashboard — mỗi miền: types, constants, *Service
├─ hooks/              useAsync, useListQuery (tìm kiếm + lọc + phân trang), useDebouncedValue
├─ mocks/              dữ liệu mẫu + mockApi (VITE_USE_MOCK=true) + demoAuth (VITE_AUTH_MODE=demo)
├─ pages/<tên>/        một trang = một thư mục; component riêng của trang nằm trong components/
├─ services/api.ts     HTTP client: access token trong bộ nhớ, tự refresh khi hết hạn
└─ utils/              format số / ngày, tính tuổi, che CCCD
```

**Quy ước**
- **Màu:** chỉ dùng biến trong `styles/tokens.css`. Component nhận prop `tone`, không nhận mã màu.
- **CSS:** CSS Modules (`X.module.css` đặt cạnh `X.tsx`).
- **Import:** dùng alias `@/`.
- **Gọi API:** trang không gọi `fetch` trực tiếp mà luôn đi qua `features/*/…Service.ts`. Service tự chọn mock hay API thật theo `VITE_USE_MOCK`.
- **Thêm trang:** thêm vào `ROUTES` → khai báo route trong `app/router.tsx` (đặt dưới `RequireRole` phù hợp) → thêm mục `sidebarNav` kèm `roles`.

```bash
cd frontend
npm run dev      # http://localhost:5173
npm run build    # typecheck + build ra dist/
```
