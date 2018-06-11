import * as Logger from 'bunyan'
import {GitHubAPI} from './'

export function addLogging (client: GitHubAPI, logger: Logger) {
  if (!logger) {
    return
  }

  client.hook.error('request', (error, options) => {
    const {method, url, headers, ...params} = options
    const msg = `GitHub request: ${method} ${url} - ${error.code} ${error.status}`
    logger.debug({params}, msg)
    throw error
  })
  client.hook.after('request', (result, options) => {
    const {method, url, headers, ...params} = options
    const msg = `GitHub request: ${method} ${url} - ${result.headers.status}`
    logger.debug({params}, msg)
  })
}

export { Logger }
