import Bottleneck from 'bottleneck'
import nock from 'nock'
import { GitHubAPI, Options } from '../src/github'
import { logger } from '../src/logger'

describe('GitHubAPI', () => {
  let github: GitHubAPI

  beforeEach(() => {
    // Set a shorter limiter, otherwise tests are _slow_
    const limiter = new Bottleneck()

    const options: Options = {
      limiter,
      logger
    }

    github = GitHubAPI(options)
  })

  test('works without options', async () => {
    github = GitHubAPI()
    const user = { login: 'ohai' }

    nock('https://api.github.com').get('/user').reply(200, user)
    expect((await github.users.getAuthenticated({})).data).toEqual(user)
  })

  describe('paginate', () => {
    beforeEach(() => {
      // Prepare an array of issue objects
      const issues = new Array(5).fill(0).map((_, i, arr) => {
        return {
          id: i,
          number: i,
          title: `Issue number ${i}`
        }
      })

      nock('https://api.github.com')
        .get('/repos/JasonEtco/pizza/issues?per_page=1').reply(200, [issues[0]], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=2>; rel="next"'
        })
        .get('/repositories/123/issues?per_page=1&page=2').reply(200, [issues[1]], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=3>; rel="next"'
        })
        .get('/repositories/123/issues?per_page=1&page=3').reply(200, [issues[2]], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=4>; rel="next"'
        })
        .get('/repositories/123/issues?per_page=1&page=4').reply(200, [issues[3]], {
          link: '<https://api.github.com/repositories/123/issues?per_page=1&page=5>; rel="next"'
        })
        .get('/repositories/123/issues?per_page=1&page=5').reply(200, [issues[4]], {
          link: ''
        })
    })

    it('returns an array of pages', async () => {
      const spy = jest.fn()
      const res = await github.paginate(github.issues.listForRepo({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }), spy)
      expect(Array.isArray(res)).toBeTruthy()
      expect(res.length).toBe(5)
      expect(spy).toHaveBeenCalledTimes(5)
    })

    it('stops iterating if the done() function is called in the callback', async () => {
      const spy = jest.fn((response, done) => {
        if (response.data[0].id === 2) done()
      })
      const res = await github.paginate(github.issues.listForRepo({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }), spy)
      expect(res.length).toBe(3)
      expect(spy).toHaveBeenCalledTimes(3)
    })
  })
})
