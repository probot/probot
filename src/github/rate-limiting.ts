const Bottleneck = require('bottleneck')

export const addRateLimiting = function (octokit, limiter) {
  if (!limiter) {
    limiter = new Bottleneck(1, 1000)
  }

  const noop = () => Promise.resolve()
  octokit.hook.before('request', limiter.schedule.bind(limiter, noop))
}
