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

Every deployment will need an [App](https://developer.github.com/apps/). If you have not created a GitHub App, you learn how using the [Deployment section of our docs](/deployment/#create-the-github-app)

## Deploy the app

To deploy an app to any cloud provider, you will need 3 environment variables:

- `APP_ID`: the ID of the app, which you can get from the [app settings page](https://github.com/settings/apps).
- `WEBHOOK_SECRET`: the **Webhook Secret** that you generated when you created the app.
- `PRIVATE_KEY_PATH`: the path to a private key file

> These environment variables will need to be passed through to your FaaS solution. Each solution is different; please consult their documentation on how to use variables in the deployed environment.

Choosing a FaaS provider is mostly dependent on developer preference. Each Probot plugin interacts similarly, but the plugins implementation is dealing with different requests and responses specific to the provider. If you do not have a preference for a provider, choose the solution you have the most familiarity.

### AWS Lambda

AWS Lambda is an event-driven, serverless computing platform provided by Amazon as a part of the Amazon Web Services. AWS Lamba additionally manages the computing resources required for the code and adjusts those resources in conjunction with incoming events.
1. [Install the @probot/serverless-lambda](https://github.com/probot/serverless-lambda#usage) plugin.
2. Create a `handler.js` file in the root of you probot application
   ```
   // handler.js
   const serverless = require('@probot/serverless-lambda')
   const appFn = require('./')
   module.exports.probot = serverless(appFn)
   ```
2. Follow the lambda [configuration steps](https://github.com/probot/serverless-lambda#configuration) using the [AWS CLI](https://aws.amazon.com/cli/) or [Serverless framework](https://github.com/serverless/serverless).
3. Once the app is is configured and you can proceed with deploying using the either [AWS CLI](https://aws.amazon.com/cli/) or [Serverless framework](https://github.com/serverless/serverless)

> note: The Serverless framework provides a more straightforward approach to setting up your AWS environment. It requires the creation of a serverless.yml in the root of your application.

### Google Cloud Function

Google Cloud Platform, is a suite of cloud computing services that run on the same infrastructure that Google uses internally for its end-user products. Cloud Functions are the Platform's FaaS offering.

1. [Install the @probot/serverless-gcf](https://github.com/probot/serverless-gcf#usage) plugin.
2. Create a `handler.js` file in the route of you probot application
   ```
   // handler.js
   const serverless = require('@probot/serverless-gcf')
   const appFn = require('./')
   module.exports.probot = serverless(appFn)
   ```
2. Follow the GCF [configuration steps](https://github.com/probot/gcf#configuration) using the [gcloud CLI](https://cloud.google.com/pubsub/docs/quickstart-cli) or [Serverless framework](https://github.com/serverless/serverless).
3. Once the app is is configured and you can proceed with deploying using the either [gcloud CLI](https://cloud.google.com/pubsub/docs/quickstart-cli) or [Serverless framework](https://github.com/serverless/serverless)
