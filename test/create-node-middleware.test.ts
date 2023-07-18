import { createServer, IncomingMessage, ServerResponse } from "http";
import Stream from "stream";

import pino from "pino";
import getPort from "get-port";
import got from "got";
import { sign } from "@octokit/webhooks-methods";

import { createNodeMiddleware, createProbot, Probot } from "../src";
import { ApplicationFunction } from "../src/types";

const APP_ID = "1";
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQEArt/ScvMkbGF1h16mITuZ/1MmLXQ6GR6oxJ5olxvIKCmFVVAF
76ViLpR2/3bVkraBElSuXRUix/K4iCuK+LeV7JSFANdzMQ0Vt9NcxfXZo3rCbOHZ
yFViWWHcTzCQ8oyxDopXGt6377BSn9d8u9aZ/d7ew0sLKY4LjplY60NvTis3keTp
/RaI1oCnvYQraeBfWOK2xH8aC6MwlmSJ+CT8CVUR/zEhOQEkL3JcrOgJqzNmTK8p
J5aupC/YtN0sE72b+kv86+giLQrcGndzxgu8lCqFPmzQbO16sDmdjnpzVYIsM0OU
7wCU6NHthSJ69d9JQuJgsKRiyV3fldls4yJ9UwIDAQABAoIBAFYg2q/O3QOcRJx1
m3EGv+Qm+citU+gHV6vvMSgrgLt3J7pK/YF4fRDgAnPz/WCTDqMOngouXMEJ5KT8
fSfek7K/u3ocoxlnjmjJawn8+kIwNg4WdoLauuO29SDzlJBBhvrYW+paA1HEEA21
vjNtkM6etCyPi2HeGgcTs927ith+U4XJM6KB4Ixzt0C7BasSeFCcPGlDrEL2mu0V
fCJuYH2rH73GxEXYJTWzU0ttjNdovx9T4rxgWjYX+/U8mN1YQEyYd5VkziyVtIet
YEAStOwimZBEgk9w6XMVvDO+fPyTdjBFuinIMTookyaHhbmUMEHN8SGfmm4eOT2i
ccKnHCECgYEA5KrTuiecOD4ZT9vn/QtpdPWgW/l0v694Y70WsQ6PgB4+yy3qEcXO
uM0kErC6Yr2K/C7K3neV3/qAjA0RfES2BCWVkBKXWGsfAXd3a2B/P6CfJaEV4mqP
ZLHwqdANzV/ENAapvtXvrtZCxqdlDcTpYBbuBf2aBO5VmN/PZD1tNLkCgYEAw8bw
wNUh+EmxgFuq4dlZDUq3TG0KV0MI2yCV5k0BDd2zzwz+pibhb0FvYrFBJQJknYJ7
WNGTJbH2mX+EYqfLKTODzrhBc+qHjGzU20HZ62CVv/BYiwePhXT8/mQ5+odafdTJ
2QU8Rhl199eEQdTFKueaTBPv1Ch3ZV+0KR/XFGsCgYBCP4el2BH3bW5R56kXc7Xy
z7LM0sHTQxgC9WZcl5ZVjO2uWbgFvCQ/ABfiXlcxgi6BD2FxAH5obJ/Pc33MXe/J
1cW1/tzgHfDWsPDlKAjVu0hAU6IOfcbban4KBJ/rD0K9u+xzwHF3WtXvzdGGIrVm
RF5jV+zGXvJnnvfr16wK6QKBgGqkjHJN5uIrqk/EHzJFRbfy0iQEZZShBErw1haM
LZ3S/WY0quXw2e3TlAwLh/PT+OC/udbo2iG3bh+xEXj387euwwaw4Z51y35Xrh79
IOqRQyE5l9Grvacx0bn0+IwafNV8OrNHocyBg/wMXpPJhdlYLXlxhrtni5oh5q5c
FLmfAoGAc1sDXdvLG9dAwU76tWxsI/ND/mH8FqyoynfACf6O+2xYBRvHYlUwhH+2
ktF/AGF6qGtiTlkQp6W/9W8TCp66WeNOPaFFHWFlQ5uyxCn/N/Z3NnUvlD4YRi+P
+FrbrdG1hrbLgmCrDA+rZA/SqdsQy6PSJ97+JvRFhmBxoNxaYm0=
-----END RSA PRIVATE KEY-----`;
const WEBHOOK_SECRET = "secret";
const pushEvent = require("./fixtures/webhook/push.json");

describe("createNodeMiddleware", () => {
  let output: any[];
  const streamLogsToOutput = new Stream.Writable({ objectMode: true });
  streamLogsToOutput._write = (object, encoding, done) => {
    output.push(JSON.parse(object));
    done();
  };

  beforeEach(() => {
    output = [];
  });

  test("with createProbot", async () => {
    expect.assertions(1);

    const app: ApplicationFunction = (app) => {
      app.on("push", (event) => {
        expect(event.name).toEqual("push");
      });
    };
    const middleware = createNodeMiddleware(app, {
      probot: createProbot({
        overrides: {
          log: pino(streamLogsToOutput),
        },
        env: {
          APP_ID,
          PRIVATE_KEY,
          WEBHOOK_SECRET,
        },
      }),
    });

    const server = createServer(middleware);
    const port = await getPort();
    server.listen(port);

    const body = JSON.stringify(pushEvent);

    await got.post(`http://127.0.0.1:${port}`, {
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-github-delivery": "1",
        "x-hub-signature-256": await sign("secret", body),
      },
      body,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    server.close();
  });

  test("loads app only once", async () => {
    let counter = 0;
    const appFn = () => {
      counter++;
    };
    const middleware = createNodeMiddleware(appFn, {
      probot: new Probot({
        appId: APP_ID,
        privateKey: PRIVATE_KEY,
      }),
    });

    middleware(
      {} as IncomingMessage,
      { end() {}, writeHead() {} } as unknown as ServerResponse
    );
    middleware(
      {} as IncomingMessage,
      { end() {}, writeHead() {} } as unknown as ServerResponse
    );

    expect(counter).toEqual(1);
  });
});
