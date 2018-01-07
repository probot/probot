const EnhancedGitHubClient = require('../lib/github')
const nock = require('nock')

describe('EnhancedGitHubClient', () => {
  let github

  beforeEach(() => {
    const logger = {
      debug: jest.fn(),
      trace: jest.fn()
    }

    github = new EnhancedGitHubClient({ logger })
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
        .get('/repositories/123/issues?per_page=1&page=5').reply(200, issues[3], {
          link: ''
        })
    })

    it('returns an array of pages', async () => {
      const res = await github.paginate(github.issues.getForRepo({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }))
      expect(Array.isArray(res)).toBeTruthy()
      expect(res.length).toBe(5)
    })

    it('calls the callback every time', async () => {
      const spy = jest.fn(() => Promise.resolve())
      await github.paginate(github.issues.getForRepo({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }), spy)
      expect(spy).toHaveBeenCalledTimes(5)
    })
  })
})
