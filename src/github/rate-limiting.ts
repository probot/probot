module.exports = addRateLimiting

const Bottleneck = require('bottleneck')

function addRateLimiting (octokit, limiter = null) {
  if (!limiter) {
    limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1000 })
  }

  const noop = () => Promise.resolve()
  octokit.hook.before('request', limiter.schedule.bind(limiter, noop))
}
