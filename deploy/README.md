# Deploy — backend trên VPS (Docker + Cloudflare Tunnel), frontend trên Vercel

```
Trình duyệt ──▶ https://khupho.vercel.app            (Vercel: frontend)
                  └─ /api/* ── rewrite ──▶ https://api.<tên-miền>   (Cloudflare)
                                              └─ Tunnel ──▶ VPS: cloudflared ──▶ backend:4000 ──▶ MongoDB Atlas
SePay ── webhook ──▶ https://api.<tên-miền>/api/payments/sepay-webhook
```

- **VPS không cần mở cổng nào** (hợp với VPS "Shared IP"): `cloudflared` tự kết nối ra Cloudflare. HTTPS do Cloudflare lo.
- **Frontend gọi `/api` trên chính tên miền Vercel** nên refresh cookie (`SameSite=Strict`) chạy bình thường.
- **Hai kiểu tunnel** (chọn bằng `--profile` của docker compose):

  | | `quick`: tạm thời | `named`: chính thức |
  |---|---|---|
  | Cần tên miền / tài khoản Cloudflare | Không | Có |
  | Địa chỉ backend | `https://<ngẫu-nhiên>.trycloudflare.com` | `https://api.<tên-miền>` |
  | Ổn định | **Đổi địa chỉ mỗi lần tunnel khởi động lại** (VPS reboot, chạy lại compose), phải sửa lại `vercel.json` | Cố định |
  | Dùng cho | Thử nghiệm khi chưa có tên miền | Chạy thật |

## 1. Chuẩn bị VPS (Ubuntu)

```bash
ssh -p <cổng-SSH> <user>@<IP-VPS>
passwd                                   # đổi mật khẩu ngay nếu mật khẩu từng bị chia sẻ
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && exit    # đăng nhập lại để có quyền docker
```

Nên làm thêm: đăng nhập bằng SSH key và tắt đăng nhập bằng mật khẩu (`PasswordAuthentication no`), bật cập nhật bảo mật tự động
(`sudo apt install unattended-upgrades`).

## 2A. Tunnel tạm (chưa có tên miền) — bỏ qua 2B

Không cần làm gì trên Cloudflare. Ở bước 3 dùng `--profile quick`, sau đó lấy địa chỉ:
```bash
docker compose logs cloudflared-quick | grep -o 'https://[a-z0-9-]*.trycloudflare.com' | tail -1
```
Dùng địa chỉ này thay cho `https://api.<tên-miền>` ở bước 4 (Vercel) và bước 5 (SePay).
Địa chỉ đổi thì cập nhật `vercel.json`, push, và sửa lại URL webhook trên SePay.

## 2B. Tunnel chính thức (có tên miền)

1. Thêm tên miền vào Cloudflare (Add a site) và đổi nameserver ở nơi mua tên miền.
2. **Zero Trust → Networks → Tunnels → Create a tunnel** (loại *Cloudflared*), đặt tên `khupho`.
3. Bỏ qua bước cài đặt; **copy token** (chuỗi dài sau `--token`) để dán vào `CLOUDFLARE_TUNNEL_TOKEN` ở bước 3.
4. Tab **Public Hostname → Add**: Subdomain `api`, Domain `<tên-miền>`, Service `HTTP` → `backend:4000`.

## 3. Chạy backend

```bash
git clone https://github.com/KhangTranManh/KHUPHO.git && cd KHUPHO/deploy
cp .env.example .env && chmod 600 .env && nano .env   # điền đủ; khoá phải GIỐNG khoá đã tạo dữ liệu
docker compose --profile quick up -d --build          # chưa có tên miền (2A)
# hoặc: docker compose --profile named up -d --build  # có tên miền (2B)
docker compose ps                                      # backend: healthy, cloudflared(-quick): running
curl http://127.0.0.1:4000/api/health                  # {"status":"ok","database":"up",...}
docker compose logs -f backend                         # xem log
```

Nếu `database: down`: vào **MongoDB Atlas → Network Access**, thêm IP ra Internet của VPS (`curl -s ifconfig.me` trên VPS),
rồi xoá dòng `0.0.0.0/0`.

Khởi tạo / kiểm tra database: chạy **từ máy bạn** (cùng `MONGODB_URI` và khoá với VPS), vì image production không chứa công cụ database:
`cd database && npm run setup && npm run check`.

## 4. Vercel (frontend)

1. Thêm rewrite `/api` vào [frontend/vercel.json](../frontend/vercel.json), **đặt trước** rewrite SPA:
   ```json
   "rewrites": [
     { "source": "/api/:path*", "destination": "https://api.<tên-miền>/api/:path*" },
     { "source": "/((?!api/).*)", "destination": "/index.html" }
   ]
   ```
2. **Settings → Environment Variables** (Production):
   `VITE_AUTH_MODE=api`, `VITE_USE_MOCK=false`, `VITE_PHONE_AUTH=firebase`,
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.
3. Push code hoặc bấm **Redeploy**, vì biến `VITE_*` chỉ có hiệu lực sau khi build lại.
4. Mở `https://khupho.vercel.app/api/health`: `clientIp` phải là IP thật của bạn. Nếu ra IP lạ, tăng `TRUST_PROXY` trong `deploy/.env`
   rồi chạy `docker compose up -d`.

## 5. Dịch vụ ngoài

- **Firebase → Authentication → Settings → Authorized domains:** thêm `khupho.vercel.app`.
- **SePay → Webhooks:** URL `https://api.<tên-miền>/api/payments/sepay-webhook`, xác thực *API Key* = `BANK_WEBHOOK_API_KEY`.

## Cập nhật phiên bản mới

Push code lên GitHub, rồi trên VPS:
```bash
bash /srv/webkhupho/deploy/update.sh          # git pull → build lại backend → chờ /api/health
bash /srv/webkhupho/deploy/tunnel-url.sh      # in địa chỉ trycloudflare hiện tại
```
- `update.sh` chỉ tạo lại container backend, nên **tunnel giữ nguyên địa chỉ**. Đang dùng tunnel có tên miền thì chạy `PROFILE=named bash …/update.sh`.
- `deploy/.env` không nằm trong git nên `git pull` không ghi đè. Muốn đổi cấu hình thì sửa `deploy/.env` rồi chạy lại `update.sh`.
- User chưa thuộc nhóm `docker` thì script tự dùng `sudo` (sẽ hỏi mật khẩu).

Sao lưu định kỳ, chạy từ máy bạn: `cd database && npm run backup`. Bản sao lưu nằm ở `database/backups/`, đã mã hoá, không commit.
