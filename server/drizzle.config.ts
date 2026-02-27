import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",
  ...(process.env.LOCAL_DB_PATH
    ? {
        dbCredentials: {
          url: process.env.LOCAL_DB_PATH,
        },
      }
    : {
        driver: "d1-http",
      }),
});
