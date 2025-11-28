# AI Agent Instructions for shop.ahso.vn

This is a Next.js e-commerce application with strong TypeScript typing, Prisma ORM, and authentication features. Here's what you need to know to work effectively in this codebase:

## Project Architecture

- **Tech Stack**: Next.js 16.0, React 19.2, Prisma ORM, TailwindCSS, TypeScript
- **API Routes**: Located in `app/api/` using Next.js App Router pattern
- **Database**: MySQL with Prisma schema in `prisma/schema.prisma`
- **Authentication**: Custom JWT implementation with bcrypt password hashing
- **Forms**: Uses Zod for validation and react-hook-form for form handling

## Key Patterns

### Database and Models
- All database models are defined in `prisma/schema.prisma`
- Generated Prisma client is output to `generated/` directory
- Always use transactions (`prisma.$transaction`) for multi-table operations
  Example from `app/api/auth/register/route.ts`:
  ```typescript
  const user = await prisma.$transaction(async (tx) => {
    const shippingAddr = await tx.address.create({ /*...*/ });
    const billingAddr = await tx.address.create({ /*...*/ });
    return await tx.user.create({ /*...*/ });
  });
  ```

### API Conventions
1. Route handlers use Zod for validation
2. Response format for errors:
   ```typescript
   { error: "ERROR_CODE", details?: object }
   ```
3. Success responses return typed data matching exported response types
4. Vietnamese phone numbers are normalized to E.164 format

### Authentication Flow
- JWT tokens issued on registration/login
- Environment requires `JWT_SECRET` for token signing
- Token payload includes: `sub` (user ID), `username`, `email`
- Default token expiry: 7 days

## Development Workflow

1. **Setup**:
   ```bash
   npm install
   npx prisma generate
   ```

2. **Running locally**:
   ```bash
   npm run dev
   ```

3. **Database Changes**:
   - Edit `prisma/schema.prisma`
   - Run `npx prisma generate` to update client
   - Use transactions for multi-table operations

## Project Structure
```
app/
  api/         # API routes using Next.js App Router
  layout.tsx   # Root layout with providers
  page.tsx     # Main landing page
generated/     # Prisma-generated types & client
lib/          # Shared utilities and database client
prisma/       # Database schema and migrations
```

## Common Tasks

1. **Adding a New API Endpoint**:
   - Create route in `app/api/`
   - Use Zod for validation
   - Follow error response format
   - Export request/response types

2. **Database Changes**:
   - Update `prisma/schema.prisma`
   - Run `npx prisma generate`
   - Update affected API routes