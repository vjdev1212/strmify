import { execSync } from "child_process";
import dotenv from "dotenv";

dotenv.config();

// Pick all EXPO_PUBLIC_* vars
const vars = Object.keys(process.env).filter(k => k.startsWith("EXPO_PUBLIC_"));

if (vars.length === 0) {
  console.error("❌ No EXPO_PUBLIC_* variables found in .env");
  process.exit(1);
}

const buildArgs = vars
  .map(key => `--build-arg ${key}="${process.env[key] ?? ""}"`)
  .join(" ");

const cmd = `docker buildx build ${buildArgs} \
--tag jarvisnexus/strmify:latest \
--platform linux/arm64,linux/amd64,linux/arm/v7 \
--push .`;

console.log(`🚀 Running: ${cmd}`);
execSync(cmd, { stdio: "inherit" });
