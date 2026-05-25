import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const dbUrl =
  process.env.DATABASE_URL ||
  "postgresql://user:pass@localhost:5432/dummy?schema=public";

export default defineConfig({
  engine: "classic",
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: dbUrl,
  },
});
