import type { Handler } from "../../types.js";

export const notFoundHandler: Handler = (_req, res) => {
  res.writeHead(404).end();
  return true;
};
