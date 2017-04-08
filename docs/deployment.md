## Deploy

Every plugin can either be deployed as a stand-alone bot, or combined with other plugins in one deployment.

> **Heads up!** Note that most [plugins in the @probot organization](https://github.com/search?q=topic%3Aprobot-plugin+org%3Aprobot&type=Repositories) have an official hosted integration that you can use for your open source project. Use the hosted instance if you don't want to deploy your own.

## Combining plugins

To deploy a bot that includes multiple plugins, create a new app that has the plugins listed as dependencies in `package.json`:

```json
{
  "name": "my-probot",
  "private": true,
  "dependencies": {
    "probot-autoresponder": "probot/autoresponder",
    "probot-configurer": "probot/configurer"
  },
  "scripts": {
    "start": "probot run"
 },
 "probot": {
   "plugins": [
     "probot-autoresponder",
     "probot-configurer"
   ]
 }
}
```

## Heroku

TODO: Generic docs for deploying a plugin to Heroku
