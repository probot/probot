import nock from 'nock'
import { GitHubAPI, Options, ProbotOctokit } from '../src/github'
import { logger } from '../src/logger'

describe('GitHubAPI', () => {
  let github: GitHubAPI

  beforeEach(() => {
    const options: Options = {
      Octokit: ProbotOctokit,
      logger,
      retry: {
        // disable retries to test error states
        enabled: false
      },
      throttle: {
        // disable throttling, otherwise tests are _slow_
        enabled: false
      }
    }

    github = GitHubAPI(options)
  })

  test('works without options', async () => {
    github = GitHubAPI()
    const user = { login: 'ohai' }

    nock('https://api.github.com').get('/user').reply(200, user)
    expect((await github.users.getAuthenticated({})).data).toEqual(user)
  })

  test('logs request errors', async () => {
    nock('https://api.github.com')
      .get('/')
      .reply(500, {})

    try {
      await github.request('/')
      throw new Error('should throw')
    } catch (error) {
      expect(error.status).toBe(500)
    }
  })

  describe('paginate', () => {
    // Prepare an array of issue objects
    const issues = new Array(5).fill(0).map((_, i, arr) => {
      return {
        id: i,
        number: i,
        title: `Issue number ${i}`
      }
    })

    beforeEach(() => {
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
      const res = await github.paginate(github.issues.listForRepo.endpoint.merge({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }), spy)
      expect(Array.isArray(res)).toBeTruthy()
      expect(res.length).toBe(5)
      expect(spy).toHaveBeenCalledTimes(5)
    })

    it('stops iterating if the done() function is called in the callback', async () => {
      const spy = jest.fn((response, done) => {
        if (response.data[0].id === 2) done()
      }) as any
      const res = await github.paginate(github.issues.listForRepo.endpoint.merge({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }), spy)
      expect(res.length).toBe(3)
      expect(spy).toHaveBeenCalledTimes(3)
    })

    it('maps the responses to data by default', async () => {
      const res = await github.paginate(github.issues.listForRepo.endpoint.merge({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }))
      expect(res).toEqual(issues)
    })

    describe('deprecations', () => {
      let consoleWarnSpy: any
      beforeEach(() => {
        consoleWarnSpy = jest.spyOn(global.console, 'warn').mockImplementation(() => null)
      })
      afterEach(() => {
        consoleWarnSpy.mockReset()
      })

      it('github.paginate(promise)', async () => {
        const res = await github.paginate(github.issues.listForRepo({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }))
        expect(Array.isArray(res)).toBeTruthy()
        expect(res.length).toBe(5)
        expect(consoleWarnSpy).toHaveBeenCalled()
      })

      it('maps to each response by default when using deprecated syntax', async () => {
        const res = await github.paginate(github.issues.listForRepo({ owner: 'JasonEtco', repo: 'pizza', per_page: 1 }))
        expect(Array.isArray(res)).toBeTruthy()
        expect(res.length).toBe(5)
        expect('headers' in res[0]).toBeTruthy()
        expect(consoleWarnSpy).toHaveBeenCalled()
      })
    })
  })
})
