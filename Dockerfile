FROM node:20-alpine

WORKDIR /app

# 1. Copy package để cài dependency
COPY package.json package-lock.json* ./

# 2. Copy Prisma schema + config TRƯỚC khi npm ci
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# 3. Cài dependency (postinstall -> prisma generate OK vì đã có schema)
RUN npm ci

# 4. Copy toàn bộ source
COPY . .

# 5. (Optional) Tăng heap nếu cần khi build
ENV NODE_OPTIONS=--max-old-space-size=4096

# 6. Generate Prisma client (nếu không dùng postinstall)
# Nếu bạn đã có "postinstall": "prisma generate" rồi thì có thể bỏ dòng này
RUN npx prisma generate

# 7. Build Next.js
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
