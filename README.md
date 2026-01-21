# shop.ahso.vn

Hệ thống thương mại điện tử kết hợp trang nội dung giải pháp/phần mềm, có khu vực quản trị và nhân sự vận hành. Dự án xây dựng trên Next.js App Router, Prisma và PostgreSQL, hỗ trợ quản lý sản phẩm, đơn hàng, nội dung, và tích hợp email/lưu trữ ảnh bên ngoài.

## Tính năng chính

- Cửa hàng: danh mục, thương hiệu, loại sản phẩm, tìm kiếm, chi tiết sản phẩm, đánh giá.
- Giỏ hàng và checkout: lưu giỏ, tạo đơn hàng, theo dõi trạng thái.
- Trang nội dung: giải pháp, phần mềm, banner/announcement, chính sách.
- Quản trị & nhân sự: CRUD sản phẩm/nội dung, quản lý đơn, phân công xử lý liên hệ/yêu cầu báo giá.
- Xác thực và phân quyền: JWT + RBAC (USER/STAFF/ADMIN).
- Thông báo email: gửi mail hệ thống (liên hệ, đơn hàng, reset mật khẩu).
- Lưu trữ media: Cloudinary và/hoặc Google Drive (tùy cấu hình).

## Công nghệ chính

- Next.js 16 (App Router), React 19, TypeScript.
- Prisma + PostgreSQL.
- Tailwind CSS v4 + Headless UI.
- Zod, React Hook Form.
- Nodemailer (SMTP), Google OAuth, TinyMCE.
- Cloudinary + Google Drive API cho media.

## Cấu trúc thư mục

- `app/`: routes theo App Router, gồm khu vực public, admin, staff và API routes.
- `components/`: UI components dùng lại.
- `lib/`: helpers (auth/JWT, email, cloudinary, drive, prisma).
- `prisma/`: schema, migrations, seed.
- `public/`: asset tĩnh.
- `scripts/`: tiện ích vận hành (tạo admin, v.v).

## Màn hình & cách sử dụng

Lưu ý: các màn hình yêu cầu đăng nhập/role sẽ tự chặn truy cập nếu không đủ quyền.

### Public (khách vãng lai)

- `/`: Trang chủ, tổng quan sản phẩm/nội dung nổi bật; dùng để điều hướng nhanh vào shop/solutions/software.
- `/about`: Giới thiệu doanh nghiệp; dùng để cung cấp thông tin thương hiệu.
- `/contact`: Form liên hệ; khách để lại thông tin và nội dung yêu cầu.
- `/policy`: Chính sách; đọc các điều khoản, bảo hành, đổi trả (nếu có).
- `/shop`: Landing cửa hàng; truy cập danh mục/brand nổi bật.
- `/shop/products`: Danh sách sản phẩm; lọc, sắp xếp, tìm kiếm.
- `/shop/products/[slug]`: Chi tiết sản phẩm; xem giá/ảnh/thông số, thêm vào giỏ.
- `/shop/categories`: Danh mục sản phẩm; chọn danh mục để lọc.
- `/shop/brands`: Thương hiệu; lọc theo thương hiệu.
- `/solutions`: Danh sách giải pháp; xem nội dung và CTA liên quan.
- `/solutions/[slug]`: Chi tiết giải pháp; nội dung marketing/ứng dụng.
- `/software`: Danh sách phần mềm; xem nội dung và CTA liên quan.
- `/software/[slug]`: Chi tiết phần mềm; xem tính năng, mô tả.
- `/cart`: Giỏ hàng; chỉnh số lượng, xóa sản phẩm.
- `/cart-review`: Xác nhận giỏ; chọn sản phẩm, nhập thông tin tạm (guest).
- `/checkout`: Thanh toán/đặt hàng; nhập địa chỉ, phương thức giao hàng.
- `/thank-you`: Trang cảm ơn sau đặt hàng; hiển thị thông tin đơn.
- `/order`: Tra cứu đơn hàng; nhập mã/điện thoại hoặc theo hướng dẫn trong UI.
- `/order/[orderId]`: Chi tiết đơn hàng; xem trạng thái và lịch sử xử lý.
- `/order/[orderId]/print`: Bản in đơn hàng; dùng để in chứng từ.
- `/login`: Đăng nhập.
- `/register`: Đăng ký tài khoản khách hàng.
- `/forgot-password`: Yêu cầu đặt lại mật khẩu.
- `/reset-password`: Đặt lại mật khẩu qua token email.
- `/profile`: Thông tin cá nhân; xem dữ liệu tài khoản.
- `/profile/edit`: Cập nhật hồ sơ người dùng.
- `/profile/orders`: Lịch sử đơn hàng của người dùng.
- `error.tsx`: Trang lỗi tổng quát khi runtime error.
- `not-found.tsx`: Trang 404.

### Staff (nhân sự xử lý nghiệp vụ)

- `/staff`: Bảng điều khiển cho nhân sự; điểm vào các tác vụ chính.
- `/staff/orders`: Danh sách đơn cần xử lý; lọc theo trạng thái.
- `/staff/orders/[orderId]`: Chi tiết đơn; cập nhật trạng thái, ghi chú.
- `/staff/contacts`: Danh sách liên hệ; phân công xử lý.
- `/staff/contacts/[id]`: Chi tiết liên hệ; cập nhật trạng thái xử lý.
- `/staff/quote-requests`: Danh sách yêu cầu báo giá; theo dõi tiến độ.
- `/staff/quote-requests/[id]`: Chi tiết báo giá; cập nhật trạng thái, phản hồi.

### Admin (quản trị hệ thống)

- `/admin`: Dashboard tổng quan; truy cập nhanh các module.
- `/admin/orders`: Quản lý đơn hàng; lọc, theo dõi, can thiệp.
- `/admin/orders/[orderId]/history`: Lịch sử trạng thái đơn; xem audit/flow.
- `/admin/products`: Quản lý sản phẩm (tổng hợp).
- `/admin/products/list`: Danh sách sản phẩm; filter, bulk cập nhật.
- `/admin/products/create`: Tạo sản phẩm mới; nhập thông tin, ảnh, thông số.
- `/admin/products/[productId]`: Sửa sản phẩm; cập nhật giá, tồn kho, nội dung.
- `/admin/products/galery`: Quản lý thư viện ảnh sản phẩm.
- `/admin/brands`: Quản lý thương hiệu; tạo/sửa/xóa.
- `/admin/brands/create`: Tạo thương hiệu mới.
- `/admin/brands/[id]/update`: Cập nhật thương hiệu.
- `/admin/categories`: Quản lý danh mục.
- `/admin/product-types`: Quản lý loại sản phẩm.
- `/admin/specs`: Quản lý thông số kỹ thuật/định nghĩa spec.
- `/admin/solutions`: Quản lý nội dung giải pháp.
- `/admin/software`: Quản lý nội dung phần mềm.
- `/admin/software-categories`: Danh mục phần mềm.
- `/admin/solution-categories`: Danh mục giải pháp.
- `/admin/suppliers`: Quản lý nhà cung cấp.
- `/admin/quote-requests`: Quản lý yêu cầu báo giá.
- `/admin/contact-requests`: Quản lý liên hệ từ khách.
- `/admin/staff`: Quản lý danh sách nhân sự.
- `/admin/users`: Quản lý người dùng (khách).
- `/admin/system`: Tổng quan cài đặt hệ thống.
- `/admin/system/general`: Cấu hình chung (email, thuế, v.v).
- `/admin/system/policies`: Quản lý nội dung chính sách.
- `/admin/system/hero-banners`: Danh sách hero banner.
- `/admin/system/hero-banners/new`: Tạo hero banner mới.
- `/admin/system/hero-banners/[id]`: Sửa hero banner.
- `/admin/system/announcements`: Quản lý thông báo/announcement.
- `/admin/system/featured-products`: Chọn sản phẩm nổi bật.
- `/admin/system/featured-solutions`: Chọn giải pháp nổi bật.
- `/admin/system/featured-softwares`: Chọn phần mềm nổi bật.

## Thiết lập môi trường

### Yêu cầu

- Node.js 20+
- PostgreSQL 14+ (hoặc tương đương)
- npm (hoặc pnpm/yarn tùy bạn)

### Cài đặt

```bash
npm install
```

### Cấu hình biến môi trường

Tạo `.env` từ mẫu nội bộ của bạn (không commit). Xem danh sách biến cần thiết ở phần dưới.

### Khởi tạo cơ sở dữ liệu

```bash
npx prisma migrate dev
npm run db:seed
```

Lưu ý: seed có đọc biến môi trường để tạo tài khoản quản trị. Không công khai thông tin này.

## Biến môi trường

Không ghi giá trị thật vào README. Chỉ liệt kê tên và ý nghĩa, dùng giá trị giả khi cấu hình local.

### Core & URL

- `DATABASE_URL`: chuỗi kết nối PostgreSQL.
- `NEXT_PUBLIC_SITE_URL`: URL public của site.
- `NEXT_PUBLIC_APP_URL`: URL chính của app (dùng trong email, OAuth).
- `APP_URL`: fallback URL server-side.
- `NEXTAUTH_URL`: fallback cho link auth (nếu cần).

### Auth & Security

- `JWT_SECRET`: khóa ký JWT.
- `AUTH_COOKIE_SECURE`: `true|false` để override secure cookie.

### Email (SMTP)

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: cấu hình SMTP.
- `FROM_EMAIL`: email hiển thị người gửi.
- `EMAIL_FROM_NAME`: tên hiển thị người gửi.
- `ADMIN_EMAIL`: email nhận thông báo hệ thống.

### Google OAuth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### Cloudinary

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_AVATAR_PRESET`
- `CLOUDINARY_PRODUCT_PRESET`
- `CLOUDINARY_PRODUCT_COVER_PRESET`
- `CLOUDINARY_BRAND_PRESET`
- `CLOUDINARY_CATEGORY_PRESET`
- `CLOUDINARY_PRODUCT_TYPE_PRESET`
- `CLOUDINARY_HERO_BANNER_PRESET`
- `CLOUDINARY_POPUP_BANNER_PRESET`
- `CLOUDINARY_SOFTWARE_COVER_PRESET`
- `CLOUDINARY_SOLUTION_COVER_PRESET`

### Google Drive (media)

- `DRIVE_CLIENT_EMAIL`
- `DRIVE_PRIVATE_KEY`
- `DRIVE_ROOT_PRODUCTS`
- `DRIVE_ROOT_BRANDS`
- `DRIVE_ROOT_PRODUCTCATEGORIES`
- `DRIVE_ROOT_PRODUCTTYPES`
- `DRIVE_ROOT_SOLUTIONS`
- `DRIVE_ROOT_SOFTWARE`
- `DRIVE_ROOT_USERS`

### Build / CI flags

- `NEXT_IGNORE_BUILD_ERRORS`: `1` để bỏ qua TypeScript errors khi build.
- `SKIP_BUILD_DB`: `true` để tránh query DB khi build các trang dùng data.
- `SKIP_SITEMAP_DB`: `true` để tránh query DB khi build sitemap.
- `DEFAULT_TAX_RATE`: thuế mặc định nếu chưa cấu hình trong DB.

### Seed & bootstrap (chỉ dùng local)

- `SEED_ADMIN_USERNAME`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PHONE`
- `SEED_ADMIN_PASSWORD`

## Tạo tài khoản quản trị

Có 2 cách phổ biến:

1) Seed (đọc từ biến môi trường `SEED_ADMIN_*`).
2) Script tạo admin thủ công:

```bash
npm run createadmin -- <username> <password>
```

Không chia sẻ tài khoản quản trị; luôn dùng mật khẩu mạnh và đổi định kỳ.

## Vận hành & phát triển

### Chạy dev

```bash
npm run dev
```

### Build & start

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

## Docker

Build production image:

```bash
docker build -t ahso-shop .
docker run --env-file .env -p 3000:3000 ahso-shop
```

Dev/lint image:

```bash
docker build -f Dockerfile.dev -t ahso-shop-dev .
```

## Ghi chú bảo mật

- Tuyệt đối không commit `.env` hoặc chia sẻ khóa/API key.
- Không công khai tài khoản quản trị hoặc thông tin seed.
- Luôn xoay vòng khóa (`JWT_SECRET`, Cloudinary, Google, SMTP) khi nghi ngờ rò rỉ.

## Tài liệu nội bộ đề xuất

- Checklist triển khai (domain, SSL, DB, cron/backup).
- Quy trình vận hành đơn hàng và phân công nhân sự.
- Chính sách backup và audit log.
