const { GitHubAPI } = require('../../src/github')
const nock = require('nock')
const Bottleneck = require('bottleneck')

describe('github/graphql', () => {
  let github

  // Expect there are no more pending nock requests
  beforeEach(async () => nock.cleanAll())
  afterEach(() => expect(nock.pendingMocks()).toEqual([]))

  beforeEach(() => {
    const logger = {
      debug: jest.fn(),
      trace: jest.fn()
    }

    // Set a shorter limiter, otherwise tests are _slow_
    const limiter = new Bottleneck()

    github = new GitHubAPI({ logger, limiter })
  })

  describe('query', () => {
    const query = 'query { viewer { login } }'
    let data

    test('makes a graphql query', async () => {
      data = { viewer: { login: 'bkeepers' } }

      nock('https://api.github.com', {
        reqheaders: { 'content-type': 'application/json' }
      }).post('/graphql', {query})
        .reply(200, { data })

      expect(await github.query(query)).toEqual(data)
    })

    test('makes a graphql query with variables', async () => {
      const variables = {owner: 'probot', repo: 'test'}

      nock('https://api.github.com', {
        reqheaders: { 'content-type': 'application/json' }
      }).post('/graphql', {query, variables})
        .reply(200, { data })

      expect(await github.query(query, variables)).toEqual(data)
    })

    test('uses authentication', async () => {
      github.authenticate({type: 'token', token: 'testing'})

      nock('https://api.github.com', {
        reqheaders: { authorization: 'token testing' }
      }).post('/graphql', {query})
        .reply(200, { data })

      await github.query(query)
    })

    test('allows custom headers', async () => {
      nock('https://api.github.com', {
        reqheaders: { 'foo': 'bar' }
      }).post('/graphql', {query})
        .reply(200, { data })

      await github.query(query, undefined, {foo: 'bar'})
    })

    test('raises errors', async () => {
      const response = {'data': null, 'errors': [{'message': 'Unexpected end of document'}]}

      nock('https://api.github.com').post('/graphql', {query})
        .reply(200, response)

      await expect(github.query(query)).rejects.toThrow('Unexpected end of document')
    })
  })
})
