---
next: docs/simulating-webhooks.md
---

# HTTP routes

Calling `app.route('/my-app')` will return an [express](http://expressjs.com/) router that you can use to expose HTTP endpoints from your app.

```js
module.exports = app => {
  // Get an express router to expose new HTTP endpoints
  const router = app.route('/my-app')

  // Use any middleware
  router.use(require('express').static('public'))

  // Add a new route
  router.get('/hello-world', (req, res) => {
    res.send('Hello World')
  })
}
```

Visit https://localhost:3000/my-app/hello-world to access the endpoint.

It is strongly encouraged to use the name of your package as the prefix so none of your routes or middleware conflict with other apps. For example, if [`probot/owners`](https://github.com/probot/owners) exposed an endpoint, the app would call `app.route('/owners')` to prefix all endpoints with `/owners`.

See the [express documentation](http://expressjs.com/en/guide/routing.html) for more information.
