import { enterpriseCompatibility } from '@octokit/plugin-enterprise-compatibility'
import { Octokit } from '@octokit/rest'

import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

import { VERSION } from './version'
import { logger } from '../logger'
import { requestLogging } from './logging'

export const ProbotOctokit = Octokit
  .plugin(throttling, retry, enterpriseCompatibility, requestLogging)
  .defaults({
    userAgent: `probot/${VERSION}`,
    throttle: Object.assign({
      onAbuseLimit: (retryAfter: number) => {
        logger.warn(`Abuse limit hit, retrying in ${retryAfter} seconds.`)
        return true
      },
      onRateLimit: (retryAfter: number) => {
        logger.warn(`Rate limit hit, retrying in ${retryAfter} seconds.`)
        return true
      }
    })
  })
