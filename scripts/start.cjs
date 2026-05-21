const { execSync, spawnSync } = require("node:child_process");

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit" });
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Link a PostgreSQL service in Railway.");
  process.exit(1);
}

if (
  process.env.NODE_ENV === "production" &&
  !process.env.DATABASE_URL.startsWith("postgres")
) {
  console.error(
    "DATABASE_URL must be a PostgreSQL URL in production:",
    process.env.DATABASE_URL.slice(0, 20) + "..."
  );
  process.exit(1);
}

try {
  run("npx prisma db push --skip-generate");
  run("npx prisma db seed");
} catch (error) {
  console.error("Database setup failed:", error.message);
  process.exit(1);
}

const port = process.env.PORT || "3000";
const result = spawnSync(
  "npx",
  ["next", "start", "-H", "0.0.0.0", "-p", port],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);
