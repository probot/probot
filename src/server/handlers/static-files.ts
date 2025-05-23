import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Handler } from "../../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const robotSvg = readFileSync(
  join(__dirname, "..", "..", "..", "static", "robot.svg"),
  "utf-8",
);
const probotHeadPng = readFileSync(
  join(__dirname, "..", "..", "..", "static", "probot-head.png"),
  "utf-8",
);
const primerCss = readFileSync(
  join(__dirname, "..", "..", "..", "static", "primer.css"),
  "utf-8",
);

export const staticFilesHandler: Handler = (req, res) => {
  if (req.method === "GET") {
    const path = req.url?.split("?")[0] || "";
    if (path === "/probot/static/robot.svg") {
      res
        .writeHead(200, {
          "cache-control": "max-age=86400",
          "content-type": "image/svg+xml",
        })
        .end(robotSvg);
      return true;
    }
    if (path === "/probot/static/probot-head.png") {
      res
        .writeHead(200, {
          "cache-control": "max-age=86400",
          "content-type": "image/png",
        })
        .end(probotHeadPng);
      return true;
    }
    if (path === "/probot/static/primer.css") {
      res
        .writeHead(200, {
          "cache-control": "max-age=86400",
          "content-type": "text/css",
        })
        .end(primerCss);
      return true;
    }
  }
  return false;
};
