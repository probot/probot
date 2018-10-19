import Bottleneck from 'bottleneck'
import nock from 'nock'
import { GitHubAPI, Options } from '../../src/github'
import { logger } from '../../src/logger'

describe('github/graphql', () => {
  let github: GitHubAPI

  // Expect there are no more pending nock requests
  beforeEach(async () => nock.cleanAll())
  afterEach(() => expect(nock.pendingMocks()).toEqual([]))

  beforeEach(() => {
    // Set a shorter limiter, otherwise tests are _slow_
    const limiter = new Bottleneck()

    const options: Options = {
      limiter,
      logger
    }

    github = GitHubAPI(options)
  })

  describe('query', () => {
    const query = 'query { viewer { login } }'
    let data: any

    test('makes a graphql query', async () => {
      data = { viewer: { login: 'bkeepers' } }

      nock('https://api.github.com', {
        reqheaders: { 'content-type': 'application/json' }
      }).post('/graphql', { query })
        .reply(200, { data })

      expect(await github.query(query)).toEqual(data)
    })

    test('makes a graphql query with variables', async () => {
      const variables = { owner: 'probot', repo: 'test' }

      nock('https://api.github.com', {
        reqheaders: { 'content-type': 'application/json' }
      }).post('/graphql', { query, variables })
        .reply(200, { data })

      expect(await github.query(query, variables)).toEqual(data)
    })

    test('uses authentication', async () => {
      github.authenticate({ type: 'token', token: 'testing' })

      nock('https://api.github.com', {
        reqheaders: { authorization: 'token testing' }
      }).post('/graphql', { query })
        .reply(200, { data })

      await github.query(query)
    })

    test('allows custom headers', async () => {
      nock('https://api.github.com', {
        reqheaders: { 'foo': 'bar' }
      }).post('/graphql', { query })
        .reply(200, { data })

      await github.query(query, undefined, { foo: 'bar' })
    })

    test('raises errors', async () => {
      const response = { 'data': null, 'errors': [{ 'message': 'Unexpected end of document' }] }

      nock('https://api.github.com').post('/graphql', { query })
        .reply(200, response)

      await expect(github.query(query)).rejects.toThrow('Unexpected end of document')
    })
  })

  describe('ghe support', () => {
    const query = 'query { viewer { login } }'
    let data

    beforeEach(() => {
      process.env.GHE_HOST = 'notreallygithub.com'
    })

    afterEach(() => {
      delete process.env.GHE_HOST
    })

    test('makes a graphql query', async () => {
      data = { viewer: { login: 'bkeepers' } }

      nock('https://notreallygithub.com', {
        reqheaders: { 'content-type': 'application/json' }
      }).post('/api/graphql', { query })
        .reply(200, { data })

      expect(await github.query(query)).toEqual(data)
    })
  })
})
