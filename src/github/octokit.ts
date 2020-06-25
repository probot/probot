import { enterpriseCompatibility } from '@octokit/plugin-enterprise-compatibility'
import { Octokit } from '@octokit/rest'

import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

import { VERSION } from './version'

export const ProbotOctokit = Octokit
  .plugin(throttling, retry, enterpriseCompatibility)
  .defaults({
    userAgent: `probot/${VERSION}`
  })
