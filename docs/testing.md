# Testing

We highly recommend working in the style of [test-driven development](http://agiledata.org/essays/tdd.html) when creating Probot apps. It is frustrating to constantly create real GitHub events in order to test an app. Redelivering webhooks is possible and can be accessed in your app's [settings](https://github.com/settings/apps) page under the **Advanced** tab. We do offer the above documented `receive` method to help make this easier; however, by writing your tests first, you can avoid repeatedly recreating actual events from GitHub to check if your code is working.

## Dependencies
When you set up a new Probot application using `create-probot-app`, it will be bundled with [jest](https://facebook.github.com/github/jest/) to describe and run tests and [nock](https://github.com/nock/nock) as a HTTP server mocker.
As there is no shortage of testing libraries out there, feel free to swap these out for whatever you are more comfortable with if you want to.

## Main Concepts
Testing Probot applications consists of three main steps:
* Writing fixtures of the GitHub API responses
* Mocking the GitHub API Endpoints that your function will hit
* Triggering the event in the main application and ensuring that it behaves as expected

If you set up a new Probot application using `create-probot-app`, a test showing how to perform these actions will be included in the `tests/` directory.

The default application is set to reply to new issues with the following body:

```
Thanks for opening this issue!
```

Hence, the test, should make sure that, when the `issues.opened` event is received, the GitHub API is queried correctly.

To simulate events, we suggest you use fixtures containing the parts of the response you need. In the `tests/` directory you will find the `fixtures/` subdirectory, which containing an example fixture for the **issues.opened** event. You can create fixtures of the events you need by referencing the [GitHub API](https://developer.github.com/v3/).

You should limit these fixtures to contain only the data you need in your function in order to avoid having several JSON files containing more than 200 lines each for every test. The example test files are a good example of what fixture files should look like:

```json
{
  "action": "opened",
  "issue": {
    "number": 1,
    "user": {
      "login": "hiimbex"
    }
  },
  "repository": {
    "name": "testing-things",
    "owner": {
      "login": "hiimbex"
    }
  }
}
```

Once you created your fixture you can require it in your test file and proceed with writing the actual test.

If you want more information on how to declare test cases, please refer to the [jest documentation](https://jestjs.io/docs/en/getting-started.html).

Your main activity when writing tests for Probot Application will be mocking the GitHub API. This is generally done, if you are using `nock`, in the following way:

```js
nock('https://api.github.com')
  .post('URI', (body) => {
    expect(body).toMatchObject(object)
    return true
  })
  .reply(200)
```

The above example will prevent any POST request to the specified GitHub REST API uri to connect and will return a StatusCode 200. Moreover, it will check that the body of the request is what was expected. It is up to you whether you want to store the this body in a fixture, similarly to how you store responses, or in the test code.

The following example, included in the example `create-probot-app`, mocks the issue comments URI and checks that the body posted does contain the correct JSON object.

```js
nock('https://api.github.com')
  .post('/repos/hiimbex/testing-things/issues/1/comments', (body) => {
    expect(body).toMatchObject({ body: 'Thanks for opening this issue!' })
    return true
  })
  .reply(200)
```

If you want more information on how to use `nock` to mock the GitHub REST API, please refer to the [nock documentation](https://github.com/nock/nock#usage)

Once all the API endpoints called by your function have been mocked, you can simulate a web hook being delivered to Probot, by using `probot.receive`:

```js
await probot.receive({ name: eventName, payload: fixture })
```

Where `name` is the event’s name and `payload` is the web hook fixture we required earlier.

## Running tests

Once you completed your test set up you can run them in your command line environment using the built-in npm script:

```
npm run test
```

You can also watch your code in order to re-run the test suite every time new changes are saved by running:

```
npm run test:watch
```

If you would like to know more about configuring the environment in which the tests are ran, please refer to [jest's documentation](https://jestjs.io/docs/en/configuration).
## Advanced
### Testing Configuration Option
One of the [Best Practices](https://probot.github.io/docs/best-practices/) to keep in mind when developing Probot applications is that configurations should be stored in the target repository. Hence, in order to test that all configuration scenarios work, it is necessary to mock this configuration.

The configuration is obtained by Probot by making a request to the GitHub API. As we have already seen before, we can very easily mock this API and use fixtures as mock responses.

Probot receives files’ content from GitHub encoded using base64, if you want to use them in your tests you will need a fixture with the following schema:

```json
{
  "type": "file",
  "encoding": "base64",
  "name": "config.yml",
  "path": "config.yml",
  "content": ""
}
```

Where `content` is the base64 encoded content of your configuration file. In your test you will want to mock (using `nock` or any other HTTP requests mocker) a GET request to the following URI of the GitHub API:

```
/repos/:owner/:repo/contents/:path
```

Where `:path` is the path to your configuration file (usually `.github/config.yml`).

This mock request will have to return Status Code 200 and the fixture above if a configuration is present, Status Code 404 if a file was not found in the specified `:path`. 
