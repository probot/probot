---
next: docs/persistence.md
---

# Serverless Deployment

Serverless computing is a model which aims to abstract server management without concerns for implementing, tweaking, or scaling a server (at least, to the perspective of a user). The follow sections will provide examples on how to deploy your application to service that will run on-demand as a Function as a Service(FaaS).

> Deploying to FaaS provider will require you to first [create a GitHub App](#create-the-github-app)

**Contents:**

1. [Create the GitHub App](#create-the-github-app)
1. [Deploy the app to a FaaS provider](#deploy-the-app)
    1. [AWS Lambda](#aws-lambda)
    1. [Google Cloud Function](#google-cloud-function)

## Create the GitHub App

Every deployment will need an [App](https://developer.github.com/apps/).

1. [Create a new GitHub App](https://github.com/settings/apps/new) with:
    - **Homepage URL**: the URL to the GitHub repository for your app
    - **Webhook URL**: Use `https://example.com/` for now, we'll come back in a minute to update this with the URL of your deployed app.
    - **Webhook Secret**: Generate a unique secret with `openssl rand -base64 32` and save it because you'll need it in a minute to configure your deployed app.

1. Download the private key from the app and rename it to private-key.pem.

1. Make sure that you click the green **Install** button on the top left of the app page. This gives you an option of installing the app on all or a subset of your repositories.

## Deploy the app

To deploy an app to any cloud provider, you will need 2 environment variables:

- `APP_ID`: the ID of the app, which you can get from the [app settings page](https://github.com/settings/apps).
- `WEBHOOK_SECRET`: the **Webhook Secret** that you generated when you created the app.

### AWS Lambda

AWS Lambda is an event-driven, serverless computing platform provided by Amazon as a part of the Amazon Web Services. It is a computing service that runs code in response to events and automatically manages the computing resources required by that code.
1. [Install the @probot/serverless-lambda](https://github.com/probot/serverless-lambda#usage) plugin.
2. Create a `handler.js` file in the route of you probot application
   ```
   // handler.js
   const serverless = require('@probot/serverless-lambda')
   const appFn = require('./')
   module.exports.probot = serverless(appFn)
   ```
2. Follow the lambda [configuration steps](https://github.com/probot/serverless-lambda#configuration) using the [AWS CLI](https://aws.amazon.com/cli/) or [Serverless framework](https://github.com/serverless/serverless).
3. Once the app is is configured and you can proceed with deploying using the either [AWS CLI](https://aws.amazon.com/cli/) or [Serverless framework](https://github.com/serverless/serverless)

> note: The Servereless framework provides a simpler approach to setting up your AWS environment. It requires the creation of a serverless.yml in the root of your application.

### Google Cloud Function

Google Cloud Platform, is a suite of cloud computing services that runs on the same infrastructure that Google uses internally for its end-user products. Cloud Functions are the Platform's FaaS offering.

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
