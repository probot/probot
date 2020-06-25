import { Octokit } from '@octokit/rest'
import { enterpriseCompatibility } from '@octokit/plugin-enterprise-compatibility'
import { createAppAuth } from '@octokit/auth-app'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

import { VERSION } from './version'

export const ProbotOctokit = Octokit
  .plugin([throttling, retry, enterpriseCompatibility])
  .defaults({
    authStrategy: createAppAuth,
    userAgent: `probot/${VERSION}`
  })