const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const outputPath = path.join(rootDir, "assets", "js", "env.js");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env file. Create one based on .env.example.");
  process.exit(1);
}

const raw = fs.readFileSync(envPath, "utf8");
const env = {};

raw.split(/\r?\n/).forEach((line) => {
  if (!line || line.trim().startsWith("#")) return;
  const idx = line.indexOf("=");
  if (idx === -1) return;
  const key = line.slice(0, idx).trim();
  let value = line.slice(idx + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  env[key] = value;
});

const payload = {
  SUPABASE_URL: env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || "",
  SUPABASE_TABLE: env.SUPABASE_TABLE || "task_state",
  SUPABASE_ROW_ID: env.SUPABASE_ROW_ID || "task_state_singleton",
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const fileContents = `window.__ENV = ${JSON.stringify(payload, null, 2)};\n`;
fs.writeFileSync(outputPath, fileContents, "utf8");
console.log("Wrote", outputPath);
