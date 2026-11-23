/**
 * Database Provider Adapter & Auto-Switch Script
 * Automatically configures prisma/schema.prisma datasource provider
 * based on the active DATABASE_URL (sqlite vs postgresql).
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma")
const databaseUrl = process.env.DATABASE_URL || "file:./dev.db"

const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://")
const targetProvider = isPostgres ? "postgresql" : "sqlite"

let schema = fs.readFileSync(schemaPath, "utf8")
const currentProviderMatch = schema.match(/provider\s*=\s*"([^"]+)"\s*\n\s*url\s*=\s*env\("DATABASE_URL"\)/)

if (currentProviderMatch && currentProviderMatch[1] !== targetProvider) {
  console.log(`[DB Switch] Detected DATABASE_URL for ${targetProvider}. Updating schema.prisma provider from ${currentProviderMatch[1]} to ${targetProvider}...`)
  schema = schema.replace(
    /datasource db \{[\s\S]*?\}/,
    `datasource db {\n  provider = "${targetProvider}"\n  url      = env("DATABASE_URL")\n}`
  )
  fs.writeFileSync(schemaPath, schema, "utf8")
  console.log(`[DB Switch] schema.prisma updated to provider = "${targetProvider}".`)
} else {
  console.log(`[DB Switch] schema.prisma already configured for provider = "${targetProvider}".`)
}

// Generate Prisma Client
console.log("[DB Switch] Generating Prisma Client...")
try {
  execSync("npx prisma generate", { stdio: "inherit" })
  console.log("[DB Switch] Prisma Client generated successfully.")
} catch (err) {
  console.error("[DB Switch] Failed to generate Prisma Client:", err)
  process.exit(1)
}
