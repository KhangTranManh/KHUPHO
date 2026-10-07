# Backend WEBKHUPHO — image production.
#   docker build -t webkhupho-backend ./backend
# Cấu hình KHÔNG nằm trong image: truyền bằng env_file (deploy/docker-compose.yml → deploy/.env).

# 1. Build: cài đủ dependency (cả dev) để biên dịch TypeScript.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# 2. Chạy: chỉ dependency production + mã đã biên dịch, chạy bằng user thường (không phải root).
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health > /dev/null || exit 1
CMD ["node", "dist/server.js"]
