import type { Handler } from "../../types.js";

export const notFoundHandler: Handler = (_req, res) => {
  if (res.headersSent) {
    return false;
  }
  res.writeHead(404).end();
  return true;
};
