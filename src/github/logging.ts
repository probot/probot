// tslint:disable-next-line
import { Octokit } from '@octokit/core'

export function requestLogging (octokit: Octokit) {
  octokit.hook.error('request', (error, options) => {
    const { method, url, ...params } = options
    const msg = `GitHub request: ${method} ${url} - ${error.status}`
    // @ts-ignore log.debug is a bunyan log method and accepts a fields object
    octokit.log.debug({ params }, msg)
    throw error
  })

  octokit.hook.after('request', (result, options) => {
    const { method, url, headers, ...params } = options
    const msg = `GitHub request: ${method} ${url} - ${result.headers.status}`
    // @ts-ignore log.debug is a bunyan log method and accepts a fields object
    octokit.log.debug({ params }, msg)
  })
}
