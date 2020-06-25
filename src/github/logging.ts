import { Octokit } from '@octokit/rest'
import Logger from 'bunyan'

export function addLogging (client: Octokit, logger: Logger) {
  if (!logger) {
    return
  }

  client.hook.error('request', (error, options) => {
    const { method, url, headers, ...params } = options
    const msg = `GitHub request: ${method} ${url} - ${error.status}`
    logger.debug({ params }, msg)
    throw error
  })
  client.hook.after('request', (result, options) => {
    const { method, url, headers, ...params } = options
    const msg = `GitHub request: ${method} ${url} - ${result.headers.status}`
    logger.debug({ params }, msg)
  })
}

export { Logger }
