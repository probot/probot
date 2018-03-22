import * as Logger from 'bunyan'
import {OctokitWithPagination} from './'

export const addLogging = function (octokit: OctokitWithPagination, logger: Logger) {
  octokit.hook.error('request', (error, options) => {
    const {method, url, headers, ...params} = options
    const msg = `GitHub request: ${method} ${url} - ${error.code} ${error.status}`
    logger.debug({params}, msg)
    throw error
  })
  octokit.hook.after('request', (result, options) => {
    const {method, url, headers, ...params} = options
    const msg = `GitHub request: ${method} ${url} - ${result.meta.status}`
    logger.debug({params}, msg)
  })
}

export { Logger }
