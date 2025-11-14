import type { Handler } from "../../types.js";
import robotSvg from "../../static/robot.svg.js";
import probotHeadPng from "../../static/probot-head.svg.js";
import primerCss from "../../static/primer.css.js";

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
    if (path === "/probot/static/probot-head.svg") {
      res
        .writeHead(200, {
          "cache-control": "max-age=86400",
          "content-type": "image/svg+xml",
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
