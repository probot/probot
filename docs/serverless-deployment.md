---
next: docs/persistence.md
---

# Serverless deployment

Serverless computing is a model which aims to abstract server management without concerns for implementing, tweaking, or scaling a server (at least, to the perspective of a user). The following sections will provide examples on how to deploy your application to service that will run on-demand as a Function as a Service(FaaS).

To learn more about other FaaS offerings and the concept of serverless, check out the [comparisons and case studies](https://serverless.com/learn/overview) created by the Serverless Framework.

> note: Deploying to FaaS provider will require you to first [create a GitHub App](#create-the-github-app)

**Contents:**

1. [Create the GitHub App](#create-the-github-app)
1. [Deploy the app to a FaaS provider](#deploy-the-app)
   1. [AWS Lambda](#aws-lambda)
   1. [Google Cloud Function](#google-cloud-function)

## Create the GitHub App

Every deployment will need an [App](https://developer.github.com/apps/). If you have not created a GitHub App, you learn how using the [Deployment section of our docs](/docs/deployment/#create-the-github-app)

## Deploy the app

To deploy an app to any cloud provider, you will have to pass a `probot` instance:

```js
const { Probot } = require("probot");
const { createMyMiddleware } = require("my-probot-middleware");
const myApp = require("./my-app.js");

module.exports = createMyMiddleware(myApp, {
  probot: new Probot({
    appId: 1,
    privateKey: process.env.PRIVATE_KEY,
    secret: process.env.WEBHOOK_SECRET,
  }),
});
```

Creating the instance outside the `createMyMiddleware` function enables the reuse of the `probot` instance across multiple requests, see [Understanding Container Reuse in AWS Lambda](https://aws.amazon.com/blogs/compute/container-reuse-in-lambda/).

If you want to configure the created `probot` instance based on [environment variables](https://probot.github.io/docs/configuration/), use the `createProbot` method

```js
const { createProbot } = require("probot");
const { createMyMiddleware } = require("my-probot-middleware");
const myApp = require("./my-app.js");

module.exports = createMyMiddleware(myApp, { probot: createProbot() });
```

You can optionall pass `defaults` and `overrides` as `createProbot({ defaults, overrides })` to customize the options passed to the Probot constructor.

Choosing a FaaS provider is mostly dependent on developer preference. Each Probot plugin interacts similarly, but the plugins implementation is dealing with different requests and responses specific to the provider. If you do not have a preference for a provider, choose the solution you have the most familiarity.

### Node.js/express middleware

Probot exports a standard Node.js middleware by default, you can use it like this:

```js
const { createNodeMiddleware, createProbot } = require("probot");
const myApp = require("./my-app.js");

module.exports = createNodeMiddleware(myApp, { probot: createProbot() });
```

The returned middleware includes an optional 3rd `next` argument for compatibility with [express middleware](https://expressjs.com/en/guide/using-middleware.html).

### AWS Lambda

See [@probot/serverless-lambda](https://github.com/probot/serverless-lambda#usage)

### Google Cloud Function

See [@probot/serverless-gcf](https://github.com/probot/serverless-gcf#usage)

### Azure Function

See [probot-serverless-azurefunctions](https://github.com/ethomson/probot-serverless-azurefunctions/#usage)

### Add yours:

A probot middleware function should follow the following conventions:

1. The package exports a synchronous function. The function name should follow the pattern `create[Platform]Middleware`
2. The exported function should return a function matching the respective platform of the requirements
3. The first argument should be a probot application function: `async (app) => { ... }`
4. The 2nd argument should accept an object with at least a `probot` key, which has to be set to a Probot instance.

Please share your own middleware by adding it to this list: [edit this page on GitHub](https://github.com/probot/probot/edit/master/docs/serverless-deployment.md).
