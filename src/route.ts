import express from "express";

import { Application } from "./application";

/**
 * Get an {@link http://expressjs.com|express} router that can be used to
 * expose HTTP endpoints
 *
 * ```
 * module.exports = app => {
 *   // Get an express router to expose new HTTP endpoints
 *   const route = app.route('/my-app');
 *
 *   // Use any middleware
 *   route.use(require('express').static(__dirname + '/public'));
 *
 *   // Add a new route
 *   route.get('/hello-world', (req, res) => {
 *     res.end('Hello World');
 *   });
 * };
 * ```
 *
 * @param path - the prefix for the routes
 * @returns an [express.Router](http://expressjs.com/en/4x/api.html#router)
 */
export function route(app: Application, path?: string): express.Router {
  if (path) {
    const router = express.Router();
    app.router.use(path, router);
    return router;
  } else {
    return app.router;
  }
}
