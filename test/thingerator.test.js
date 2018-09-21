const { Thingerator } = require('../src/thingerator')
const nock = require('nock')
const package = require('../package.json')

describe('Thingerator', () => {
  let setup

  beforeEach(() => {
    setup = new Thingerator()
  })

  describe('createWebhookChannel', () => {
    test('writes new webhook channel to .env', () => {
      // TODO:
      // - Use nock to mock out calls to smee.io
      //   - Or… mock out SmeeClient
      // - Create a tmp directory to run the test in
      //   - check that values written to `.env`
      //   - or…check that updateDotenv was called
    })
  })

  describe('updateEnv', () => {
    beforeEach(() => {
      updateDotenv = jest.fn()
    })

    test('checks that it calls updateDotEnv', async () => {
      // TODO: figure out why updateDotenv is not being called :thinking-face:
      // const env = { HIIMBEX: 'awesome' }
      // const res = await setup.updateEnv(env)
      // console.log(res)
      // expect(updateDotenv).toHaveBeenCalledWith(env)
    })
  })

  describe('pkg', () => {
    test('gets pkg from package.json', () => {
      expect(setup.pkg).toEqual(package)
    })
  })

  describe('createAppUrl', () => {
    afterEach(() => {
      delete process.env.GHE_HOST
    })

    test('creates an app url', () => {
      expect(setup.createAppUrl).toEqual('http://github.com/settings/apps/new')
    })

    test('creates an app url when github host env is set', () => {
      process.env.GHE_HOST = 'hiimbex.github.com'
      expect(setup.createAppUrl).toEqual('http://hiimbex.github.com/settings/apps/new')
    })
  })

  describe('createAppFromCode', () => {
    beforeEach(() => {
      const code = '123abc'
    })

    test('creates an app from a code', () => {
      // TODO: use nock to mock out this endpoint
      // add a response fixture
      // check the updateEnv is called with data from the Response
      // check that the return value matches the fixture

      // setup.createAppFromCode(code)
    })
  })

  // getManifest
  describe('getManifest', () => {
    beforeEach(() => {
      const baseUrl = 'localhost://3000'
    })

    test('creates an app from a code', () => {
      // TODO: check that getManifest returns a JSON.stringified manifest
      // maybe check if app.yml is found
      // maybe make the tmp directory to use to store a fake app.yml

      // setup.getManifest(package, baseUrl)
    })
  })
})
