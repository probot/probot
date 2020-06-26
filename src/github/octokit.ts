import { enterpriseCompatibility } from '@octokit/plugin-enterprise-compatibility'
import { Octokit } from '@octokit/rest'
import { RequestOptions } from '@octokit/types'

import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

import { requestLogging } from './logging'
import { VERSION } from './version'

export const ProbotOctokit = Octokit
  .plugin(throttling, retry, enterpriseCompatibility, requestLogging)
  .defaults({
    userAgent: `probot/${VERSION}`,
    throttle: Object.assign({
      onAbuseLimit: (retryAfter: number, options: RequestOptions, octokit: Octokit) => {
        octokit.log.warn(`Abuse limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`)
        return true
      },
      onRateLimit: (retryAfter: number, options: RequestOptions, octokit: Octokit) => {
        octokit.log.warn(`Rate limit hit with "${options.method} ${options.url}", retrying in ${retryAfter} seconds.`)
        return true
      }
    })
  })
