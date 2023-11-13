import fs from "fs";
import path from "path";

export function loadPackageJson(
  filepath = path.join(process.cwd(), "package.json"),
): { [key: string]: any } {
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
