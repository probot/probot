const EnhancedGitHubClient = require('../lib/github')
const nock = require('nock')
const Bottleneck = require('bottleneck')

describe('EnhancedGitHubClient', () => {
  let github

  beforeEach(() => {
    const logger = {
      debug: jest.fn(),
      trace: jest.fn()
    }

    // Set a shorter limiter, otherwise tests are _slow_
    const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1 })

    github = new EnhancedGitHubClient({ logger, limiter })
  })

  test('works without options', async () => {
    github = new EnhancedGitHubClient()
    const user = {login: 'ohai'}

    nock('https://api.github.com').get('/user').reply(200, user)
    expect((await github.users.get({})).data).toEqual(user)
  })

  describe('paginate', () => {
    beforeEach(() => {
      // Prepare an array of issue objects
      const issues = new Array(5).fill().map((_, i, arr) => {
        return {
          title: `Issue number ${i}`,
          id: i,
          number: i
        }
      })

      nock('https://api.github.com')
        .get('/repos/JasonEtco/pizza/issues?per_page=1').reply(200, issues[0], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=2>; rel="next"'
        })
        .get('/repositories/123/issues?per_page=1&page=2').reply(200, issues[1], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=3>; rel="next"'
        })
        .get('/repositories/123/issues?per_page=1&page=3').reply(200, issues[2], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=4>; rel="next"'
        })
        .get('/repositories/123/issues?per_page=1&page=4').reply(200, issues[3], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=5>; rel="next"'
        })
        .get('/repositories/123/issues?per_page=1&page=5').reply(200, issues[4], {
          link: ''
        })
    })

    it('returns an array of pages', async () => {
      const spy = jest.fn()
      const res = await github.paginate(github.issues.getForRepo({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }), spy)
      expect(Array.isArray(res)).toBeTruthy()
      expect(res.length).toBe(5)
      expect(spy).toHaveBeenCalledTimes(5)
    })

    it('stops iterating if the done() function is called in the callback', async () => {
      const spy = jest.fn((res, done) => {
        if (res.data.id === 2) done()
      })
      const res = await github.paginate(github.issues.getForRepo({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }), spy)
      expect(res.length).toBe(3)
      expect(spy).toHaveBeenCalledTimes(3)
    })
  })

  test('properly returns 404 responses', () => {
    nock('https://api.github.com').get('/user').reply(404, {message: 'nope'})
    return expect(github.users.get({})).rejects.toThrow('nope')
  })
})
