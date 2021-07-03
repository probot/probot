---
next: docs/pagination.md
title: HTTP routes
---

# HTTP routes

When starting your app using `probot run ./app.js` or using the [`Server`](./development.md#use-server) class, your Probot app function will receive the `options.getRouter` function as its 2nd argument.

Calling `getRouter('/my-app')` will return an [express](http://expressjs.com/) router that you can use to expose custom HTTP endpoints from your app.

```js
module.exports = (app, { getRouter }) => {
  // Get an express router to expose new HTTP endpoints
  const router = getRouter("/my-app");

  // Use any middleware
  router.use(require("express").static("public"));

  // Add a new route
  router.get("/hello-world", (req, res) => {
    res.send("Hello World");
  });
};
```

Visit https://localhost:3000/my-app/hello-world to access the endpoint.

It is strongly encouraged to use the name of your package as the prefix so none of your routes or middleware conflict with other apps. For example, if [`probot/owners`](https://github.com/probot/owners) exposed an endpoint, the app would call `getRouter('/owners')` to prefix all endpoints with `/owners`.

See the [express documentation](http://expressjs.com/en/guide/routing.html) for more information.
