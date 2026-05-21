const { execSync } = require("node:child_process");
const { createRequire } = require("node:module");

const cjsRequire = createRequire(__filename);

const LINUX_BINDINGS = [
  "@tailwindcss/oxide-linux-x64-gnu",
  "@tailwindcss/oxide-linux-x64-musl",
  "@tailwindcss/oxide-linux-arm64-gnu",
  "@tailwindcss/oxide-linux-arm64-musl",
];

function hasBinding(name) {
  try {
    cjsRequire.resolve(name);
    return true;
  } catch {
    return false;
  }
}

if (process.platform !== "linux") {
  process.exit(0);
}

if (LINUX_BINDINGS.some(hasBinding)) {
  process.exit(0);
}

const arch = process.arch === "arm64" ? "arm64" : "x64";
const candidates = [
  `@tailwindcss/oxide-linux-${arch}-gnu`,
  `@tailwindcss/oxide-linux-${arch}-musl`,
];

for (const pkg of candidates) {
  console.log(`Installing Tailwind native binding: ${pkg}`);
  try {
    execSync(`npm install ${pkg}@4.3.0 --no-save --include=optional`, {
      stdio: "inherit",
    });
    if (hasBinding(pkg)) {
      process.exit(0);
    }
  } catch {
    // try next candidate
  }
}

console.error("Failed to install Tailwind CSS native binding for Linux.");
process.exit(1);
