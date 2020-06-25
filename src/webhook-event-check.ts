import { Endpoints } from '@octokit/types'

import { Application } from './application'

type AppsGetAuthenticatedResponse = Endpoints['GET /app']['response']['data']

let appMeta: Promise<AppsGetAuthenticatedResponse> | null = null
let didFailRetrievingAppMeta = false

/**
 * Check if an application is subscribed to an event.
 *
 * @returns Returns `false` if the app is not subscribed to an event. Otherwise,
 * returns `true`. Returns `undefined` if the webhook-event-check feature is
 * disabled or if Probot failed to retrieve the GitHub App's metadata.
 */
async function webhookEventCheck (app: Application, eventName: string) {
  if (isWebhookEventCheckEnabled() === false) {
    return
  }

  const baseEventName = eventName.split('.')[0]

  if (await isSubscribedToEvent(app, baseEventName)) {
    return true
  } else if (didFailRetrievingAppMeta === false) {
    const userFriendlyBaseEventName = baseEventName.split('_').join(' ')
    app.log.error(`Your app is attempting to listen to "${eventName}", but your GitHub App is not subscribed to the "${userFriendlyBaseEventName}" event.`)
  }
  
  return didFailRetrievingAppMeta ? undefined : false
}

/**
 * @param {string} baseEventName The base event name refers to the part before
 * the first period mark (e.g. the `issues` part in `issues.opened`).
 * @returns Returns `false` when the application is not subscribed to a webhook
 * event. Otherwise, returns `true`. Returns `undefined` if Probot failed to
 * retrieve GitHub App metadata.
 *
 * **Note**: Probot will only check against a list of events known to be in the
 * `GET /app` response. Therefore, only the `false` value should be considered
 * truthy.
 */
async function isSubscribedToEvent (app: Application, baseEventName: string) {
  // A list of events known to be in the response of `GET /app`. This list can
  // be retrieved by calling `GET /app` from an authenticated app that has
  // maximum permissions and is subscribed to all available webhook events.
  const knownBaseEvents = [
    'check_run',
    'check_suite',
    'commit_comment',
    'content_reference',
    'create',
    'delete',
    'deployment',
    'deployment_status',
    'deploy_key',
    'fork',
    'gollum',
    'issues',
    'issue_comment',
    'label',
    'member',
    'membership',
    'milestone',
    'organization',
    'org_block',
    'page_build',
    'project',
    'project_card',
    'project_column',
    'public',
    'pull_request',
    'pull_request_review',
    'pull_request_review_comment',
    'push',
    'release',
    'repository',
    'repository_dispatch',
    'star',
    'status',
    'team',
    'team_add',
    'watch'
  ]

  // Because `GET /app` does not include all events - such as default events
  // that all GitHub Apps are subscribed to (e.g.`installation`, `meta`, or
  // `marketplace_purchase`) - we can only check `baseEventName` if it is known
  // to be in the `GET /app` response.
  const eventMayExistInAppResponse = knownBaseEvents.includes(baseEventName)
  
  if (!eventMayExistInAppResponse) {
    return true
  }

  let events
  try {
    events = (await retrieveAppMeta(app)).events
  } catch (e) {
    if (!didFailRetrievingAppMeta) {
      app.log.warn(e)
    }
    didFailRetrievingAppMeta = true
    return
  }

  return events.includes(baseEventName)
}

async function retrieveAppMeta (app: Application) {
  if (appMeta) return appMeta

  appMeta = new Promise(async (resolve, reject) => {
    const api = await app.auth()
    try {
      const { data } = await api.apps.getAuthenticated()
      
      return resolve(data)
    } catch (e) {
      app.log.trace(e)
      /**
       * There are a few reasons why Probot might be unable to retrieve
       * application metadata.
       *
       * - Probot may not be connected to the Internet.
       * - The GitHub API is not responding to requests (see
       *   https://www.githubstatus.com/).
       * - The user has incorrectly configured environment variables (e.g.
       *   APP_ID, PRIVATE_KEY, etc.) used for authentication between the Probot
       *   app and the GitHub API.
       */
      return reject([
        'Probot is unable to retrieve app information from GitHub for event subscription verification.',
        '',
        'If this error persists, feel free to raise an issue at:',
        '  - https://github.com/probot/probot/issues'
      ].join('\n'))
    }
  })

  return appMeta
}

function isWebhookEventCheckEnabled () {
  if (process.env.DISABLE_WEBHOOK_EVENT_CHECK?.toLowerCase() === 'true') {
    return false
  } else if (process.env.NODE_ENV?.toLowerCase() === 'production') {
    return false
  } else if (inTestEnvironment()) {
    // We disable the feature in test environments to avoid requiring developers
    // to add a stub mocking the `GET /app` route this feature calls.
    return false
  }
  return true
}

/**
 * Detects if Probot is likely running in a test environment.
 *
 * **Note**: This method only detects Jest environments or when NODE_ENV starts
 * with `test`.
 * @returns Returns `true` if Probot is in a test environment.
 */
function inTestEnvironment (): boolean {
  const nodeEnvContainsTest = process.env.NODE_ENV?.substr(0, 4).toLowerCase() === 'test'
  const isRunningJest = process.env.JEST_WORKER_ID !== undefined
  return nodeEnvContainsTest || isRunningJest
}

export default webhookEventCheck

/**
 * A helper function used in testing that resets the cached result of /app.
 */
export function clearCache () {
  appMeta = null
  didFailRetrievingAppMeta = false
}
