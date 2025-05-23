---
next: pagination
title: HTTP routes
---

# HTTP routes

When starting your app using `probot run ./app.js` or using the [`Server`](/docs/development/#use-server) class, your Probot app function will receive the `options.addHandler` function as its 2nd argument.

A Handler is a function that takes a Node.js HTTP request and response object, and is called when a request is made to the app's HTTP server. The `addHandler` function allows you to add custom HTTP routes to your app.

You can use different HTTP frameworks, e.g. [Express](https://expressjs.com/) or [Fastify](https://www.fastify.iodev/), to handle HTTP requests.

Express Example:

```js
import express from "express";

export default (app, { addHandler }) => {
  // Get an express router to expose new HTTP endpoints
  const router = express.Router("/my-app");

  // Use any middleware
  router.use(express.static("public"));

  // Add a new route
  router.get("/hello-world", (req, res) => {
    reply.send({ hello: "world" });
  });

  // Add the router to the app
  addHandler(router);
};
```

Fastify Example:

```js
import Fastify from "fastify";

export default async (app, { addHandler }) => {
  // Get a fastify instance to expose new HTTP endpoints
  const fastifyInstance = Fastify();

  // Declare a route
  fastify.get("/hello-world", function (request, reply) {
    reply.send({ hello: "world" });
  });

  await fastify.ready();

  // Add the router to the app
  addHandler(fastifyInstance.routing);
};
```

Visit http://localhost:3000/my-app/hello-world to access the endpoint.
