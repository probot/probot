import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { staticFilesHandler } from "../../../src/server/handlers/static-files.js";
import robotSvg from "../../../src/static/robot.svg.js";
import probotHeadSvg from "../../../src/static/probot-head.svg.js";
import primerCss from "../../../src/static/primer.css.js";

describe("staticFilesHandler", () => {
  it.each([
    ["/probot/static/robot.svg", "image/svg+xml", robotSvg],
    ["/probot/static/probot-head.svg?cache=1", "image/svg+xml", probotHeadSvg],
    ["/probot/static/primer.css", "text/css", primerCss],
  ])("serves %s", (url, contentType, expectedBody) => {
    const end = vi.fn();
    const response = {} as ServerResponse;
    const writeHead = vi.fn().mockReturnValue(response);
    Object.assign(response, { writeHead, end });

    expect(
      staticFilesHandler({ method: "GET", url } as IncomingMessage, response),
    ).toBe(true);
    expect(writeHead).toHaveBeenCalledWith(200, {
      "cache-control": "max-age=86400",
      "content-type": contentType,
    });
    expect(end).toHaveBeenCalledWith(expectedBody);
  });

  it.each([
    ["POST", "/probot/static/robot.svg"],
    ["GET", "/probot/static/missing.svg"],
    ["GET", undefined],
  ])("returns false for %s %s", (method, url) => {
    const writeHead = vi.fn();
    const end = vi.fn();
    const response = { writeHead, end } as unknown as ServerResponse;

    expect(
      staticFilesHandler({ method, url } as IncomingMessage, response),
    ).toBe(false);
    expect(writeHead).not.toHaveBeenCalled();
  });
});
