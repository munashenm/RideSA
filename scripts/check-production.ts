import { getProductionReadiness } from "../src/lib/production-readiness";

const readiness = getProductionReadiness();

console.log(`VayaSA production readiness (${readiness.environment})`);
console.log(readiness.ready ? "READY" : "NOT READY");
console.log("");

for (const item of readiness.items) {
  const marker =
    item.status === "ok"
      ? "✓"
      : item.status === "error"
        ? "✗"
        : item.status === "warning"
          ? "!"
          : "·";
  console.log(`${marker} [${item.status}] ${item.label}`);
  console.log(`  ${item.detail}`);
}

const errors = readiness.items.filter((item) => item.status === "error");
process.exit(errors.length > 0 ? 1 : 0);
