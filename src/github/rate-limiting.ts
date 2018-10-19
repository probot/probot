import Bottleneck from 'bottleneck'
import { GitHubAPI } from './'

export function addRateLimiting (octokit: GitHubAPI, limiter: Bottleneck) {
  if (!limiter) {
    limiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 1000
    })
  }

  const noop = () => Promise.resolve()
  octokit.hook.before('request', limiter.schedule.bind(limiter, noop))
}
