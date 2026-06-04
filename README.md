# AHSO.vn

AHSO.vn là website giới thiệu năng lực, phần mềm, giải pháp và kênh tiếp nhận yêu cầu tư vấn/báo giá của AHSO. Dự án hiện tập trung vào nội dung showcase và vận hành admin nội bộ; luồng mua sắm sản phẩm đã được tách sang `https://shop.ahso.vn`.

## Phạm Vi Hiện Tại

- Trang public giới thiệu AHSO, phần mềm, giải pháp, chính sách và form liên hệ.
- Admin quản lý banner chính, banner quảng cáo, chính sách, bài viết phần mềm/giải pháp, danh mục, yêu cầu liên hệ, yêu cầu báo giá và người dùng.
- Staff xử lý yêu cầu liên hệ và yêu cầu báo giá được phân công.
- Bài viết phần mềm/giải pháp có trạng thái nháp, đã xuất bản, lưu trữ và đánh dấu nổi bật trực tiếp trong danh sách quản trị.
- Email dùng để gửi thông báo liên hệ, báo giá và luồng xác thực/reset mật khẩu.
- Media sử dụng Cloudinary cho ảnh banner, ảnh bìa, avatar và ảnh chèn trong editor HTML.

## Công Nghệ

- Next.js 16 App Router, React 19, TypeScript.
- Prisma 6 và PostgreSQL.
- Tailwind CSS 4, shadcn/ui conventions, lucide-react.
- Sonner cho notification và modal xác nhận tùy biến.
- JWT/RBAC cho phân quyền `USER`, `STAFF`, `ADMIN`.
- Nodemailer/SMTP, Google OAuth, Cloudinary.

## Cấu Trúc Chính

- `app/`: route public, admin, staff và API routes.
- `components/`: component dùng lại cho public UI, admin UI và editor HTML.
- `lib/`: auth, prisma, email, cloudinary, utility helpers.
- `dto/`: DTO cho search/SEO và các contract dữ liệu.
- `prisma/`: schema, migrations, seed.
- `public/`: tài nguyên tĩnh.
- `scripts/`: script vận hành, ví dụ tạo tài khoản admin.

## Route Public

- `/`: Trang chủ showcase.
- `/about`: Giới thiệu AHSO.
- `/contact`: Form liên hệ.
- `/policy`: Trang chính sách.
- `/software`: Danh sách phần mềm.
- `/software/[slug]`: Chi tiết phần mềm.
- `/solutions`: Danh sách giải pháp.
- `/solutions/[slug]`: Chi tiết giải pháp.
- `/login`, `/register`, `/forgot-password`, `/reset-password`: Xác thực tài khoản.
- `/profile`, `/profile/edit`: Hồ sơ người dùng.
- Navbar có liên kết `Shop AHSO` trỏ đến `https://shop.ahso.vn`.

## Route Admin

- `/admin`: Dashboard tổng quan và cấu hình email nhận thông báo.
- `/admin/software`: Quản lý bài viết phần mềm.
- `/admin/software/new`: Tạo bài viết phần mềm.
- `/admin/software/[id]`: Chỉnh sửa bài viết phần mềm.
- `/admin/software-categories`: Quản lý danh mục phần mềm.
- `/admin/solutions`: Quản lý bài viết giải pháp.
- `/admin/solutions/new`: Tạo bài viết giải pháp.
- `/admin/solutions/[id]`: Chỉnh sửa bài viết giải pháp.
- `/admin/solution-categories`: Quản lý danh mục giải pháp.
- `/admin/policies`: Quản lý chính sách.
- `/admin/system/hero-banners`: Quản lý banner chính.
- `/admin/system/hero-banners/new`: Tạo banner chính.
- `/admin/system/hero-banners/[id]`: Chỉnh sửa banner chính.
- `/admin/system/announcements`: Quản lý banner quảng cáo.
- `/admin/contact-requests`: Quản lý yêu cầu liên hệ.
- `/admin/quote-requests`: Quản lý yêu cầu báo giá.
- `/admin/users`: Quản lý khách hàng.
- `/admin/staff`: Quản lý nhân viên.

## Route Staff

- `/staff`: Dashboard nhân sự.
- `/staff/contacts`: Danh sách yêu cầu liên hệ.
- `/staff/contacts/[id]`: Chi tiết yêu cầu liên hệ.
- `/staff/quote-requests`: Danh sách yêu cầu báo giá.
- `/staff/quote-requests/[id]`: Chi tiết yêu cầu báo giá.

## Yêu Cầu Môi Trường

- Node.js 20 trở lên.
- PostgreSQL 14 trở lên.
- npm.
- Tài khoản Cloudinary nếu cần upload ảnh.
- SMTP account nếu cần gửi email.
- Google OAuth client nếu bật đăng nhập Google.

## Cài Đặt Local

```bash
npm install
```

Tạo file `.env` từ cấu hình nội bộ hoặc từ `.env.ahsovn.example`, sau đó cập nhật các giá trị thật cho môi trường local.

```bash
npx prisma migrate dev
npm run db:seed
npm run dev
```

Lưu ý khi test local: ưu tiên chạy dev server bằng port khác `3000` nếu port đó đang được dùng bởi workspace khác.

## Script Thường Dùng

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run db:seed
npm run createadmin -- <username> <password>
```

## Biến Môi Trường

Không commit file `.env` hoặc secret thật.

### Core

- `DATABASE_URL`: chuỗi kết nối PostgreSQL.
- `NEXT_PUBLIC_SITE_URL`: URL public của website.
- `NEXT_PUBLIC_APP_URL`: URL app dùng phía client.
- `APP_URL`: URL app dùng phía server.
- `NEXTAUTH_URL`: URL phục vụ auth callback nếu dùng NextAuth/Google OAuth.

### Auth

- `JWT_SECRET`: khóa ký JWT.
- `AUTH_COOKIE_SECURE`: bật/tắt secure cookie, thường là `true` ở production.

### Email

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_EMAIL`
- `EMAIL_FROM_NAME`
- `ADMIN_EMAIL`

Admin có thể cập nhật email nhận thông báo trong dashboard, nhưng SMTP vẫn cần cấu hình qua biến môi trường.

### Google OAuth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Cloudinary

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_AVATAR_PRESET`
- `CLOUDINARY_HERO_BANNER_PRESET`
- `CLOUDINARY_POPUP_BANNER_PRESET`
- `CLOUDINARY_SOFTWARE_COVER_PRESET`
- `CLOUDINARY_SOLUTION_COVER_PRESET`

Một số biến Cloudinary/Drive liên quan sản phẩm có thể còn trong file example cũ để tránh vỡ môi trường triển khai, nhưng scope hiện tại không còn dùng cụm sản phẩm/đơn hàng trong admin.

### Google Drive Legacy

- `DRIVE_CLIENT_EMAIL`
- `DRIVE_PRIVATE_KEY`
- `DRIVE_ROOT_SOLUTIONS`
- `DRIVE_ROOT_SOFTWARE`
- `DRIVE_ROOT_USERS`

### Seed

- `SEED_ADMIN_USERNAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PHONE`
- `SEED_ADMIN_PASSWORD`

## Database

Prisma schema hiện giữ các cụm chính:

- `software`, `softwarecategory`, `featuredsoftware`
- `solution`, `solutioncategory`, `featuredsolution`
- `policysection`
- `herobanner`, `siteannouncement`
- `contact`, `quoterequest`
- `user`, `address`, `systemsetting`

Chạy migration local:

```bash
npx prisma migrate dev
```

Generate Prisma client:

```bash
npx prisma generate
```

Seed dữ liệu:

```bash
npm run db:seed
```

## Docker

Build image production:

```bash
docker build -t ahso-vn .
```

Chạy bằng compose production:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Xem thêm hướng dẫn triển khai trong [DEPLOY.md](./DEPLOY.md).

## Quy Ước Phát Triển

- Không commit `.env`, secret hoặc credential.
- Không dùng `alert`, `confirm`, `prompt` mặc định của trình duyệt; dùng Sonner/custom modal.
- UI admin ưu tiên rõ ràng, gọn, tiếng Việt có dấu đầy đủ.
- Khi thay đổi UI, giữ đúng design system hiện tại và shadcn/ui conventions.
- Không phát triển trực tiếp trên branch `main` hoặc `master`.
- Chạy tối thiểu `npm run lint` và `npm run build` trước khi bàn giao thay đổi có ảnh hưởng runtime.

## Ghi Chú Scope

- AHSO.vn không còn quản lý sản phẩm, giỏ hàng hoặc đơn hàng nội bộ.
- Luồng sản phẩm/shop được điều hướng sang `https://shop.ahso.vn`.
- Chức năng nổi bật của phần mềm/giải pháp hiện được quản lý trực tiếp trong danh sách bài viết bằng cột ngôi sao, không còn trang admin riêng cho từng loại nổi bật.
