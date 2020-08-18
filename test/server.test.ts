import { Application, NextFunction, Request, Response } from "express";
import request from "supertest";
import { getLog } from "../src/helpers/get-log";
import { createServer } from "../src/server/create-server";

describe("server", () => {
  let server: Application;
  let webhook: any;

  beforeEach(() => {
    webhook = jest.fn((req, res, next) => next());
    server = createServer({ webhook, logger: getLog() });

    // Error handler to avoid printing logs
    server.use(
      (error: Error, req: Request, res: Response, next: NextFunction) => {
        res.status(500).send(error.message);
      }
    );
  });

  describe("GET /ping", () => {
    it("returns a 200 response", () => {
      return request(server).get("/ping").expect(200, "PONG");
    });
  });

  describe("webhook handler", () => {
    it("should 500 on a webhook error", () => {
      webhook.mockImplementation(
        (req: Request, res: Response, callback: NextFunction) =>
          callback(new Error("webhook error"))
      );
      return request(server).post("/").expect(500);
    });
  });

  describe("with an unknown url", () => {
    it("responds with 404", () => {
      return request(server).get("/lolnotfound").expect(404);
    });
  });
});
