import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

const dbUrl = process.env.DATABASE_URL || "mysql://user:pass@localhost:3306/dummy";

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
