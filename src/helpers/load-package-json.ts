import fs from "node:fs";
import path from "node:path";

import type { PackageJson } from "../types.js";

export function loadPackageJson(
  filepath = path.join(process.cwd(), "package.json"),
): PackageJson {
  let pkgContent;
  try {
    pkgContent = fs.readFileSync(filepath, "utf8");
  } catch {
    return {};
  }
  try {
    const pkg = pkgContent && JSON.parse(pkgContent);
    if (pkg && typeof pkg === "object") {
      return pkg;
    }
    return {};
  } catch {
    return {};
  }
}
