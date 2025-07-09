---
next: deployment
title: Migration
---
# Probot v14 Migration Guide

## ESM Only Package

Probot is now exclusively an ESM package. Either migrate to ESM (recommended), or use `require(esm).

Migrating to ESM:

1. Update `package.json`:

```json
{
  "type": "module"
}
```

2. Replace all CommonJS `require()` statements with ESM `import` syntax
3. Update your TypeScript configuration:

```json
{
  "compilerOptions": {
    "module": "node16",
    "moduleResolution": "node16"
  }
}
```

For `require(esm)`:

- For TypeScript 5.7-5.8: Use `"module": "nodenext"` and `"moduleResolution": "nodenext"`
- For TypeScript 5.9+: Use `"module": "node20"` and `"moduleResolution": "node20"`

## Node.js Version Requirements

- **Minimum supported version:** Node.js 20.18+ and 22+
- Node.js 21 support has been dropped

## Webhook Type Definitions

Replace webhook type imports:

```ts
// Before
import { WebhookEvent } from "@octokit/webhooks-types";

// After
import { WebhookEvent } from "@octokit/openapi-webhooks-types-migration";
```

## REST API Access Pattern

Legacy endpoint methods have been removed:

```js
app.on("issues.opened", async (context) => {
  // Before
  // const issue = await context.octokit.issues.get(context.issue());

  // After
  const issue = await context.octokit.rest.issues.get(context.issue());
});
```

## Express Server Removal

The built-in Express server has been removed. To use Express:

1. Install Express:

```
npm install express
```

2. Update your Probot setup:

```js
import express from "express";

export default (app, { addHandler }) => {
  const router = express.Router();

  router.use(express.json());
  router.get("/custom-route", (req, res) => {
    res.json({ status: "ok" });
  });

  addHandler(router);
};
```

## Asynchronous Middleware Initialization

`createNodeMiddleware()` is now asynchronous:

```js
import { createNodeMiddleware } from "probot";
import app from "../app.js";

// Before
// const middleware = createNodeMiddleware(app);

// After
const middleware = await createNodeMiddleware(app);
```
