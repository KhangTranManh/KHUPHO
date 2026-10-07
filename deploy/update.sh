#!/usr/bin/env bash
# Cập nhật backend trên VPS lên code mới nhất của GitHub:
#   bash /srv/webkhupho/deploy/update.sh            (tunnel tạm — mặc định)
#   PROFILE=named bash /srv/webkhupho/deploy/update.sh  (tunnel có tên miền)
# Chỉ build + tạo lại container backend → container tunnel giữ nguyên (địa chỉ trycloudflare không đổi).
# deploy/.env không nằm trong git nên không bị git pull ghi đè.
set -euo pipefail
# Dùng docker trực tiếp nếu user có quyền (nhóm docker), nếu không thì qua sudo (sẽ hỏi mật khẩu).
if docker info >/dev/null 2>&1; then DOCKER=(docker); else DOCKER=(sudo docker); fi
cd "$(dirname "$0")/.."

echo "== git pull"
git pull --ff-only

cd deploy
PROFILE="${PROFILE:-quick}"
echo "== build + khởi động lại backend (profile: $PROFILE)"
"${DOCKER[@]}" compose --profile "$PROFILE" up -d --build backend

echo "== chờ backend sẵn sàng"
PORT="$(grep -E '^BACKEND_HOST_PORT=' .env | cut -d= -f2 || true)"  # không có biến → mặc định 4000
for _ in $(seq 1 30); do
  if curl -fs "http://127.0.0.1:${PORT:-4000}/api/health"; then
    echo
    "${DOCKER[@]}" compose --profile "$PROFILE" ps --format '{{.Name}} | {{.Status}}'
    exit 0
  fi
  sleep 2
done
echo "Backend chưa sẵn sàng sau 60 giây — xem log: ${DOCKER[*]} compose --profile $PROFILE logs --tail 50 backend" >&2
exit 1
