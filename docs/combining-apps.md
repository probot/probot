---
next: docs/deployment.md
---

# Combining apps

To include multiple apps in your own Probot app, install them via `npm install` then list them in your `package.json`:

```json
{
  "name": "my-probot",
  "private": true,
  "dependencies": {
    "probot-autoresponder": "probot/autoresponder",
    "probot-settings": "probot/settings"
  },
  "scripts": {
    "start": "probot run"
 },
 "probot": {
   "apps": [
     "probot-autoresponder",
     "probot-settings"
   ]
 }
}
```
