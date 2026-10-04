# WEBKHUPHO — Quản lý dân cư khu phố

Hệ thống quản lý nhân khẩu, hộ khẩu, tạm trú / tạm vắng cấp khu phố.
Giao diện theo bố cục dashboard "soft UI" (sidebar trái, card bo góc lớn, bóng mềm, ô icon gradient)
trên bảng màu Cổng Dịch vụ công Bộ Công an (xanh #0782e0, navy #1a2b46, đỏ #c4060f, vàng #f4b10f).
Code giao diện tự viết, không dùng thư viện UI.

## Cấu trúc

```
WEBKHUPHO/
├── frontend/          React 19 + Vite + TypeScript
├── backend/           Express 5 + TypeScript + Mongoose (xem backend/README.md)
├── database/          MongoDB: docker-compose + tài liệu collection
├── .env.example       chỉ dẫn: mỗi phần có .env riêng
├── .editorconfig
└── .gitignore
```

### frontend/src

| Thư mục | Vai trò |
|---|---|
| `app/` | Router (trang ngoài tổng quan được lazy-load) |
| `config/` | `app.ts` (tên app, API, bật/tắt mock), `navigation.ts` (`ROUTES` + menu sidebar) |
| `styles/` | `tokens.css` (màu, gradient, font, spacing, bóng) và `global.css` (class `tone-*`) |
| `components/layout/` | Khung trang: `DashboardLayout`, `Sidebar`, `Navbar`, `Footer` |
| `components/ui/` | UI kit không chứa nghiệp vụ: `Card`, `StatCard`, `IconBox`, `Badge`, `Avatar`, `Button`, `TextField`, `Switch`, `Tabs`, `DataTable`, `Pagination`, `ListView`, `ListToolbar`… |
| `components/charts/` | `BarChart`, `LineChart` (HTML/SVG thuần, không thư viện) |
| `features/<miền>/` | `residents`, `households`, `temporary`, `changes`, `dashboard`, `account` — mỗi miền có `types`, `constants` (nhãn, màu), `*Service` |
| `hooks/` | `useAsync`, `useListQuery` (tìm kiếm + lọc + phân trang), `useDebouncedValue` |
| `mocks/` | Dữ liệu mẫu sinh có seed + `mockApi` giả lập endpoint. Xoá khi có backend |
| `pages/<tên>/` | Một trang = một thư mục; component chỉ dùng riêng cho trang đặt trong `components/` của nó |
| `services/` | HTTP client chung (`api.ts`) |
| `types/` | Kiểu dùng chung: `Tone`, `ListQuery`, `Paged` |
| `utils/` | Hàm thuần: format số / ngày, tính tuổi, che CCCD |

## Quy ước

- **Màu / spacing:** chỉ dùng biến trong `styles/tokens.css`, không hard-code mã màu trong component.
- **CSS:** CSS Modules (`X.module.css` cạnh `X.tsx`).
- **Import:** dùng alias `@/` thay cho `../../`.
- **Màu theo ngữ nghĩa:** component nhận prop `tone` (`primary | dark | info | success | warning | danger | secondary | flag`),
  không nhận mã màu. Nhãn + tone của từng trạng thái nghiệp vụ khai báo trong `features/*/constants.ts`.
- **Dữ liệu:** trang không gọi `fetch` trực tiếp, luôn qua `features/*/…Service.ts`.
  Mặc định dùng dữ liệu mẫu; đặt `VITE_USE_MOCK=false` để gọi API thật (`/api/residents`, `/api/households`,
  `/api/temporary-records`, `/api/changes`, `/api/dashboard/summary`, `/api/groups`, `/api/me`).
  Danh sách nhận query `?search=&filter=&page=&pageSize=` và trả `{ items, total, page, pageSize }`.
- **Đăng nhập:** `features/auth/` (AuthProvider, RequireAuth / RequireRole) luôn gọi backend thật, kể cả khi bật mock.
  Access token chỉ giữ trong bộ nhớ; tải lại trang thì khôi phục bằng refresh cookie.
  Menu và route lọc theo vai trò: `admin`, `can_bo` vào trang quản lý; `nguoi_dan` hiện chỉ có `/ho-so`.
- **Thêm trang mới:** thêm đường dẫn vào `ROUTES` → route trong `app/router.tsx` → mục trong `sidebarNav`.
  Trang danh sách: dùng `useListQuery` + `ListToolbar` + `ListView`, chỉ cần khai báo cột.

## Chạy frontend

```bash
cd frontend
cp .env.example .env    # tuỳ chọn
npm install
npm run dev             # http://localhost:5173
npm run build           # typecheck + build ra dist/
```

Đăng nhập cần backend đang chạy (`cd backend && npm run dev`). Dev server proxy `/api` → `http://localhost:4000` (xem `vite.config.ts`).
