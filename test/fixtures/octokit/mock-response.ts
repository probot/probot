import { Response } from '@octokit/rest'

export const toGitHubResponse = <T = any>(data: T): Response<T> => ({
  data,
  headers: {
    date: "",
    "x-ratelimit-limit": "",
    "x-ratelimit-remaining": "",
    "x-ratelimit-reset": "",
    "x-Octokit-request-id": "",
    "x-Octokit-media-type": "",
    link: "",
    "last-modified": "",
    etag: "",
    status: "",
  },
  status: 200,
  *[Symbol.iterator]() {
    yield 0
  }
})

export const createMockResponse = <T>(data: T): Promise<Response<T>> =>
  Promise.resolve(toGitHubResponse(data));
