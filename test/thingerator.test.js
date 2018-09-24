const { Thingerator } = require('../src/thingerator')
const nock = require('nock')
const package = require('../package.json')
const response = require('./fixtures/setup/response.json')

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
    test('creates an app from a code', async () => {
      nock('https://api.github.com')
        .post('/app-manifests/123abc/conversions')
        .reply(200, response)

      const createdApp = await setup.createAppFromCode('123abc')
      expect(createdApp).toEqual('https://github.com/apps/testerino0000000')
      // expect dotenv to be called with id, webhook_secret, pem
    })
  })

  describe('getManifest', () => {
    test('creates an app from a code', () => {
      // checks that getManifest returns a JSON.stringified manifest
      expect(setup.getManifest(package, 'localhost://3000')).toEqual('{"description":"🤖 A framework for building GitHub Apps to automate and improve your workflow","hook_attributes":{"url":"localhost://3000/"},"name":"probot","public":"true","redirect_url":"localhost://3000/probot/setup","url":"https://probot.github.io"}')
    })
  })
})
