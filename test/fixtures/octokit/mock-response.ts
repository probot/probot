import { OctokitResponse } from '@octokit/types'

export const toGitHubResponse = <T = any>(data: T): OctokitResponse<T> => ({
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
  url: ''
})

export const createMockResponse = <T>(data: T): Promise<OctokitResponse<T>> =>
  Promise.resolve(toGitHubResponse(data))
