import { resolve } from "node:path";

import type { ApplicationFunctionOptions, Probot } from "../exports.js";
import { loadPackageJson } from "../helpers/load-package-json.js";
import { probotView } from "../views/probot.js";
import { Handler } from "../types.js";

export function defaultApp(
  _app: Probot,
  { cwd = process.cwd() }: ApplicationFunctionOptions,
): Handler {
  const pkg = loadPackageJson(resolve(cwd, "package.json"));
  const probotViewRendered = probotView({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  });

  const defaultHandler: Handler = (req, res) => {
    if (req.method === "GET") {
      if (req.url === "/") {
        res
          .writeHead(302, { "content-type": "text/plain", location: `/probot` })
          .end(`Found. Redirecting to /probot`);
        return true;
      }
      if (req.url === "/probot") {
        res
          .writeHead(200, { "content-type": "text/html" })
          .end(probotViewRendered);
        return true;
      }
    }
    return false;
  };
  return defaultHandler;
}
