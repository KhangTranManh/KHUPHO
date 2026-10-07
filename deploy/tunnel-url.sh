#!/usr/bin/env bash
# In địa chỉ hiện tại của tunnel tạm (*.trycloudflare.com) — đổi mỗi khi container tunnel được tạo lại.
cd "$(dirname "$0")" || exit 1
# Dùng docker trực tiếp nếu user có quyền (nhóm docker), nếu không thì qua sudo (sẽ hỏi mật khẩu).
if docker info >/dev/null 2>&1; then DOCKER=(docker); else DOCKER=(sudo docker); fi
"${DOCKER[@]}" compose --profile quick logs cloudflared-quick 2>&1 \
  | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1
