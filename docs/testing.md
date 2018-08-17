---
next: docs/logging.md
---

# Testing

We highly recommend working in the style of [test-driven development](http://agiledata.org/essays/tdd.html) when creating probot apps. It is frustrating to constantly create real GitHub events in order to test an app. Redelivering webhooks is possible and can be accessed in your app's [settings](https://github.com/settings/apps) page under the **Advanced** tab. We do offer the above documented `simulate` method to help make this easier; however, by writing your tests first, you can avoid repeatedly recreating actual events from GitHub to check if your code is working.

For our testing examples, we use [jest](https://facebook.github.io/jest/), but there are other options that can perform similar operations. Here's an example of creating an app instance and mocking out the GitHub API:

```js
const { Application } = require('probot')
// Requiring our app implementation
const myProbotApp = require('..')

const issuesOpenedPayload = require('./fixtures/issues.opened.json')

describe('My Probot app', () => {
  let app, github

  beforeEach(() => {
    app = new Application()
    // Initialize the app based on the code from index.js
    app.load(myProbotApp)
    // This is an easy way to mock out the GitHub API
    github = {
      issues: {
        createComment: jest.fn().mockReturnValue(Promise.resolve({}))
      }
    }
    // Passes the mocked out GitHub API into out app instance
    app.auth = () => Promise.resolve(github)
  })

  test('creates a comment when an issue is opened', async () => {
    // Simulates delivery of an issues.opened webhook
    await app.receive({
      event: 'issues.opened',
      payload: issuesOpenedPayload
    })

    // This test passes if the code in your index.js file calls `context.github.issues.createComment`
    expect(github.issues.createComment).toHaveBeenCalled()
  })
})
```

A good testing example from [update-docs](https://github.com/behaviorbot/update-docs) can be found [here](https://github.com/behaviorbot/update-docs/blob/master/test/index.js), and another one from [owners](https://github.com/probot/owners) can be found  [here](https://github.com/probot/owners/blob/master/test/owner-notifier.js).
