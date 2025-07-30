---
next: pagination
title: HTTP routes
---

# HTTP routes

When starting your app using `probot run ./app.js` or using the [`Server`](/docs/development/#use-server) class, your Probot app function will receive the `options.addHandler` function as its 2nd argument.

A Handler is a function that takes a Node.js HTTP request and response object, and is called when a request is made to the app's HTTP server. You can use different HTTP frameworks, e.g. [Express](https://expressjs.com/) or [Fastify](https://www.fastify.dev/), to extend the built-in HTTP server. The `addHandler` function will add the routes to the app's HTTP server.

Express v5 Example:

```js
import Express from "express";
import { createNodeMiddleware, createProbot } from "probot";

const express = Express();

const app = (probot) => {
  probot.on("push", async () => {
    probot.log.info("Push event received");
  });
};

const middleware = await createNodeMiddleware(app, {
  webhooksPath: "/api/github/webhooks",
  probot: createProbot({
    env: {
      APP_ID,
      PRIVATE_KEY,
      WEBHOOK_SECRET,
    },
  }),
});

express.use(middleware);
express.use(Express.json());
express.get("/custom-route", (req, res) => {
  res.json({ status: "ok" });
});

express.listen(3000, () => {
  console.log(`Server is running at http://localhost:3000`);
});
```

Fastify v5 Example:

```js
import Fastify from "fastify";
import { createNodeMiddleware, createProbot } from "probot";

const fastify = Fastify();

// Declare a route
fastify.get("/hello-world", function (request, reply) {
  reply.send({ hello: "world" });
});

const app = (app) => {
  app.on("push", async () => {
    app.log.info("Push event received");
  });
};

const middleware = await createNodeMiddleware(app, {
  webhooksPath: "/api/github/webhooks",
  probot: createProbot({
    env: {
      APP_ID,
      PRIVATE_KEY,
      WEBHOOK_SECRET,
    },
  }),
});

const wrappedMiddleware = async (req, reply) => {
  req.raw.body = JSON.stringify(req.body);
  await middleware(req.raw, reply.raw);
  return reply;
};

fastify.post("/api/github/webhooks", middleware);

const address = await fastify.listen({ port: 3000 });

console.log(`Server is running at ${address}`);
```

Visit http://localhost:3000/my-app/hello-world to access the endpoint.
