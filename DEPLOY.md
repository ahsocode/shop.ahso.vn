# Deploy bang GHCR va Docker Compose

Workflow `.github/workflows/docker-build.yml` build image Next.js va push len GHCR khi co push vao `main`.

Image mac dinh:

```txt
ghcr.io/duyhaiahso/ahsovn:latest
```

## GitHub

Can cau hinh repo variable/secret neu gia tri duoc dung luc build:

- `vars.NEXT_PUBLIC_SITE_URL`
- `vars.NEXT_PUBLIC_APP_URL`
- `vars.NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `secrets.NEXT_PUBLIC_TINYMCE_API_KEY`

## VPS lan dau

Tao thu muc deploy rieng, vi du `/opt/ahsovn`, roi dat cac file:

- `docker-compose.prod.yml`
- `.env.ahsovn`
- `.env.ahsovn.postgres`

Tao `.env.ahsovn` tu `.env.ahsovn.example` va `.env.ahsovn.postgres` tu `.env.ahsovn.postgres.example`.

Chay:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Container app se tu chay:

```bash
npx prisma migrate deploy
```

truoc khi start Next.js server.

## Update moi lan deploy

```bash
docker compose -f docker-compose.prod.yml pull ahsovn_app
docker compose -f docker-compose.prod.yml up -d ahsovn_app
docker compose -f docker-compose.prod.yml logs -f ahsovn_app
```

Neu co thay doi bien moi truong, cap nhat `.env.ahsovn` truoc khi `up -d`.

## Khong conflict voi stack shopahso hien tai

Compose nay dung namespace rieng:

- container: `ahsovn_app`, `ahsovn_postgres`
- volume: `ahsovn_postgres_data`
- host port: `3200:3000`
- image: `ghcr.io/duyhaiahso/ahsovn:latest`

Stack shopahso hien tai dang dung `shopahso_*`, volume `shopahso_postgres_data`, port `3100`, `3101`, nen khong conflict neu giu dung cac ten va port tren.

Neu reverse proxy dang route domain vao port khac, chi can doi port host `3200` trong `docker-compose.prod.yml`.
