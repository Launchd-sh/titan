import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`${key} environment variable is required`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional("PORT", "8080"), 10),
  // Validated here so the app fails fast at startup; Prisma reads DATABASE_URL from env directly.
  databaseUrl: required("DATABASE_URL"),
} as const;
