---
next: docs/logging.md
---

# Testing

We highly recommend working in the style of [test-driven development](http://agiledata.org/essays/tdd.html) when creating probot apps. It is frustrating to constantly create real GitHub events in order to test an app. Redelivering webhooks is possible and can be accessed in your app's [settings](https://github.com/settings/apps) page under the **Advanced** tab. We do offer the above documented `simulate` method to help make this easier; however, by writing your tests first, you can avoid repeatedly recreating actual events from GitHub to check if your code is working.

For our testing examples, we use [jest](https://facebook.github.io/jest/), but there are other options that can perform similar operations. Here's an example of creating an app instance and mocking out the GitHub API:

```js
// Requiring probot allows us to initialize an application
const {Application} = require('probot')
// Requiring our app implementation
const plugin = require('')
// Create a fixtures folder in your test folder
// Then put any larger testing payloads in there
const payload = require('./fixtures/payload')

describe('your-app', () => {
  let app
  let github

  beforeEach(() => {
    // Here we create an `Application` instance
    app = new Application()
    // Here we initialize the app
    app.load(plugin)
    // This is an easy way to mock out the GitHub API
    github = {
      issues: {
        createComment: jest.fn().mockReturnValue(Promise.resolve({
          // Whatever the GitHub API should return
        }))
      }
    }
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
  })

  describe('your functionality', () => {
    it('performs an action', async () => {
      // Simulates delivery of a payload
      // payload.event is the X-GitHub-Event header sent by GitHub (for example "push")
      // payload.payload is the actual payload body
      await app.receive(payload)
      // This test would pass if in your main code you called `context.github.issues.createComment`
      expect(github.issues.createComment).toHaveBeenCalled()
    })
  })
})
```

A good testing example from [update-docs](https://github.com/behaviorbot/update-docs) can be found [here](https://github.com/behaviorbot/update-docs/blob/master/test/index.js), and another one from [owners](https://github.com/probot/owners) can be found  [here](https://github.com/probot/owners/blob/master/test/owner-notifier.js).
