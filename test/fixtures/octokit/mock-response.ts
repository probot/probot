import { Octokit } from '@octokit/rest'

export const toGitHubResponse = <T = any>(data: T): Octokit.Response<T> => ({
  data,
  headers: {
    date: '',
    etag: '',
    'last-modified': '',
    link: '',
    status: '',
    'x-Octokit-media-type': '',
    'x-Octokit-request-id': '',
    'x-ratelimit-limit': '',
    'x-ratelimit-remaining': '',
    'x-ratelimit-reset': ''
  },
  status: 200,
  *[Symbol.iterator] () {
    yield 0
  }
})

export const createMockResponse = <T>(data: T): Promise<Octokit.Response<T>> =>
  Promise.resolve(toGitHubResponse(data))
