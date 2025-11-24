FROM node:20-alpine

WORKDIR /app

# 1. Cài dependency
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Copy schema Prisma trước
COPY prisma ./prisma

# 3. Copy phần còn lại của project
COPY . .

# 4. Tăng heap cho Node khi build
# (cách 1: ENV chung cho mọi node process)
ENV NODE_OPTIONS=--max-old-space-size=4096

# 5. Generate Prisma client trong container
RUN npx prisma generate

# 6. Build Next.js
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
