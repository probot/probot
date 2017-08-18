---
next: docs/pagination.md
---

# Testing

We highly recommend working in the style of [test-driven development](http://agiledata.org/essays/tdd.html) when creating probot plugins. It frustrating to constantly create real GitHub events in order to test a plugin. Redelivering webhooks is possible and can be accessed in your app's [settings](https://github.com/settings/apps) page under the **Advanced** tab. We do offer the above documented `simulate` method to help make this easier; however, by writing your tests first, you can avoid repeatedly recreating actual events from GitHub to check if your code is working.

For our testing examples, we use [mocha](https://mochajs.org/) and [expect](https://github.com/mjackson/expect), but there are other options that can perform similar operations. Here's an example of creating a robot instance and mocking out the GitHub API:

```js
// Requiring our testing framework
const expect = require('expect');
// Requiring probot allows us to mock out a robot instance
const {createRobot} = require('probot');
// Create a fixtures folder in your test folder
// Then put any larger testing payloads in there
const payload = require('./fixtures/payload');

describe('your-plugin', () => {
  let robot;
  let github;

  beforeEach(() => {
    // Here we create a robot instance
    robot = createRobot();
    // Here we initialize the plugin on the robot instance
    plugin(robot);
    // This is an easy way to mock out the GitHub API
    github = {
      issues: {
        createComment: expect.createSpy().andReturn(Promise.resolve({
          // Whatever the GitHub API should return
        }))
      }
    }
    // Passes the mocked out GitHub API into out robot instance
    robot.auth = () => Promise.resolve(github);
  });

  describe('your functionality', () => {
    it('performs an action', async () => {
      // Simulates delivery of a payload
      await robot.receive(payload);
      // This test would pass if in your main code you called `context.github.issues.createComment`
      expect(github.issues.createComment).toHaveBeenCalled();
    });
  });
});
```

A good testing example from [update-docs](github.com/behaviorbot/update-docs) can be found [here](https://github.com/behaviorbot/update-docs/blob/master/test/index.js), and another one from [owners](github.com/probot/owners) can be found  [here](https://github.com/probot/owners/blob/master/test/owner-notifier.js).
