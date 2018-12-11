---
next: docs/logging.md
---

# Testing

We highly recommend working in the style of [test-driven development](http://agiledata.org/essays/tdd.html) when creating probot apps. It is frustrating to constantly create real GitHub events in order to test an app. Redelivering webhooks is possible and can be accessed in your app's [settings](https://github.com/settings/apps) page under the **Advanced** tab. We do offer the above documented `receive` method to help make this easier; however, by writing your tests first, you can avoid repeatedly recreating actual events from GitHub to check if your code is working.

For our testing examples, we use [jest](https://facebook.github.io/jest/), but there are other options that can perform similar operations. We also recommend using [nock](https://github.com/nock/nock), a tool for mocking HTTP requests, which is often crucial to testing in Probot, considering how much of Probot depends on GitHub's APIs. Here's an example of creating an app instance and using nock to test that we correctly hit the GitHub API:

```js
const nock = require('nock')
// Requiring our app implementation
const myProbotApp = require('..')
const { Probot } = require('probot')
// Requiring our fixtures
const payload = require('./fixtures/issues.opened')
const issueCreatedBody = { body: 'Thanks for opening this issue!' }

nock.disableNetConnect()

describe('My Probot app', () => {
  let probot

  beforeEach(() => {
    probot = new Probot({})
    // Load our app into probot
    const app = probot.load(myProbotApp)

    // just return a test token
    app.app = () => 'test'
  })

  test('creates a passing check', async () => {
    // Test that we correctly return a test token
    nock('https://api.github.com')
      .post('/app/installations/2/access_tokens')
      .reply(200, { token: 'test' })

    // Test that a commented is posted
    nock('https://api.github.com')
      .post('/repos/hiimbex/testing-things/issues/1/comments', (body) => {
        expect(body).toMatchObject(issueCreatedBody)
        return true
      })
      .reply(200)

    // Receive a webhook event
    await probot.receive({ name: 'issues', payload })
  })
})
```

A good testing example from [dco](https://github.com/probot/dco) can be found [here](https://github.com/probot/dco/blob/master/test/index.test.js), and another one from [markdownify](https://github.com/hiimbex/markdownify) can be found  [here](https://github.com/hiimbex/markdownify/blob/master/test/index.test.js).
