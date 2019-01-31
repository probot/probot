import nock from 'nock'
import { GitHubAPI, Options, ProbotOctokit } from '../../src/github'
import { logger } from '../../src/logger'

describe('github/graphql', () => {
  let github: GitHubAPI

  // Expect there are no more pending nock requests
  beforeEach(async () => nock.cleanAll())
  afterEach(() => expect(nock.pendingMocks()).toEqual([]))

  beforeEach(() => {
    const options: Options = {
      Octokit: ProbotOctokit,
      auth: 'token testing',
      logger
    }

    github = GitHubAPI(options)
  })

  describe('query', () => {
    const query = 'query { viewer { login } }'
    let data: any

    test('makes an authenticated graphql query', async () => {
      data = { viewer: { login: 'bkeepers' } }

      nock('https://api.github.com', {
        reqheaders: {
          authorization: 'token testing',
          'content-type': 'application/json; charset=utf-8'
        }
      })
        .post('/graphql', { query })
        .reply(200, { data })

      expect(await github.graphql(query)).toEqual(data)
    })

    test('makes a graphql query with variables', async () => {
      const variables = { owner: 'probot', repo: 'test' }

      nock('https://api.github.com').post('/graphql', { query, variables })
        .reply(200, { data })

      expect(await github.graphql(query, variables)).toEqual(data)
    })

    test('allows custom headers', async () => {
      nock('https://api.github.com', {
        reqheaders: { foo: 'bar' }
      }).post('/graphql', { query })
        .reply(200, { data })

      await github.graphql(query, { headers: { foo: 'bar' } })
    })

    test('raises errors', async () => {
      const response = { 'data': null, 'errors': [{ 'message': 'Unexpected end of document' }] }

      nock('https://api.github.com').post('/graphql', { query })
        .reply(200, response)

      let thrownError
      try {
        await github.graphql(query)
      } catch (err) {
        thrownError = err
      }

      expect(thrownError).not.toBeUndefined()
      expect(thrownError.name).toEqual('GraphqlError')
      expect(thrownError.toString()).toContain('Unexpected end of document')
      expect(thrownError.request.query).toEqual(query)
      expect(thrownError.errors).toEqual(response.errors)
    })
  })

  describe('ghe support', () => {
    const query = 'query { viewer { login } }'
    let data

    beforeEach(() => {
      process.env.GHE_HOST = 'notreallygithub.com'

      const options: Options = {
        Octokit: ProbotOctokit,
        logger
      }

      github = GitHubAPI(options)
    })

    afterEach(() => {
      delete process.env.GHE_HOST
    })

    test('makes a graphql query', async () => {
      data = { viewer: { login: 'bkeepers' } }

      nock('https://notreallygithub.com', {
        reqheaders: { 'content-type': 'application/json; charset=utf-8' }
      }).post('/api/graphql', { query })
        .reply(200, { data })

      expect(await github.graphql(query)).toEqual(data)
    })
  })

  describe('deprecations', () => {
    const query = 'query { viewer { login } }'
    let data: any
    let consoleWarnSpy: any
    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(global.console, 'warn').mockImplementation(() => null)
    })
    afterEach(() => {
      consoleWarnSpy.mockReset()
    })

    test('github.query', async () => {
      data = { viewer: { login: 'bkeepers' } }

      nock('https://api.github.com', {
        reqheaders: { 'content-type': 'application/json; charset=utf-8' }
      })
        .post('/graphql', { query })
        .reply(200, { data })

      expect(await github.query(query)).toEqual(data)
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    test('headers as 3rd argument', async () => {
      nock('https://api.github.com', {
        reqheaders: { 'foo': 'bar' }
      }).post('/graphql', { query })
        .reply(200, { data })

      await github.graphql(query, undefined, { foo: 'bar' })
    })
  })
})
