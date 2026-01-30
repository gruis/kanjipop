import fs from "node:fs";
import path from "node:path";

const readJson = (filePath: string) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
};

export default defineEventHandler(() => {
  const versionFile = path.resolve("app-version.json");
  if (fs.existsSync(versionFile)) {
    const payload = readJson(versionFile);
    if (payload) return payload;
  }

  const pkgFile = path.resolve("package.json");
  const pkg = readJson(pkgFile) || {};
  return {
    tag: null,
    version: pkg.version || "unknown",
    gitDescribe: process.env.GIT_DESCRIBE || null,
    buildTime: null,
  };
});
