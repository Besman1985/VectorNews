import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  apiPublicUrl: process.env.API_PUBLIC_URL ?? "http://localhost:4000",
  mysqlHost: process.env.MYSQL_HOST ?? "127.0.0.1",
  mysqlPort: Number(process.env.MYSQL_PORT ?? 3306),
  mysqlUser: process.env.MYSQL_USER ?? "root",
  mysqlPassword: process.env.MYSQL_PASSWORD ?? "",
  mysqlDatabase: process.env.MYSQL_DATABASE ?? "vectornews",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  adminJwtSecret: process.env.ADMIN_JWT_SECRET ?? "vectornews-admin-secret"
};
