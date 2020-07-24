import Bottleneck from 'bottleneck'
import { NextFunction, Request, Response } from 'express'
import request = require('supertest')
import { Application, createProbot, Probot } from '../src'
import { ProbotOctokit } from '../src/github/octokit'

import path = require('path')

// tslint:disable:no-empty
describe('Probot', () => {
  let probot: Probot
  let event: {
    id: string
    name: string
    payload: any
  }

  beforeEach(() => {
    probot = createProbot({ githubToken: 'faketoken' })

    event = {
      id: '0',
      name: 'push',
      payload: require('./fixtures/webhook/push')
    }
  })

  it('constructor', () => {
    // probot with token. Should not throw
    createProbot({ githubToken: 'faketoken' })
    // probot with id/cert
    createProbot({ id: 1234, cert: 'xxxx' })
  })

  describe('run', () => {

    let env: NodeJS.ProcessEnv

    beforeAll(() => {
      env = { ...process.env }
      process.env.APP_ID = '1'
      process.env.PRIVATE_KEY_PATH = path.join(__dirname, 'test-private-key.pem')
      process.env.WEBHOOK_PROXY_URL = 'https://smee.io/EfHXC9BFfGAxbM6J'
    })

    afterAll(() => {
      process.env = env
    })

    it('runs with a function as argument', async () => {
      process.env.PORT = '3003'
      let initialized = false
      probot = await Probot.run((app) => {
        initialized = true
      })
      expect(probot.options).toMatchSnapshot()
      expect(initialized).toBeTruthy()
      probot.httpServer!.close()
    })

    it('runs with an array of strings', async () => {
      probot = await Probot.run(['run', 'file.js'])
      expect(probot.options).toMatchSnapshot()
      probot.httpServer!.close()
    })

    it('runs without config and loads the setup app', async () => {
      let initialized = false
      delete process.env.PRIVATE_KEY_PATH
      probot = await Probot.run((app) => {
        initialized = true
      })
      expect(probot.options).toMatchSnapshot()
      expect(initialized).toBeFalsy()
      probot.httpServer!.close()
    })
  })

  describe('webhook delivery', () => {
    it('forwards webhooks to the app', async () => {
      const app = probot.load(() => {})
      app.receive = jest.fn()
      await probot.webhook.receive(event)
      expect(app.receive).toHaveBeenCalledWith(event)
    })

    it('responds with the correct error if webhook secret does not match', async () => {
      probot.logger.error = jest.fn()
      probot.webhook.on('push', () => { throw new Error('X-Hub-Signature does not match blob signature') })

      try {
        await probot.webhook.receive(event)
      } catch (e) {
        expect((probot.logger.error as jest.Mock).mock.calls[0]).toMatchSnapshot()
      }
    })

    it('responds with the correct error if webhook secret is not found', async () => {
      probot.logger.error = jest.fn()
      probot.webhook.on('push', () => { throw new Error('No X-Hub-Signature found on request') })

      try {
        await probot.webhook.receive(event)
      } catch (e) {
        expect((probot.logger.error as jest.Mock).mock.calls[0]).toMatchSnapshot()
      }
    })

    it('responds with the correct error if webhook secret is wrong', async () => {
      probot.logger.error = jest.fn()
      probot.webhook.on('push', () => { throw new Error('webhooks:receiver ignored: POST / due to missing headers: x-hub-signature') })

      try {
        await probot.webhook.receive(event)
      } catch (e) {
        expect((probot.logger.error as jest.Mock).mock.calls[0]).toMatchSnapshot()
      }
    })

    it('responds with the correct error if the PEM file is missing', async () => {
      probot.logger.error = jest.fn()
      probot.webhook.on('*', () => { throw new Error('error:0906D06C:PEM routines:PEM_read_bio:no start line') })

      try {
        await probot.webhook.receive(event)
      } catch (e) {
        expect((probot.logger.error as jest.Mock).mock.calls[0]).toMatchSnapshot()
      }
    })

    it('responds with the correct error if the jwt could not be decoded', async () => {
      probot.logger.error = jest.fn()
      probot.webhook.on('*', () => { throw new Error('{"message":"A JSON web token could not be decoded","documentation_url":"https://developer.github.com/v3"}') })

      try {
        await probot.webhook.receive(event)
      } catch (e) {
        expect((probot.logger.error as jest.Mock).mock.calls[0]).toMatchSnapshot()
      }
    })
  })

  describe('server', () => {
    it('prefixes paths with route name', () => {
      probot.load(app => {
        const route = app.route('/my-app')
        route.get('/foo', (req, res) => res.end('foo'))
      })

      return request(probot.server).get('/my-app/foo').expect(200, 'foo')
    })

    it('allows routes with no path', () => {
      probot.load(app => {
        const route = app.route()
        route.get('/foo', (req, res) => res.end('foo'))
      })

      return request(probot.server).get('/foo').expect(200, 'foo')
    })

    it('allows you to overwrite the root path', () => {
      probot.load(app => {
        const route = app.route()
        route.get('/', (req, res) => res.end('foo'))
      })

      return request(probot.server).get('/').expect(200, 'foo')
    })

    it('isolates apps from affecting eachother', async () => {
      ['foo', 'bar'].forEach(name => {
        probot.load(app => {
          const route = app.route('/' + name)

          route.use((req, res, next) => {
            res.append('X-Test', name)
            next()
          })

          route.get('/hello', (req, res) => res.end(name))
        })
      })

      await request(probot.server).get('/foo/hello')
        .expect(200, 'foo')
        .expect('X-Test', 'foo')

      await request(probot.server).get('/bar/hello')
        .expect(200, 'bar')
        .expect('X-Test', 'bar')
    })

    it('allows users to configure webhook paths', async () => {
      probot = createProbot({ webhookPath: '/webhook', githubToken: 'faketoken' })
      // Error handler to avoid printing logs
      // tslint:disable-next-line handle-callback-err
      probot.server.use((err: any, req: Request, res: Response, next: NextFunction) => { })

      probot.load(app => {
        const route = app.route()
        route.get('/webhook', (req, res) => res.end('get-webhook'))
        route.post('/webhook', (req, res) => res.end('post-webhook'))
      })

      // GET requests should succeed
      await request(probot.server).get('/webhook')
        .expect(200, 'get-webhook')

      // POST requests should fail b/c webhook path has precedence
      await request(probot.server).post('/webhook')
        .expect(400)
    })

    it('defaults webhook path to `/`', async () => {
      // Error handler to avoid printing logs
      // tslint:disable-next-line handle-callback-err
      probot.server.use((err: any, req: Request, res: Response, next: NextFunction) => { })

      // POST requests to `/` should 400 b/c webhook signature will fail
      await request(probot.server).post('/')
        .expect(400)
    })

    it('responds with 500 on error', async () => {
      probot.server.get('/boom', () => {
        throw new Error('boom')
      })

      await request(probot.server).get('/boom').expect(500)
    })

    it('responds with 500 on async error', async () => {
      probot.server.get('/boom', () => {
        return Promise.reject(new Error('boom'))
      })

      await request(probot.server).get('/boom').expect(500)
    })
  })

  describe('receive', () => {
    it('forwards events to each app', async () => {
      const spy = jest.fn()
      const app = probot.load(appl => appl.on('push', spy))
      app.auth = jest.fn().mockReturnValue(Promise.resolve({}))

      await probot.receive(event)

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('ghe support', () => {
    beforeEach(() => {
      process.env.GHE_HOST = 'notreallygithub.com'
    })

    afterEach(() => {
      delete process.env.GHE_HOST
    })

    it('requests from the correct API URL', async () => {
      const appFn = async (appl: Application) => {
        const github = await appl.auth()
        expect(github.request.endpoint.DEFAULTS.baseUrl).toEqual('https://notreallygithub.com/api/v3')
      }

      createProbot({}).load(appFn)
    })

    it('throws if the GHE host includes a protocol', async () => {
      process.env.GHE_HOST = 'https://notreallygithub.com'

      try {
        createProbot({ id: 1234, cert: 'xxxx' })
      } catch (e) {
        expect(e).toMatchSnapshot()
      }
    })
  })

  describe('ghe support with http', () => {
    beforeEach(() => {
      process.env.GHE_HOST = 'notreallygithub.com'
      process.env.GHE_PROTOCOL = 'http'
    })

    afterEach(() => {
      delete process.env.GHE_HOST
      delete process.env.GHE_PROTOCOL
    })

    it('requests from the correct API URL', async () => {
      const appFn = async (appl: Application) => {
        const github = await appl.auth()
        expect(github.request.endpoint.DEFAULTS.baseUrl).toEqual('http://notreallygithub.com/api/v3')
      }

      createProbot({}).load(appFn)
    })

    it('throws if the GHE host includes a protocol', async () => {
      process.env.GHE_HOST = 'http://notreallygithub.com'

      try {
        createProbot({ id: 1234, cert: 'xxxx' })
      } catch (e) {
        expect(e).toMatchSnapshot()
      }
    })
  })

  describe('process.env.REDIS_URL', () => {
    beforeEach(() => {
      process.env.REDIS_URL = 'test'
    })

    afterEach(() => {
      delete process.env.REDIS_URL
    })

    it('sets throttleOptions', async () => {
      probot = createProbot({ webhookPath: '/webhook', githubToken: 'faketoken' })

      expect(probot.throttleOptions.Bottleneck).toBe(Bottleneck)
      expect(probot.throttleOptions.connection).toBeInstanceOf(Bottleneck.IORedisConnection)
    })
  })

  describe('redis configuration object', () => {
    it('sets throttleOptions', async () => {
      const redisConfig = {
        host: 'test'
      }
      probot = createProbot({ webhookPath: '/webhook', githubToken: 'faketoken', redisConfig })

      expect(probot.throttleOptions.Bottleneck).toBe(Bottleneck)
      expect(probot.throttleOptions.connection).toBeInstanceOf(Bottleneck.IORedisConnection)
    })
  })

  describe('custom Octokit constructor', () => {
    beforeEach(() => {
      const MyOctokit = ProbotOctokit.plugin(function fooBar () {
        return {
          foo: 'bar'
        }
      })

      probot = createProbot({
        Octokit: MyOctokit,
        githubToken: 'faketoken'
      })
    })

    it('is propagated to Octokit', async () => {
      const app = probot.load(() => {})
      const octokit: InstanceType<typeof ProbotOctokit> = await app.auth()
      expect(octokit.foo).toBe('bar')
    })
  })

  describe('start', () => {

    beforeEach(() => {
      process.exit = jest.fn() as any // we dont want to terminate the test
    })
    it('should expect the correct error if port already in use', (next) => {
      expect.assertions(2)

      // block port 3001
      const http = require('http')
      const blockade = http.createServer().listen(3001, () => {

        const testApp = createProbot({ port: 3001 })
        testApp.logger.error = jest.fn()

        const server = testApp.start().addListener('error', () => {
          expect(testApp.logger.error).toHaveBeenCalledWith('Port 3001 is already in use. You can define the PORT environment variable to use a different port.')
          expect(process.exit).toHaveBeenCalledWith(1)
          server.close(() => blockade.close(() => next()))
        })
      })
    })

    it('should listen to port when not in use', (next) => {
      expect.assertions(1)
      const testApp = createProbot({ port: 3001, webhookProxy: undefined })
      testApp.logger.info = jest.fn()
      const server = testApp.start().on('listening', () => {
        expect(testApp.logger.info).toHaveBeenCalledWith('Listening on http://localhost:3001')
        server.close(() => next())
      })
    })
  })

  describe('start', () => {

    beforeEach(() => {
      process.exit = jest.fn() as any // we dont want to terminate the test
    })
    it('should expect the correct error if port already in use', (next) => {
      expect.assertions(2)

      // block port 3001
      const http = require('http')
      const blockade = http.createServer().listen(3001, () => {

        const testApp = createProbot({ port: 3001 })
        testApp.logger.error = jest.fn()

        const server = testApp.start().addListener('error', () => {
          expect(testApp.logger.error).toHaveBeenCalledWith('Port 3001 is already in use. You can define the PORT environment variable to use a different port.')
          expect(process.exit).toHaveBeenCalledWith(1)
          server.close(() => blockade.close(() => next()))
        })
      })
    })

    it('should listen to port when not in use', (next) => {
      expect.assertions(1)
      const testApp = createProbot({ port: 3001, webhookProxy: undefined })
      testApp.logger.info = jest.fn()
      const server = testApp.start().on('listening', () => {
        expect(testApp.logger.info).toHaveBeenCalledWith('Listening on http://localhost:3001')
        server.close(() => next())
      })
    })
  })
})
