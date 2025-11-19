FROM node:20-alpine

WORKDIR /app

# 1. Cài dependency
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Copy schema Prisma trước
COPY prisma ./prisma

# 3. Copy phần còn lại của project
COPY . .

# (tuỳ, nhưng thường cần) set DATABASE_URL cho prisma generate nếu schema yêu cầu
# ENV DATABASE_URL="mysql://user:pass@host:3306/dbname"

# 4. Generate Prisma client trong container
RUN npx prisma generate

# 5. Build Next.js
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
